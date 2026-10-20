// Register, login, refresh rotation with reuse detection, logout (architecture doc §3).
import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { hash, verify } from '@node-rs/argon2';
import { loginSchema, registerSchema } from '@mi/shared';
import { env, isProd } from '../../config/env.js';
import { AppError, asyncHandler } from '../../utils/errors.js';
import { validate, csrfGuard, loginLimiter, registerLimiter, requireAuth } from '../../middleware/index.js';
import { User, publicUser } from '../users/user.model.js';
import { RefreshToken } from './refreshToken.model.js';

const COOKIE = 'mi_rt';
const COOKIE_PATH = '/api/v1/auth';
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// A real hash to verify against when the email doesn't exist, so timing doesn't reveal accounts.
const dummyHash = hash('not-a-real-password', ARGON);

function signAccess(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, tv: user.tokenVersion }, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`,
  });
}

async function issueRefresh(res, req, user, { family = crypto.randomUUID(), persistent = true } = {}) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const days = persistent ? env.REFRESH_TOKEN_DAYS : 1;
  await RefreshToken.create({
    userId: user._id, family, tokenHash: sha256(raw), persistent,
    expiresAt: new Date(Date.now() + days * 864e5), userAgent: req.get('user-agent')?.slice(0, 200), ip: req.ip,
  });
  res.cookie(COOKIE, raw, {
    httpOnly: true, secure: isProd, sameSite: 'lax', path: COOKIE_PATH,
    ...(persistent && { maxAge: days * 864e5 }),
  });
}

const clearCookie = (res) => res.clearCookie(COOKIE, { path: COOKIE_PATH, httpOnly: true, sameSite: 'lax', secure: isProd });
const session = (user) => ({ user: publicUser(user), accessToken: signAccess(user), expiresIn: env.ACCESS_TOKEN_MINUTES * 60 });

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validate({ body: registerSchema }), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) {
    throw new AppError('EMAIL_TAKEN', 409, 'An account with that email already exists. Try signing in.', { email: 'This email already has an account' });
  }
  const user = await User.create({ name, email, passwordHash: await hash(password, ARGON) });
  await issueRefresh(res, req, user);
  res.status(201).json({ data: session(user) });
}));

authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const { email, password, remember = true } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await verify(user?.passwordHash ?? (await dummyHash), password);
  if (!user || !ok) throw new AppError('INVALID_CREDENTIALS', 401, 'That email and password don’t match. Check them and try again.');
  await issueRefresh(res, req, user, { persistent: remember });
  res.json({ data: session(user) });
}));

authRouter.post('/refresh', csrfGuard, asyncHandler(async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  // No cookie = a signed-out visitor, not an error: answer 200 with no session so browsers don't log a 401.
  if (!raw) return res.json({ data: null });
  const token = await RefreshToken.findOne({ tokenHash: sha256(raw) });
  if (!token || token.revokedAt || token.expiresAt < new Date()) {
    clearCookie(res);
    throw new AppError('UNAUTHENTICATED', 401, 'Sign in to continue.');
  }
  if (token.usedAt) {
    // Reuse of a rotated token: assume theft, revoke the whole family.
    // A 10-second grace window absorbs two tabs refreshing at the same moment.
    if (Date.now() - token.usedAt.getTime() > 10_000) {
      await RefreshToken.updateMany({ family: token.family }, { $set: { revokedAt: new Date() } });
      clearCookie(res);
      throw new AppError('SESSION_REVOKED', 401, 'For your security, please sign in again.');
    }
  }
  const user = await User.findById(token.userId);
  if (!user) throw new AppError('UNAUTHENTICATED', 401, 'Sign in to continue.');
  token.usedAt ??= new Date();
  await token.save();
  await issueRefresh(res, req, user, { family: token.family, persistent: token.persistent });
  res.json({ data: session(user) });
}));

authRouter.post('/logout', csrfGuard, asyncHandler(async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (raw) {
    const token = await RefreshToken.findOne({ tokenHash: sha256(raw) });
    if (token) await RefreshToken.updateMany({ family: token.family }, { $set: { revokedAt: new Date() } });
  }
  clearCookie(res);
  res.status(204).end();
}));

authRouter.post('/logout-all', requireAuth, asyncHandler(async (req, res) => {
  await RefreshToken.updateMany({ userId: req.user.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
  clearCookie(res);
  res.status(204).end();
}));
