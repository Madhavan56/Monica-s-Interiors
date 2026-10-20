import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { env, isProd } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { User } from '../modules/users/user.model.js';

/** Request id for logs and error responses. */
export function requestId(req, res, next) {
  req.id = `req_${crypto.randomBytes(6).toString('hex')}`;
  res.setHeader('X-Request-Id', req.id);
  next();
}

/** Strip keys starting with "$" or containing "." to block operator injection. */
export function sanitize(req, _res, next) {
  const clean = (v) => {
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('$') && !k.includes('.')).map(([k, val]) => [k, clean(val)]));
    }
    return v;
  };
  if (req.body) req.body = clean(req.body);
  next();
}

/** Validate and replace req.body / req.query / req.params with parsed values. */
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (schemas[key]) req[key === 'query' ? 'validQuery' : key] = schemas[key].parse(req[key]);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/** Verify the access JWT, load the user, check tokenVersion. */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('UNAUTHENTICATED', 401, 'Sign in to continue.');
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (e) {
      if (e.name === 'TokenExpiredError') throw new AppError('TOKEN_EXPIRED', 401, 'Your session expired.');
      throw new AppError('UNAUTHENTICATED', 401, 'Sign in to continue.');
    }
    const user = await User.findById(payload.sub).lean();
    if (!user || user.tokenVersion !== payload.tv) throw new AppError('UNAUTHENTICATED', 401, 'Sign in to continue.');
    req.user = { id: String(user._id), role: user.role, name: user.name, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  next(roles.includes(req.user?.role) ? undefined : new AppError('FORBIDDEN', 403, 'You don’t have access to that.'));

/**
 * Cookie-only endpoints need a custom header + an allowed Origin (CSRF guard).
 * Allowed: the configured web origins, or this server's own origin (when it serves the built web app).
 */
export function csrfGuard(req, _res, next) {
  const origin = req.get('origin');
  const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
  if (req.get('x-requested-with') !== 'fetch' || (origin && !sameOrigin && !env.WEB_ORIGIN.includes(origin))) {
    return next(new AppError('FORBIDDEN', 403, 'Request blocked.'));
  }
  next();
}

const limiter = (windowMs, limit, keyFn) => rateLimit({
  windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: keyFn,
  handler: (req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Wait a minute and try again.', requestId: req.id } }),
});
export const loginLimiter = limiter(60_000, 5, (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`);
export const registerLimiter = limiter(60_000, 3, (req) => req.ip);
export const apiLimiter = limiter(60_000, 300, (req) => req.ip);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.', requestId: req.id } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let e = err;
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    e = new AppError('VALIDATION_FAILED', 400, 'Check the highlighted fields.', fields);
  } else if (err?.name === 'CastError') {
    e = new AppError('NOT_FOUND', 404, 'That wasn’t found.');
  } else if (err?.code === 11000) {
    e = new AppError('CONFLICT', 409, 'That already exists.');
  } else if (err?.type === 'entity.too.large') {
    e = new AppError('PAYLOAD_TOO_LARGE', 413, 'That request is too large.');
  } else if (err?.type === 'entity.parse.failed') {
    e = new AppError('VALIDATION_FAILED', 400, 'The request body isn’t valid JSON.');
  }
  if (!(e instanceof AppError)) {
    console.error(`[${req.id}]`, err);
    e = new AppError('INTERNAL', 500, 'Something went wrong on our side. Try again in a moment.');
  }
  res.status(e.status).json({
    error: { code: e.code, message: e.message, ...(e.fields && { fields: e.fields }), requestId: req.id, ...(!isProd && e.status === 500 && { debug: String(err?.message) }) },
  });
}
