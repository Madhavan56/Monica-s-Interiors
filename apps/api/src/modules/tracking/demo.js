// Dev/demo only: new orders appear to move one status every DEMO_AUTO_ADVANCE_SECONDS.
// Instead of timers (which don't survive on serverless hosts like Vercel), an order "catches up"
// to where it should be whenever it's read: the tracking page, its live stream, or the orders list.
// Stands in for a real courier webhook. Off when DEMO_AUTO_ADVANCE_SECONDS is 0.
import { env } from '../../config/env.js';
import { Order } from '../orders/order.model.js';
import { OrderTracking } from './tracking.model.js';
import { addEvent } from './tracking.service.js';

const STEPS = [
  { status: 'confirmed', note: 'Workshop confirmed stock' },
  { status: 'packed', note: 'Packed and quality-checked' },
  { status: 'shipped', location: 'Bengaluru warehouse', note: 'Left Bengaluru warehouse' },
  { status: 'out_for_delivery', note: 'With delivery partner, 4 stops away' },
  { status: 'delivered', note: 'Delivered and signed for' },
];

export const demoEnabled = () => env.DEMO_AUTO_ADVANCE_SECONDS > 0;

/** Apply any demo steps that are due for this order. Safe to call often and concurrently. */
export async function catchUpDemo(order) {
  if (!demoEnabled() || !order?.demo) return;
  const due = Math.min(STEPS.length, Math.floor((Date.now() - new Date(order.placedAt)) / (env.DEMO_AUTO_ADVANCE_SECONDS * 1000)));
  if (due < 1) return;
  const tracking = await OrderTracking.findOne({ orderId: order._id }, { events: 1 }).lean();
  if (!tracking) return;
  const done = new Set(tracking.events.map((e) => e.status));
  for (let i = 0; i < due; i += 1) {
    if (done.has(STEPS[i].status)) continue;
    try {
      const at = new Date(new Date(order.placedAt).getTime() + (i + 1) * env.DEMO_AUTO_ADVANCE_SECONDS * 1000);
      await addEvent(order._id, { ...STEPS[i], at }, { source: 'courier' });
    } catch (e) {
      // Cancelled, moved by staff, or another request applied this step first: stop quietly.
      if (!['INVALID_TRANSITION', 'NOT_FOUND', 'VERSION_CONFLICT'].includes(e.code)) console.error('demo catch-up failed', e.message);
      return;
    }
  }
}

/** Catch up every in-progress demo order for a user (used by the orders list). */
export async function catchUpUserDemos(userId) {
  if (!demoEnabled()) return;
  const open = await Order.find({ userId, demo: true, status: { $nin: ['delivered', 'cancelled', 'returned', 'refunded'] } }).lean();
  for (const o of open) await catchUpDemo(o);
}
