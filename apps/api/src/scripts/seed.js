// Seeds the catalog, two demo accounts, a wishlist and sample orders with tracking history.
// Runs automatically on an empty database; `npm run seed` resets and reseeds.
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { hash } from '@node-rs/argon2';
import { COLORS } from '@mi/shared';
import { Product } from '../modules/products/product.model.js';
import { User } from '../modules/users/user.model.js';
import { Wishlist } from '../modules/wishlist/wishlist.model.js';
import { Cart } from '../modules/cart/cart.model.js';
import { Order, Counter } from '../modules/orders/order.model.js';
import { OrderTracking } from '../modules/tracking/tracking.model.js';
import { RefreshToken } from '../modules/auth/refreshToken.model.js';

export const DEMO_USERS = [
  { name: 'Monica Rao', email: 'monica@example.com', password: 'interiors123', role: 'customer' },
  { name: 'Studio Staff', email: 'staff@example.com', password: 'staff12345', role: 'staff' },
];

// [slug-ish key, name, category, room, material, price ₹, sale ₹, rating, reviews, colors, badges, shape, palette, stock, daysAgo]
const P = [
  ['arden', 'Arden three-seat sofa in charcoal', 'Sofas', 'Living room', 'Linen', 89999, null, 4.8, 214, ['oat', 'sage', 'charcoal'], ['Bestseller'], 'sofa', 0, 12, 17],
  ['mira', 'Mira oak lounge chair', 'Chairs', 'Living room', 'Oak', 34999, 27999, 4.7, 98, ['ivory', 'oat'], ['New'], 'chair', 5, 6, 2],
  ['halden', 'Halden solid oak dining table', 'Tables', 'Dining', 'Oak', 64999, null, 4.9, 156, ['oat', 'walnut'], [], 'table', 4, 4, 19],
  ['sol', 'Sol adjustable reading lamp', 'Lighting', 'Living room', 'Brass', 18999, null, 4.6, 72, ['brass', 'charcoal'], ['New'], 'lamp', 3, 20, 0],
  ['lune', 'Lune upholstered king bed', 'Beds', 'Bedroom', 'Velvet', 112999, 94999, 4.8, 61, ['terracotta', 'oat', 'sage'], [], 'bed', 2, 3, 14],
  ['terra', 'Terra white ceramic vase', 'Décor', 'Living room', 'Ceramic', 4999, null, 4.5, 340, ['terracotta', 'ivory', 'sage', 'charcoal', 'oat'], ['Bestseller'], 'vase', 2, 40, 18],
  ['atlas', 'Atlas open bookshelf', 'Storage', 'Workspace', 'Walnut', 42999, null, 4.7, 88, ['walnut', 'oat'], ['New'], 'shelf', 4, 9, 5],
  ['orla', 'Orla shell chair with oak legs', 'Chairs', 'Workspace', 'Oak', 21999, null, 4.6, 45, ['charcoal', 'ivory'], [], 'chair', 3, 0, 16],
  ['noor', 'Noor enamel pendant lamp', 'Lighting', 'Dining', 'Brass', 12499, 9999, 4.4, 120, ['oat'], [], 'pendant', 0, 15, 13],
  ['fern', 'Fern indoor plant trio in clay pots', 'Décor', 'Workspace', 'Ceramic', 6999, null, 4.3, 210, ['terracotta'], [], 'plant', 2, 30, 12],
];

// Demo photos (CC0, see apps/web/public/images/CREDITS.md): [alt text, width, height]
const PHOTOS = {
  arden: ['Grey three-seat sofa with cushions in a brick-walled living room', 960, 640],
  mira: ['Light wood lounge chair with a patterned cushion by a sunny window', 960, 640],
  halden: ['Solid wood dining table with metal chairs in a bright room', 960, 640],
  sol: ['White adjustable lamp above a wooden side table', 960, 1440],
  lune: ['Upholstered bed with a dark wooden headboard and grey bedding', 960, 768],
  terra: ['White ceramic vase of tulips on a wooden bedside table', 960, 709],
  atlas: ['Open bookshelf filled with colourful books', 960, 640],
  orla: ['Black shell chair with wooden legs against a white wall', 960, 662],
  noor: ['Pendant lamp with an exposed bulb hanging in a warm interior', 960, 640],
  fern: ['Potted green plants in terracotta pots by a window', 960, 1440],
};
const photo = (key) => (PHOTOS[key] ? [{ url: `/images/products/${key}.jpg`, alt: PHOTOS[key][0], width: PHOTOS[key][1], height: PHOTOS[key][2] }] : []);

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const ist = (s) => new Date(`${s}:00+05:30`);

const ADDRESS = { name: 'Monica Rao', line1: '14 Lavelle Road', line2: 'Ashok Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '+919845012026' };

// [number, placed, status, items [[key, qty]], delivery ₹, eta, events [[status, IST time, note, location]], extra]
const ORDERS = [
  // In transit: watch it move on the tracking page (staff can advance it from Manage orders)
  ['MI-20481', '2026-10-15T19:12', 'shipped', [['arden', 1], ['sol', 1], ['terra', 2], ['fern', 1]], 0, '2026-10-22', [
    ['placed', '2026-10-15T19:12', 'Payment received'], ['confirmed', '2026-10-16T09:40', 'Workshop confirmed stock'],
    ['packed', '2026-10-18T16:25', 'Packed and quality-checked'], ['shipped', '2026-10-19T11:05', 'Left Bengaluru warehouse', 'Bengaluru'],
  ], { assembly: true }],
  // Delivered: full six-step history
  ['MI-20312', '2026-09-24T12:00', 'delivered', [['mira', 1], ['noor', 2]], 0, '2026-10-03', [
    ['placed', '2026-09-24T12:00', 'Payment received'], ['confirmed', '2026-09-24T16:20', 'Workshop confirmed stock'], ['packed', '2026-09-27T11:00', 'Packed and quality-checked'],
    ['shipped', '2026-09-29T09:45', 'Left Bengaluru warehouse', 'Bengaluru'], ['out_for_delivery', '2026-10-03T08:10', 'With delivery partner'], ['delivered', '2026-10-03T13:42', 'Signed by Monica'],
  ]],
  // Cancelled before shipping: shows the exception path and refund note
  ['MI-20077', '2026-08-12T18:20', 'cancelled', [['atlas', 1]], 1500, null, [
    ['placed', '2026-08-12T18:20', 'Payment received'], ['confirmed', '2026-08-13T09:00'], ['cancelled', '2026-08-13T11:30', 'Cancelled by customer'],
  ], { cancelReason: 'Cancelled by you on 13 Aug. Refund of ₹44,499 completed on 16 Aug.' }],
];

async function seed() {
  const products = await Product.insertMany(P.map(([key, name, category, room, material, price, sale, avg, count, colors, badges, shape, palette, stock]) => ({
    slug: slugify(name), name, category, room, material,
    description: `Made in ${material.toLowerCase()} by one of our partner workshops. Each piece is finished by hand, so grain and tone vary slightly.`,
    price: price * 100, salePrice: sale ? sale * 100 : null, effectivePrice: (sale ?? price) * 100,
    colors: colors.map((c) => ({ key: c, ...COLORS[c] })), images: photo(key), art: { shape, palette }, badges, stock,
    rating: { average: avg, count }, _key: key,
  })));
  // Spread creation dates so "Newest" sorting is meaningful.
  await Promise.all(P.map(([, , , , , , , , , , , , , , daysAgo], i) =>
    Product.updateOne({ _id: products[i]._id }, { $set: { createdAt: new Date(Date.now() - daysAgo * 864e5) } }, { timestamps: false })));
  const byKey = Object.fromEntries(P.map(([key], i) => [key, products[i]]));

  const users = {};
  for (const u of DEMO_USERS) {
    users[u.role] = await User.create({
      name: u.name, email: u.email, role: u.role, emailVerified: true,
      passwordHash: await hash(u.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      addresses: u.role === 'customer' ? [{ label: 'Home', ...ADDRESS, isDefault: true }] : [],
    });
  }
  const monica = users.customer;

  await Wishlist.create({
    userId: monica._id,
    items: [['mira', 34999], ['lune', 112999], ['orla', 21999], ['sol', 18999]].map(([k, priceAtAdd], i) => ({
      productId: byKey[k]._id, priceAtAdd: priceAtAdd * 100, addedAt: new Date(Date.now() - i * 3600e3),
    })),
  });

  let maxSeq = 0;
  for (const [orderNumber, placed, status, lines, deliveryRs, eta, events, extra = {}] of ORDERS) {
    const items = lines.map(([k, qty]) => {
      const p = byKey[k];
      return { productId: p._id, name: p.name, slug: p.slug, material: p.material, art: p.art, image: p.images[0]?.url, unitPrice: p.effectivePrice, qty, lineTotal: p.effectivePrice * qty };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const delivery = deliveryRs * 100;
    const etaDate = eta ? ist(`${eta}T10:00`) : undefined;
    const order = await Order.create({
      orderNumber, userId: monica._id, items, amounts: { subtotal, delivery, discount: 0, tax: 0, total: subtotal + delivery },
      shippingAddress: ADDRESS,
      payment: { provider: 'demo', method: 'UPI', status: ['cancelled', 'returned'].includes(status) ? 'refunded' : 'paid', paidAt: ist(placed) },
      status, eta: etaDate, deliveryWindow: status === 'delayed' ? '12 PM – 4 PM' : '10 AM – 2 PM',
      ...(extra.assembly && { assemblySlot: { start: ist(`${eta}T14:00`), end: ist(`${eta}T16:00`) } }),
      cancelReason: extra.cancelReason, placedAt: ist(placed),
    });
    await OrderTracking.create({
      orderId: order._id, currentStatus: status, eta: etaDate, version: events.length,
      carrier: { name: 'BlueDart White Glove', trackingNumber: `BD 4471 ${orderNumber.slice(3)} ${String(events.length).padStart(2, '0')}` },
      events: events.map(([s, at, note, location]) => ({ status: s, at: ist(at), note, location, source: 'system' })),
    });
    maxSeq = Math.max(maxSeq, Number(orderNumber.slice(3)) - 20000);
  }
  await Counter.updateOne({ _id: 'order' }, { $set: { seq: maxSeq } }, { upsert: true });
  console.log(`Seeded ${products.length} products, ${DEMO_USERS.length} users, ${ORDERS.length} orders.`);
}

export async function seedIfEmpty() {
  if (await Product.estimatedDocumentCount()) return;
  await seed();
}

async function reset() {
  await Promise.all([Product, User, Wishlist, Cart, Order, Counter, OrderTracking, RefreshToken].map((M) => M.deleteMany({})));
  await seed();
}

// `node src/scripts/seed.js --reset`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDb, disconnectDb } = await import('../config/db.js');
  await connectDb();
  await (process.argv.includes('--reset') ? reset() : seedIfEmpty());
  await disconnectDb();
  await mongoose.disconnect().catch(() => {});
}
