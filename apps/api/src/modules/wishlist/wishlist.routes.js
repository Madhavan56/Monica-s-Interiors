import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AppError, asyncHandler, notFound } from '../../utils/errors.js';
import { requireAuth, validate } from '../../middleware/index.js';
import { Product, publicProduct } from '../products/product.model.js';
import { Wishlist, WISHLIST_CAP } from './wishlist.model.js';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);
wishlistRouter.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

const getOrCreate = (userId) => Wishlist.findOneAndUpdate({ userId }, { $setOnInsert: { userId, items: [] } }, { upsert: true, new: true });

async function summary(userId) {
  const w = await Wishlist.findOne({ userId }).lean();
  return { count: w?.items.length ?? 0 };
}

wishlistRouter.get('/', asyncHandler(async (req, res) => {
  const w = await getOrCreate(req.user.id);
  const ids = w.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = [...w.items]
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((i) => {
      const p = byId.get(String(i.productId));
      if (!p) return null;
      const drop = i.priceAtAdd && i.priceAtAdd > p.effectivePrice ? i.priceAtAdd - p.effectivePrice : 0;
      return { ...publicProduct(p), addedAt: i.addedAt, priceDrop: drop };
    })
    .filter(Boolean);
  res.json({ data: { items, ids: items.map((i) => i.id), count: items.length } });
}));

const idParam = z.object({ productId: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid product id') });

wishlistRouter.put('/:productId', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.productId).lean();
  if (!p) throw notFound('That piece');
  await getOrCreate(req.user.id);
  const r = await Wishlist.updateOne(
    { userId: req.user.id, 'items.productId': { $ne: p._id }, [`items.${WISHLIST_CAP - 1}`]: { $exists: false } },
    { $push: { items: { productId: p._id, addedAt: new Date(), priceAtAdd: p.effectivePrice } } },
  );
  if (!r.modifiedCount) {
    const already = await Wishlist.exists({ userId: req.user.id, 'items.productId': p._id });
    if (!already) throw new AppError('WISHLIST_FULL', 409, `Your wishlist holds up to ${WISHLIST_CAP} pieces.`);
  }
  res.json({ data: { productId: String(p._id), saved: true, ...(await summary(req.user.id)) } });
}));

wishlistRouter.delete('/:productId', validate({ params: idParam }), asyncHandler(async (req, res) => {
  await Wishlist.updateOne({ userId: req.user.id }, { $pull: { items: { productId: req.params.productId } } });
  res.json({ data: { productId: req.params.productId, saved: false, ...(await summary(req.user.id)) } });
}));

wishlistRouter.post('/merge', validate({ body: z.object({ productIds: z.array(z.string()).max(WISHLIST_CAP) }) }), asyncHandler(async (req, res) => {
  const ids = req.body.productIds.filter((id) => mongoose.isValidObjectId(id));
  const products = await Product.find({ _id: { $in: ids } }, { effectivePrice: 1 }).lean();
  const w = await getOrCreate(req.user.id);
  const have = new Set(w.items.map((i) => String(i.productId)));
  for (const p of products) {
    if (!have.has(String(p._id)) && w.items.length < WISHLIST_CAP) w.items.push({ productId: p._id, priceAtAdd: p.effectivePrice });
  }
  await w.save();
  res.json({ data: { count: w.items.length } });
}));
