import mongoose from 'mongoose';
import { CATEGORIES, ROOMS } from '@mi/shared';

const productSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: CATEGORIES, required: true },
  room: { type: String, enum: ROOMS, required: true },
  material: String,
  price: { type: Number, required: true, min: 0 }, // paise
  salePrice: { type: Number, min: 0, default: null }, // paise
  effectivePrice: { type: Number, required: true }, // salePrice ?? price
  colors: [{ _id: false, key: String, name: String, hex: String }],
  images: [{ _id: false, url: String, alt: String, width: Number, height: Number }],
  art: { _id: false, shape: String, palette: Number }, // placeholder illustration until real photos exist
  badges: [String],
  stock: { type: Number, default: 0, min: 0 },
  rating: { _id: false, average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.pre('validate', function setEffective(next) {
  this.effectivePrice = this.salePrice ?? this.price;
  next();
});

productSchema.index({ category: 1, effectivePrice: 1 });
productSchema.index({ room: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ name: 'text', description: 'text', material: 'text' });

export const Product = mongoose.model('Product', productSchema);

export const publicProduct = (p) => ({
  id: String(p._id), slug: p.slug, name: p.name, description: p.description, category: p.category, room: p.room,
  material: p.material, price: p.price, salePrice: p.salePrice ?? null, effectivePrice: p.effectivePrice,
  colors: p.colors, images: p.images, art: p.art, badges: p.badges, stock: p.stock, rating: p.rating,
  isNew: Boolean(p.badges?.includes('New')),
  createdAt: p.createdAt,
});
