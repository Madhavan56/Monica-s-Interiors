import { Router } from 'express';
import { z } from 'zod';
import { addressSchema } from '@mi/shared';
import { asyncHandler, notFound } from '../../utils/errors.js';
import { requireAuth, validate } from '../../middleware/index.js';
import { User, publicUser } from './user.model.js';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get('/', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  res.json({ data: publicUser(user) });
}));

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().regex(/^\+?\d{10,13}$/, 'Enter a valid phone number').optional(),
  preferences: z.object({ theme: z.enum(['system', 'light', 'dark']).optional(), marketingEmails: z.boolean().optional() }).optional(),
});

meRouter.patch('/', validate({ body: patchSchema }), asyncHandler(async (req, res) => {
  const set = {};
  if (req.body.name) set.name = req.body.name;
  if (req.body.phone) set.phone = req.body.phone;
  for (const [k, v] of Object.entries(req.body.preferences || {})) set[`preferences.${k}`] = v;
  const user = await User.findByIdAndUpdate(req.user.id, { $set: set }, { new: true }).lean();
  res.json({ data: publicUser(user) });
}));

meRouter.post('/addresses', validate({ body: addressSchema.extend({ label: z.string().max(30).optional(), isDefault: z.boolean().optional() }) }), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (req.body.isDefault || !user.addresses.length) user.addresses.forEach((a) => { a.isDefault = false; });
  user.addresses.push({ ...req.body, isDefault: req.body.isDefault || !user.addresses.length });
  await user.save();
  res.status(201).json({ data: publicUser(user).addresses });
}));

meRouter.delete('/addresses/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const addr = user.addresses.id(req.params.id);
  if (!addr) throw notFound('That address');
  addr.deleteOne();
  await user.save();
  res.json({ data: publicUser(user).addresses });
}));
