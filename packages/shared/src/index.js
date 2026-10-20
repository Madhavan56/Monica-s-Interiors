// Shared by the API and the web app: order statuses, transitions, timeline
// building, validation schemas and money helpers (architecture doc §2, §6).
import { z } from 'zod';

// ---------- Order status state machine ----------
export const MAIN_PATH = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

export const STATUS_META = {
  placed: { label: 'Placed', step: 'Order placed', tone: 'neutral', group: 'progress' },
  confirmed: { label: 'Processing', step: 'Confirmed', tone: 'warning', group: 'progress' },
  packed: { label: 'Processing', step: 'Packed', tone: 'warning', group: 'progress' },
  shipped: { label: 'Shipped', step: 'Shipped', tone: 'info', group: 'progress' },
  out_for_delivery: { label: 'Out for delivery', step: 'Out for delivery', tone: 'info', group: 'progress' },
  delivered: { label: 'Delivered', step: 'Delivered', tone: 'success', group: 'delivered' },
  delayed: { label: 'Delayed', step: 'Delayed', tone: 'warning', group: 'progress', exception: true },
  delivery_failed: { label: 'Delivery failed', step: 'Delivery attempt failed', tone: 'error', group: 'progress', exception: true },
  cancelled: { label: 'Cancelled', step: 'Cancelled', tone: 'error', group: 'closed', exception: true },
  return_requested: { label: 'Return requested', step: 'Return requested', tone: 'neutral', group: 'closed', exception: true },
  returned: { label: 'Returned', step: 'Returned', tone: 'neutral', group: 'closed', exception: true },
  refunded: { label: 'Refunded', step: 'Refunded', tone: 'neutral', group: 'closed', exception: true },
};

export const ORDER_STATUSES = Object.keys(STATUS_META);

export const TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delayed'],
  out_for_delivery: ['delivered', 'delayed', 'delivery_failed'],
  delayed: ['shipped', 'out_for_delivery'],
  delivery_failed: ['out_for_delivery'],
  delivered: ['return_requested'],
  return_requested: ['returned'],
  returned: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};

export const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);
export const CUSTOMER_CANCELLABLE = ['placed', 'confirmed', 'packed'];

/**
 * Turn stored tracking events into render-ready steps (architecture doc §6).
 * events: [{ status, at, location?, note? }] in any order.
 */
export function buildTimeline(events, currentStatus, { expected } = {}) {
  const sorted = [...events].sort((a, b) => new Date(a.at) - new Date(b.at));
  const lastFor = (status) => [...sorted].reverse().find((e) => e.status === status);
  const mainReached = sorted.filter((e) => MAIN_PATH.includes(e.status)).map((e) => MAIN_PATH.indexOf(e.status));
  const furthest = mainReached.length ? Math.max(...mainReached) : -1;
  const delivered = furthest === MAIN_PATH.length - 1;
  const cancelled = sorted.some((e) => e.status === 'cancelled');
  const exceptionOpen = STATUS_META[currentStatus]?.exception && !cancelled;

  const steps = [];
  MAIN_PATH.forEach((status, i) => {
    if (cancelled && i > furthest) return;
    const ev = lastFor(status);
    let state = 'upcoming';
    if (i < furthest || (i === furthest && (delivered || cancelled || exceptionOpen))) state = 'done';
    else if (i === furthest) state = 'current';
    steps.push({
      status, label: STATUS_META[status].step, state, kind: 'main',
      at: ev?.at ?? null, location: ev?.location ?? null, note: ev?.note ?? null,
      expected: status === 'delivered' && state === 'upcoming' ? expected ?? null : null,
    });
    // exceptions that happened at this stage go right after it
    sorted
      .filter((e) => STATUS_META[e.status]?.exception && stageOf(sorted, e) === i)
      .forEach((e) => steps.push({
        status: e.status, label: STATUS_META[e.status].step, kind: 'exception',
        state: e.status === currentStatus && !['cancelled', 'returned', 'refunded'].includes(e.status) ? 'current' : 'done',
        at: e.at, location: e.location ?? null, note: e.note ?? null,
      }));
  });
  return steps;
}

function stageOf(sorted, ev) {
  let stage = -1;
  for (const e of sorted) {
    if (e === ev) break;
    if (MAIN_PATH.includes(e.status)) stage = Math.max(stage, MAIN_PATH.indexOf(e.status));
  }
  return stage;
}

// ---------- Money (integer paise) ----------
export const toPaise = (rupees) => Math.round(rupees * 100);
export const formatINR = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

// ---------- Catalog constants ----------
export const CATEGORIES = ['Sofas', 'Chairs', 'Tables', 'Beds', 'Lighting', 'Storage', 'Décor'];
export const ROOMS = ['Living room', 'Bedroom', 'Dining', 'Workspace'];
export const MATERIALS = ['Oak', 'Walnut', 'Linen', 'Velvet', 'Boucle', 'Brass', 'Ceramic', 'Rattan'];
export const COLORS = {
  oat: { name: 'Oat', hex: '#D8CBB5' },
  walnut: { name: 'Walnut', hex: '#5A4033' },
  sage: { name: 'Sage', hex: '#9AA58C' },
  charcoal: { name: 'Charcoal', hex: '#3A3633' },
  terracotta: { name: 'Terracotta', hex: '#B4664A' },
  ivory: { name: 'Ivory', hex: '#EFE8DC' },
  brass: { name: 'Brass', hex: '#B08D4C' },
};
export const SORTS = ['featured', 'newest', 'price-asc', 'price-desc', 'rating'];

// ---------- Validation schemas (used by forms and API) ----------
const email = z.string().trim().toLowerCase().email('Enter an email like name@example.com');
const password = z.string().min(8, 'Passwords are at least 8 characters').max(128, 'Use 128 characters or fewer');

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password'), remember: z.boolean().optional() });
export const registerSchema = z.object({ name: z.string().trim().min(1, 'Enter your name').max(80), email, password });

const csv = (values) => z.string().optional().transform((s) => (s ? s.split(',').filter(Boolean) : [])).pipe(z.array(z.enum(values)));
export const productQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  room: z.enum(ROOMS).optional(),
  material: csv(MATERIALS),
  color: csv(Object.keys(COLORS)),
  maxPrice: z.coerce.number().int().positive().optional(),
  inStock: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  q: z.string().trim().max(80).optional(),
  ids: z.string().optional().transform((s) => (s ? s.split(',').filter((id) => /^[a-f0-9]{24}$/i.test(id)).slice(0, 200) : [])),
  sort: z.enum(SORTS).default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const addressSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  line1: z.string().trim().min(1, 'Enter the street address'),
  line2: z.string().trim().optional().default(''),
  city: z.string().trim().min(1, 'Enter a city'),
  state: z.string().trim().min(1, 'Enter a state'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  phone: z.string().trim().regex(/^\+?\d{10,13}$/, 'Enter a valid phone number'),
});

export const checkoutSchema = z.object({ address: addressSchema, assembly: z.boolean().default(false) });

export const statusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  at: z.coerce.date().optional(),
  location: z.string().trim().max(120).optional(),
  note: z.string().trim().max(240).optional(),
  eta: z.coerce.date().optional(),
  expectedVersion: z.number().int().optional(),
  externalId: z.string().max(120).optional(),
});
