// End-to-end API smoke test against a running dev server.
// Run: `npm run dev` in one terminal, then `npm run test:api` in another.
// Uses only Node's built-in test runner and fetch. Resets nothing; it creates and cancels one order.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const ORIGIN = 'http://localhost:5173';
let token;
let cookie;

async function call(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'X-Requested-With': 'fetch', Origin: ORIGIN,
      ...(body && { 'Content-Type': 'application/json' }),
      ...(auth && token && { Authorization: `Bearer ${token}` }),
      ...(cookie && { Cookie: cookie }),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const json = res.status === 204 ? null : await res.json();
  return { status: res.status, json };
}

test('health reports a connected database', async () => {
  const r = await call('/health', { auth: false });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.db, true);
});

test('products: list, filter, search, detail', async () => {
  const all = await call('/products?limit=48', { auth: false });
  assert.equal(all.status, 200);
  assert.ok(all.json.meta.total >= 10, 'seed has at least 10 products');

  const chairs = await call('/products?category=Chairs&sort=price-asc', { auth: false });
  assert.ok(chairs.json.data.every((p) => p.category === 'Chairs'));

  const search = await call('/products?q=oak', { auth: false });
  assert.ok(search.json.data.length > 0);

  const detail = await call(`/products/${all.json.data[0].slug}`, { auth: false });
  assert.equal(detail.json.data.id, all.json.data[0].id);

  const bad = await call('/products?category=Spaceships', { auth: false });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error.code, 'VALIDATION_FAILED');
});

test('auth: bad password is rejected, good one returns a token and refresh cookie', async () => {
  const bad = await call('/auth/login', { method: 'POST', body: { email: 'monica@example.com', password: 'wrong-password' }, auth: false });
  assert.equal(bad.status, 401);
  assert.equal(bad.json.error.code, 'INVALID_CREDENTIALS');

  const ok = await call('/auth/login', { method: 'POST', body: { email: 'monica@example.com', password: 'interiors123' }, auth: false });
  assert.equal(ok.status, 200);
  token = ok.json.data.accessToken;
  assert.ok(token && cookie?.startsWith('mi_rt='));
});

test('auth: refresh rotates the session; protected routes need a token', async () => {
  const r = await call('/auth/refresh', { method: 'POST', auth: false });
  assert.equal(r.status, 200);
  token = r.json.data.accessToken;

  const anon = await fetch(`${BASE}/orders`);
  assert.equal(anon.status, 401);
});

test('wishlist: idempotent save and remove', async () => {
  const { json } = await call('/products?limit=1', { auth: false });
  const id = json.data[0].id;
  const a = await call(`/wishlist/${id}`, { method: 'PUT' });
  const b = await call(`/wishlist/${id}`, { method: 'PUT' });
  assert.equal(a.json.data.count, b.json.data.count, 'saving twice adds once');
  const c = await call(`/wishlist/${id}`, { method: 'DELETE' });
  assert.equal(c.json.data.saved, false);
});

test('orders: list, tracking timeline, and ownership', async () => {
  const list = await call('/orders');
  assert.equal(list.status, 200);
  assert.ok(list.json.data.length >= 3);

  const t = await call(`/orders/${list.json.data[0].orderNumber}/tracking`);
  assert.equal(t.status, 200);
  assert.equal(t.json.data.steps.filter((s) => s.kind === 'main').length, 6);

  const missing = await call('/orders/MI-00000');
  assert.equal(missing.status, 404);
});

test('checkout → cancel: idempotent order creation, stock restored on cancel', async () => {
  const { json } = await call('/products?inStock=true&limit=1', { auth: false });
  const product = json.data[0];
  await call(`/cart/items/${product.id}`, { method: 'PUT', body: { qty: 1 } });

  const address = { name: 'Test Buyer', line1: '1 Test Street', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '+919800000000' };
  const key = `smoke-${Date.now()}`;
  const first = await call('/orders/checkout', { method: 'POST', body: { address }, headers: { 'Idempotency-Key': key } });
  assert.equal(first.status, 201);
  const retry = await call('/orders/checkout', { method: 'POST', body: { address }, headers: { 'Idempotency-Key': key } });
  assert.equal(retry.json.data.orderNumber, first.json.data.orderNumber, 'same key → same order');

  const after = await call(`/products/${product.slug}`, { auth: false });
  assert.equal(after.json.data.stock, product.stock - 1, 'stock reserved');

  const cancel = await call(`/orders/${first.json.data.orderNumber}/cancel`, { method: 'POST' });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.json.data.currentStatus, 'cancelled');

  const restored = await call(`/products/${product.slug}`, { auth: false });
  assert.equal(restored.json.data.stock, product.stock, 'stock restored');

  const again = await call(`/orders/${first.json.data.orderNumber}/cancel`, { method: 'POST' });
  assert.equal(again.status, 409);
});

test('staff: customers are blocked, invalid transitions are refused', async () => {
  const blocked = await call('/admin/orders');
  assert.equal(blocked.status, 403);

  const staff = await call('/auth/login', { method: 'POST', body: { email: 'staff@example.com', password: 'staff12345' }, auth: false });
  token = staff.json.data.accessToken;
  const invalid = await call('/admin/orders/MI-20312/status', { method: 'POST', body: { status: 'packed' } });
  assert.equal(invalid.status, 409);
  assert.equal(invalid.json.error.code, 'INVALID_TRANSITION');
});
