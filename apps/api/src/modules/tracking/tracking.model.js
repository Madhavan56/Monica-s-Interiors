import mongoose from 'mongoose';
import { ORDER_STATUSES } from '@mi/shared';

const eventSchema = new mongoose.Schema({
  status: { type: String, enum: ORDER_STATUSES, required: true },
  at: { type: Date, required: true },
  location: String,
  note: String,
  source: { type: String, enum: ['system', 'staff', 'courier', 'customer'], default: 'system' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  externalId: String,
});

const trackingSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  currentStatus: { type: String, enum: ORDER_STATUSES, required: true },
  carrier: { _id: false, name: String, trackingNumber: String, trackingUrl: String },
  eta: Date,
  version: { type: Number, default: 1 },
  events: [eventSchema],
}, { timestamps: true });

trackingSchema.index({ 'events.externalId': 1 }, { sparse: true });

export const OrderTracking = mongoose.model('OrderTracking', trackingSchema, 'orderTracking');
