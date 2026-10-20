// Append-only status events, state-machine checks, live fan-out (architecture doc §6).
import { EventEmitter } from 'node:events';
import { canTransition, MAIN_PATH, STATUS_META, buildTimeline } from '@mi/shared';
import { AppError } from '../../utils/errors.js';
import { Order } from '../orders/order.model.js';
import { OrderTracking } from './tracking.model.js';

/** In-process event bus for instant pushes within one server process. */
export const bus = new EventEmitter();
bus.setMaxListeners(1000);

export function trackingView(order, tracking) {
  return {
    orderNumber: order.orderNumber,
    currentStatus: tracking.currentStatus,
    eta: tracking.eta ?? order.eta ?? null,
    deliveryWindow: order.deliveryWindow ?? null,
    carrier: tracking.carrier?.name ? tracking.carrier : null,
    steps: buildTimeline(tracking.events, tracking.currentStatus, { expected: tracking.eta ?? order.eta }),
    version: tracking.version,
  };
}

/**
 * Add a status event. Validates the transition, dedupes courier events,
 * guards concurrent staff edits with expectedVersion, keeps order.status in sync,
 * then emits after the write succeeds.
 */
export async function addEvent(orderId, input, { source = 'system', actorId } = {}) {
  const tracking = await OrderTracking.findOne({ orderId });
  if (!tracking) throw new AppError('NOT_FOUND', 404, 'No tracking for that order.');
  if (input.externalId && tracking.events.some((e) => e.externalId === input.externalId)) {
    return { tracking, duplicate: true };
  }
  if (input.expectedVersion != null && input.expectedVersion !== tracking.version) {
    throw new AppError('VERSION_CONFLICT', 409, 'Someone else updated this order. Reload and try again.');
  }

  const at = input.at ?? new Date();
  const latestAt = tracking.events.reduce((m, e) => (e.at > m ? e.at : m), new Date(0));
  const outOfOrder = at < latestAt && MAIN_PATH.includes(input.status)
    && MAIN_PATH.indexOf(input.status) <= MAIN_PATH.indexOf(tracking.currentStatus);

  if (!outOfOrder && !canTransition(tracking.currentStatus, input.status)) {
    throw new AppError('INVALID_TRANSITION', 409, `Can’t move from “${STATUS_META[tracking.currentStatus].step}” to “${STATUS_META[input.status].step}”.`);
  }

  const event = { status: input.status, at, location: input.location, note: input.note, source, actorId, externalId: input.externalId };
  const set = outOfOrder ? {} : { currentStatus: input.status };
  if (input.eta) set.eta = input.eta;

  // Optimistic concurrency: only applies if nobody wrote in between.
  const updated = await OrderTracking.findOneAndUpdate(
    { _id: tracking._id, version: tracking.version },
    { $push: { events: event }, $set: set, $inc: { version: 1 } },
    { new: true },
  );
  if (!updated) throw new AppError('VERSION_CONFLICT', 409, 'Someone else updated this order. Reload and try again.');

  const orderSet = {};
  if (!outOfOrder) orderSet.status = input.status;
  if (input.eta) orderSet.eta = input.eta;
  if (input.status === 'delivered') orderSet['payment.status'] = 'paid';
  const order = await Order.findByIdAndUpdate(orderId, { $set: orderSet }, { new: true }).lean();

  const view = trackingView(order, updated.toObject());
  bus.emit('order.status.changed', { orderId: String(orderId), userId: String(order.userId), view, event: updated.events.at(-1) });
  return { tracking: updated, view };
}

// ---------- SSE hub ----------
// Two ways an update reaches an open stream:
//  1. Instant push from the in-process bus (the change happened in this same server process).
//  2. A database poll every few seconds, so updates also arrive across multiple instances and on
//     serverless hosts (Vercel), where the function that changed the order isn't the one streaming.
// Streams end after STREAM_MAX_SECONDS (short on serverless); the client reconnects automatically.
const subscribers = new Map(); // orderId -> Set<send>
const POLL_MS = 3000;
const MAX_SECONDS = Number(process.env.STREAM_MAX_SECONDS) || (process.env.VERCEL ? 50 : 1800);

bus.on('order.status.changed', ({ orderId, view }) => {
  for (const send of subscribers.get(orderId) ?? []) send(view);
});

/**
 * Open an SSE stream for one order.
 * @param {() => Promise<object>} [poll] returns the latest tracking view (and may apply demo catch-up)
 */
export function subscribe(orderId, req, res, initial, { poll } = {}) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  let lastSent = Number(req.get('last-event-id')) || 0;
  const send = (view) => {
    if (view.version <= lastSent) return;
    lastSent = view.version;
    res.write(`id: ${view.version}\nevent: tracking\ndata: ${JSON.stringify(view)}\n\n`);
  };
  send(initial);

  const set = subscribers.get(orderId) ?? new Set();
  set.add(send);
  subscribers.set(orderId, set);

  let polling = false;
  const poller = poll && setInterval(async () => {
    if (polling) return;
    polling = true;
    try { send(await poll()); } catch { /* transient DB error: retry next tick */ } finally { polling = false; }
  }, POLL_MS);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  const end = setTimeout(() => res.end(), MAX_SECONDS * 1000);
  req.on('close', () => {
    clearInterval(poller);
    clearInterval(heartbeat);
    clearTimeout(end);
    set.delete(send);
    if (!set.size) subscribers.delete(orderId);
  });
}

export function closeAllStreams() {
  subscribers.clear();
}
