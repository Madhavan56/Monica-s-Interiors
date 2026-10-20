import { Router } from 'express';
import { productQuerySchema, COLORS } from '@mi/shared';
import { asyncHandler, notFound } from '../../utils/errors.js';
import { validate } from '../../middleware/index.js';
import { Product, publicProduct } from './product.model.js';

export const productsRouter = Router();

const SORT = {
  featured: { 'rating.count': -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  'price-asc': { effectivePrice: 1, _id: 1 },
  'price-desc': { effectivePrice: -1, _id: 1 },
  rating: { 'rating.average': -1, 'rating.count': -1, _id: 1 },
};

function buildFilter(q) {
  const f = { isActive: true };
  if (q.ids.length) f._id = { $in: q.ids };
  if (q.category) f.category = q.category;
  if (q.room) f.room = q.room;
  if (q.material.length) f.material = { $in: q.material };
  if (q.color.length) f['colors.key'] = { $in: q.color };
  if (q.maxPrice) f.effectivePrice = { $lte: q.maxPrice };
  if (q.inStock) f.stock = { $gt: 0 };
  if (q.q) {
    const rx = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = [{ name: rx }, { material: rx }, { category: rx }, { room: rx }];
  }
  return f;
}

const cache = (res) => res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

productsRouter.get('/', validate({ query: productQuerySchema }), asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const filter = buildFilter(q);
  const [items, total] = await Promise.all([
    Product.find(filter).sort(SORT[q.sort]).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Product.countDocuments(filter),
  ]);
  cache(res).json({ data: items.map(publicProduct), meta: { page: q.page, limit: q.limit, total } });
}));

productsRouter.get('/facets', asyncHandler(async (_req, res) => {
  const [agg] = await Product.aggregate([
    { $match: { isActive: true } },
    { $facet: {
      category: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
      room: [{ $group: { _id: '$room', count: { $sum: 1 } } }],
      material: [{ $group: { _id: '$material', count: { $sum: 1 } } }],
      color: [{ $unwind: '$colors' }, { $group: { _id: '$colors.key', count: { $sum: 1 } } }],
      price: [{ $group: { _id: null, min: { $min: '$effectivePrice' }, max: { $max: '$effectivePrice' } } }],
    } },
  ]);
  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.count]));
  cache(res).json({ data: {
    category: toMap(agg.category), room: toMap(agg.room), material: toMap(agg.material),
    color: Object.fromEntries(agg.color.map((x) => [x._id, { count: x.count, ...COLORS[x._id] }])),
    price: agg.price[0] ? { min: agg.price[0].min, max: agg.price[0].max } : { min: 0, max: 0 },
  } });
}));

productsRouter.get('/:slug', asyncHandler(async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!p) throw notFound('That piece');
  cache(res).json({ data: publicProduct(p) });
}));
