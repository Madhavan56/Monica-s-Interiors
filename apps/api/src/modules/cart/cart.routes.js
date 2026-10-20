import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AppError, asyncHandler, notFound } from '../../utils/errors.js';
import { requireAuth, validate } from '../../middleware/index.js';
import { Product, publicProduct } from '../products/product.model.js';
import { Cart } from './cart.model.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);
cartRouter.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

export const FREE_DELIVERY_OVER = 5_000_000; // ₹50,000 in paise
export const DELIVERY_FEE = 150_000; // ₹1,500

/** Cart with live prices from the catalog; also used by checkout. */
export async function cartView(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  const ids = cart?.items.map((i) => i.productId) ?? [];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = (cart?.items ?? [])
    .map((i) => ({ product: byId.get(String(i.productId)), qty: i.qty }))
    .filter((i) => i.product)
    .map(({ product, qty }) => ({ ...publicProduct(product), qty, lineTotal: product.effectivePrice * qty }));
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  return { items, count: items.reduce((n, i) => n + i.qty, 0), amounts: { subtotal, delivery, discount: 0, tax: 0, total: subtotal + delivery } };
}

cartRouter.get('/', asyncHandler(async (req, res) => res.json({ data: await cartView(req.user.id) })));

cartRouter.put('/items/:productId', validate({
  params: z.object({ productId: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid product id') }),
  body: z.object({ qty: z.number().int().min(0).max(10) }),
}), asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { qty } = req.body;
  const p = await Product.findById(productId).lean();
  if (!p) throw notFound('That piece');
  if (qty > 0 && p.stock < qty) throw new AppError('OUT_OF_STOCK', 409, p.stock ? `Only ${p.stock} left in stock.` : 'This piece is sold out.');
  await Cart.updateOne({ userId: req.user.id }, { $setOnInsert: { userId: req.user.id, items: [] } }, { upsert: true });
  await Cart.updateOne({ userId: req.user.id }, { $pull: { items: { productId } } });
  if (qty > 0) await Cart.updateOne({ userId: req.user.id }, { $push: { items: { productId, qty } } });
  res.json({ data: await cartView(req.user.id) });
}));
