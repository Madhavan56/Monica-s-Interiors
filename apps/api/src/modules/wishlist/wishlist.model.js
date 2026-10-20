import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    _id: false,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: Date.now },
    priceAtAdd: Number, // paise, for "price dropped" notes
  }],
}, { timestamps: true });

wishlistSchema.index({ 'items.productId': 1 });

export const WISHLIST_CAP = 200;
export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
