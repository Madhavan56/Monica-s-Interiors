import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { checkoutSchema, statusUpdateSchema, STATUS_META, CUSTOMER_CANCELLABLE, formatINR } from '@mi/shared';
import { env } from '../../config/env.js';
import { AppError, asyncHandler, notFound } from '../../utils/errors.js';
import { requireAuth, requireRole, validate } from '../../middleware/index.js';
import { Product } from '../products/product.model.js';
import { Cart } from '../cart/cart.model.js';
import { cartView } from '../cart/cart.routes.js';
import { Order, nextOrderNumber } from './order.model.js';
import { OrderTracking } from '../tracking/tracking.model.js';
import { addEvent, subscribe, trackingView } from '../tracking/tracking.service.js';
import { catchUpDemo, catchUpUserDemos, demoEnabled } from '../tracking/demo.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);
ordersRouter.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

const GROUPS = {
  progress: Object.keys(STATUS_META).filter((s) => STATUS_META[s].group === 'progress'),
  delivered: ['delivered'],
  closed: Object.keys(STATUS_META).filter((s) => STATUS_META[s].group === 'closed'),
};

const listQuery = z.object({
  status: z.enum(['all', 'progress', 'delivered', 'closed']).default('all'),
  range: z.enum(['all', '30d', '180d', '2026']).default('all'),
  q: z.string().trim().max(60).optional(),
});

const orderSummary = (o) => ({
  orderNumber: o.orderNumber, status: o.status, placedAt: o.placedAt, eta: o.eta ?? null,
  deliveredAt: o.deliveredAt ?? null, amounts: o.amounts, cancelReason: o.cancelReason ?? null,
  itemCount: o.items.reduce((n, i) => n + i.qty, 0),
  items: o.items.map((i) => ({ productId: String(i.productId), name: i.name, slug: i.slug, art: i.art, image: i.image, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal, material: i.material })),
});

/** Find an order that belongs to the signed-in user (404 otherwise, never 403). Applies demo catch-up first. */
async function myOrder(req) {
  const find = () => Order.findOne({ orderNumber: req.params.orderNumber, userId: req.user.id }).lean();
  const o = await find();
  if (!o) throw notFound('That order');
  if (!o.demo) return o;
  await catchUpDemo(o);
  return find();
}

/** Latest tracking view for an order, re-read from the database (used by the live stream's poll). */
async function freshView(orderId) {
  const order = await Order.findById(orderId).lean();
  await catchUpDemo(order);
  const [o, t] = await Promise.all([Order.findById(orderId).lean(), OrderTracking.findOne({ orderId }).lean()]);
  return trackingView(o, t);
}

async function withDelivered(orders) {
  const ids = orders.map((o) => o._id);
  const tracks = await OrderTracking.find({ orderId: { $in: ids } }, { orderId: 1, events: 1 }).lean();
  const deliveredAt = new Map(tracks.map((t) => [String(t.orderId), t.events.find((e) => e.status === 'delivered')?.at]));
  return orders.map((o) => ({ ...o, deliveredAt: deliveredAt.get(String(o._id)) }));
}

ordersRouter.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const { status, range, q } = req.validQuery;
  await catchUpUserDemos(req.user.id);
  const base = { userId: req.user.id };
  if (range === '30d') base.placedAt = { $gte: new Date(Date.now() - 30 * 864e5) };
  if (range === '180d') base.placedAt = { $gte: new Date(Date.now() - 180 * 864e5) };
  if (range === '2026') base.placedAt = { $gte: new Date('2026-01-01'), $lt: new Date('2027-01-01') };
  if (q) {
    const rx = new RegExp(q.replace('#', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    base.$or = [{ orderNumber: rx }, { 'items.name': rx }];
  }
  const filter = status === 'all' ? base : { ...base, status: { $in: GROUPS[status] } };
  const [orders, all] = await Promise.all([
    Order.find(filter).sort({ placedAt: -1 }).limit(50).lean(),
    Order.find(base, { status: 1 }).lean(),
  ]);
  const counts = { all: all.length, progress: 0, delivered: 0, closed: 0 };
  for (const o of all) counts[STATUS_META[o.status].group === 'delivered' ? 'delivered' : STATUS_META[o.status].group] += 1;
  res.json({ data: (await withDelivered(orders)).map(orderSummary), meta: { counts } });
}));

ordersRouter.post('/checkout', validate({ body: checkoutSchema }), asyncHandler(async (req, res) => {
  const key = req.get('idempotency-key');
  if (key) {
    const existing = await Order.findOne({ userId: req.user.id, idempotencyKey: key }).lean();
    if (existing) return res.json({ data: orderSummary(existing) });
  }
  const cart = await cartView(req.user.id);
  if (!cart.items.length) throw new AppError('CART_EMPTY', 409, 'Your cart is empty.');

  // Reserve stock atomically per item; roll back what was reserved if any item fails.
  // (On a MongoDB replica set this runs inside a transaction instead.)
  const reserved = [];
  for (const item of cart.items) {
    const r = await Product.updateOne({ _id: item.id, stock: { $gte: item.qty } }, { $inc: { stock: -item.qty } });
    if (!r.modifiedCount) {
      await Promise.all(reserved.map((i) => Product.updateOne({ _id: i.id }, { $inc: { stock: i.qty } })));
      throw new AppError('OUT_OF_STOCK', 409, `${item.name} doesn’t have enough stock left.`, { productIds: [item.id] });
    }
    reserved.push(item);
  }

  const now = new Date();
  const eta = new Date(now.getTime() + 7 * 864e5);
  const order = await Order.create({
    orderNumber: await nextOrderNumber(),
    userId: req.user.id,
    items: cart.items.map((i) => ({ productId: i.id, name: i.name, slug: i.slug, material: i.material, art: i.art, image: i.images?.[0]?.url, unitPrice: i.effectivePrice, qty: i.qty, lineTotal: i.lineTotal })),
    amounts: cart.amounts,
    shippingAddress: req.body.address,
    payment: { provider: 'demo', status: 'paid', method: 'Demo payment', paidAt: now },
    status: 'placed', eta, deliveryWindow: '10 AM – 2 PM',
    ...(req.body.assembly && { assemblySlot: { start: new Date(eta.getTime() + 4 * 3600e3), end: new Date(eta.getTime() + 6 * 3600e3) } }),
    idempotencyKey: key || undefined,
    demo: demoEnabled(), // demo mode: status advances on its own (see tracking/demo.js)
    placedAt: now,
  });
  await OrderTracking.create({
    orderId: order._id, currentStatus: 'placed', eta,
    carrier: { name: 'BlueDart White Glove', trackingNumber: `BD ${crypto.randomInt(1000, 9999)} ${crypto.randomInt(1000, 9999)} ${crypto.randomInt(10, 99)}` },
    events: [{ status: 'placed', at: now, note: 'Payment received', source: 'system' }],
  });
  await Cart.updateOne({ userId: req.user.id }, { $set: { items: [] } });
  res.status(201).json({ data: orderSummary(order.toObject()) });
}));

ordersRouter.get('/:orderNumber', asyncHandler(async (req, res) => {
  const o = await myOrder(req);
  const [withD] = await withDelivered([o]);
  res.json({ data: { ...orderSummary(withD), shippingAddress: o.shippingAddress, payment: { method: o.payment.method, status: o.payment.status, paidAt: o.payment.paidAt }, deliveryWindow: o.deliveryWindow, assemblySlot: o.assemblySlot ?? null } });
}));

ordersRouter.get('/:orderNumber/tracking', asyncHandler(async (req, res) => {
  const o = await myOrder(req);
  const t = await OrderTracking.findOne({ orderId: o._id }).lean();
  res.json({ data: trackingView(o, t) });
}));

ordersRouter.get('/:orderNumber/tracking/stream', asyncHandler(async (req, res) => {
  const o = await myOrder(req);
  const t = await OrderTracking.findOne({ orderId: o._id }).lean();
  subscribe(String(o._id), req, res, trackingView(o, t), { poll: () => freshView(o._id) });
}));

ordersRouter.post('/:orderNumber/cancel', asyncHandler(async (req, res) => {
  const o = await myOrder(req);
  if (o.status === 'cancelled') throw new AppError('ALREADY_CANCELLED', 409, 'This order is already cancelled.');
  if (!CUSTOMER_CANCELLABLE.includes(o.status)) throw new AppError('INVALID_TRANSITION', 409, 'This order has shipped, so it can’t be cancelled. You can return it after delivery.');
  const reason = `Cancelled by you on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Refund of ${formatINR(o.amounts.total)} started.`;
  const { view } = await addEvent(o._id, { status: 'cancelled', note: 'Cancelled by customer' }, { source: 'customer', actorId: req.user.id });
  await Order.updateOne({ _id: o._id }, { $set: { cancelReason: reason, 'payment.status': 'refunded' } });
  await Promise.all(o.items.map((i) => Product.updateOne({ _id: i.productId }, { $inc: { stock: i.qty } })));
  res.json({ data: { ...view, cancelReason: reason } });
}));

// ---------- Staff ----------
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('staff', 'admin'));

adminRouter.get('/orders', asyncHandler(async (_req, res) => {
  const orders = await Order.find().sort({ placedAt: -1 }).limit(100).populate('userId', 'name email').lean();
  const tracks = await OrderTracking.find({ orderId: { $in: orders.map((o) => o._id) } }, { orderId: 1, version: 1 }).lean();
  const ver = new Map(tracks.map((t) => [String(t.orderId), t.version]));
  res.json({ data: orders.map((o) => ({ ...orderSummary(o), customer: o.userId ? { name: o.userId.name, email: o.userId.email } : null, version: ver.get(String(o._id)) })) });
}));

adminRouter.post('/orders/:orderNumber/status', validate({ body: statusUpdateSchema }), asyncHandler(async (req, res) => {
  const o = await Order.findOne({ orderNumber: req.params.orderNumber }).lean();
  if (!o) throw notFound('That order');
  const { view } = await addEvent(o._id, req.body, { source: 'staff', actorId: req.user.id });
  res.json({ data: view });
}));
