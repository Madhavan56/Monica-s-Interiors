import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  name: String, line1: String, line2: String, city: String, state: String, pincode: String, phone: String,
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  emailVerified: { type: Boolean, default: false },
  passwordHash: { type: String, required: true, select: false },
  phone: String,
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
  addresses: [addressSchema],
  preferences: {
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    marketingEmails: { type: Boolean, default: false },
  },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

export const publicUser = (u) => ({
  id: String(u._id), name: u.name, email: u.email, role: u.role, emailVerified: u.emailVerified,
  phone: u.phone ?? null, addresses: u.addresses ?? [], preferences: u.preferences,
});
