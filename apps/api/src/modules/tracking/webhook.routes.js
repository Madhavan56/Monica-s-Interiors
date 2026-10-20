// Courier status webhook: HMAC-SHA256 of the raw body in X-Signature, timestamp in X-Timestamp.
import crypto from 'node:crypto';
import express, { Router } from 'express';
import { statusUpdateSchema } from '@mi/shared';
import { env } from '../../config/env.js';
import { AppError, asyncHandler } from '../../utils/errors.js';
import { Order } from '../orders/order.model.js';
import { addEvent } from './tracking.service.js';

export const webhookRouter = Router();

webhookRouter.post('/courier/:carrier', express.raw({ type: 'application/json', limit: '50kb' }), asyncHandler(async (req, res) => {
  const ts = Number(req.get('x-timestamp'));
  const sig = req.get('x-signature') || '';
  const body = req.body instanceof Buffer ? req.body : Buffer.from('');
  const expected = crypto.createHmac('sha256', env.COURIER_WEBHOOK_SECRET).update(`${ts}.${body}`).digest('hex');
  const fresh = Number.isFinite(ts) && Math.abs(Date.now() / 1000 - ts) < 300;
  const valid = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!fresh || !valid) throw new AppError('FORBIDDEN', 403, 'Invalid signature.');

  const payload = JSON.parse(body.toString('utf8'));
  const input = statusUpdateSchema.parse(payload);
  const order = await Order.findOne({ orderNumber: payload.orderNumber }).lean();
  if (!order) return res.status(202).json({ data: { ignored: true } }); // unknown order: ack so the courier stops retrying
  const r = await addEvent(order._id, input, { source: 'courier' });
  res.json({ data: { duplicate: Boolean(r.duplicate) } });
}));
