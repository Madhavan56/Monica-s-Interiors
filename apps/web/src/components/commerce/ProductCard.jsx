import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { COLORS } from '@mi/shared';
import { price } from '../../lib/format.js';
import { reveal } from '../../lib/motion.js';
import { Badge, Button, Icon } from '../ui/index.jsx';
import { ProductArt } from './ProductArt.jsx';
import { WishlistHeart } from './WishlistHeart.jsx';
import { useAddToCart } from '../../features/cart/useCart.js';
import { useState } from 'react';

export function Price({ product, className = '' }) {
  if (product.salePrice) {
    return (
      <div className={`price-row ${className}`}>
        <span className="sale" aria-hidden="true">{price(product.salePrice)}</span>
        <s aria-hidden="true">{price(product.price)}</s>
        <span className="sr-only">Sale price {price(product.salePrice)}, was {price(product.price)}</span>
      </div>
    );
  }
  return <div className={`price-row ${className}`}><span>{price(product.price)}</span></div>;
}

function Tag({ product }) {
  if (product.stock === 0) return <Badge tone="neutral" className="tag">Sold out</Badge>;
  if (product.salePrice) return <Badge tone="sale" className="plain tag">−{Math.round((1 - product.salePrice / product.price) * 100)}%</Badge>;
  if (product.isNew) return <Badge className="plain tag">New</Badge>;
  if (product.badges?.[0]) return <Badge className="plain tag">{product.badges[0]}</Badge>;
  return null;
}

/** Product card (design spec 3.2). The whole card links to the product; heart and quick add sit above the link. */
export function ProductCard({ product, index = 0, extra, onOpen, priority = false }) {
  const { add } = useAddToCart();
  const [adding, setAdding] = useState(false);
  const sold = product.stock === 0;
  const href = `/products/${product.slug}`;

  return (
    <motion.article className={`product-card ${sold ? 'sold-out' : ''}`} {...reveal(index)}>
      <div className="media">
        <ProductArt product={product} priority={priority} />
        <Tag product={product} />
        <WishlistHeart product={product} />
        {!sold && (
          <Button
            size="sm" className="quick-add" loading={adding}
            onClick={async (e) => { e.preventDefault(); setAdding(true); await add(product); setAdding(false); }}
          >
            Quick add
          </Button>
        )}
      </div>
      <div className="info">
        <span className="overline">{product.room}</span>
        <h4>
          <Link className="card-link" to={href} aria-label={product.name} onClick={onOpen ? (e) => { e.preventDefault(); onOpen(product); } : undefined} />
          {product.name}
        </h4>
        <div className="swatches" aria-label={`${product.colors.length} colors`}>
          {product.colors.slice(0, 4).map((c) => <span key={c.key} style={{ background: c.hex || COLORS[c.key]?.hex }} title={c.name} />)}
          {product.colors.length > 4 && <span className="caption faint" style={{ border: 0, width: 'auto' }}>+{product.colors.length - 4}</span>}
        </div>
        <Price product={product} />
        <div className="rating">
          <Icon name="star" size={14} />
          <span>{product.rating.average}</span>
          <span className="faint">({product.rating.count})</span>
          <span className="sr-only">stars from {product.rating.count} reviews</span>
        </div>
        {extra}
      </div>
    </motion.article>
  );
}
