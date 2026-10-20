import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  family: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  persistent: { type: Boolean, default: true },
  usedAt: Date,
  revokedAt: Date,
  expiresAt: { type: Date, required: true },
  userAgent: String,
  ip: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

refreshTokenSchema.index({ userId: 1, family: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
