import mongoose from 'mongoose';
import { ORDER_STATUSES } from '@mi/shared';

const counterSchema = new mongoose.Schema({ _id: String, seq: Number });
export const Counter = mongoose.model('Counter', counterSchema);

export async function nextOrderNumber() {
  const c = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return `MI-${20000 + c.seq}`;
}

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    _id: false,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String, slug: String, material: String,
    art: { _id: false, shape: String, palette: Number },
    image: String,
    unitPrice: Number, qty: Number, lineTotal: Number, // paise
  }],
  amounts: { _id: false, subtotal: Number, delivery: Number, discount: Number, tax: Number, total: Number },
  shippingAddress: { _id: false, name: String, line1: String, line2: String, city: String, state: String, pincode: String, phone: String },
  payment: {
    _id: false,
    provider: { type: String, default: 'demo' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    method: String, paidAt: Date,
  },
  status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
  eta: Date,
  deliveryWindow: String,
  assemblySlot: { _id: false, start: Date, end: Date },
  cancelReason: String,
  idempotencyKey: String,
  demo: { type: Boolean, default: false }, // demo orders advance on their own (tracking/demo.js)
  placedAt: { type: Date, default: Date.now },
}, { timestamps: true });

orderSchema.index({ userId: 1, placedAt: -1 });
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });

export const Order = mongoose.model('Order', orderSchema);
