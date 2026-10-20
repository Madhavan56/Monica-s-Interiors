import { useState } from 'react';
import { Badge, Button, Icon } from '../../components/ui/index.jsx';
import { ProductArt } from '../../components/commerce/ProductArt.jsx';
import { Price } from '../../components/commerce/ProductCard.jsx';
import { WishlistHeart } from '../../components/commerce/WishlistHeart.jsx';
import { useAddToCart } from '../cart/useCart.js';
import { toast } from '../../stores/toasts.js';

/** Shared by the quick-view modal and the full product page. */
export function ProductDetail({ product, compact }) {
  const { add } = useAddToCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const sold = product.stock === 0;

  return (
    <div className={`grid items-start gap-6 ${compact ? 'sm:grid-cols-2' : 'lg:grid-cols-[7fr_5fr] lg:gap-16'}`}>
      <div className="relative">
        <ProductArt product={product} withAlt={false} priority sizes="(min-width: 1024px) 55vw, 100vw" />
        <WishlistHeart product={product} />
      </div>
      <div className="flex flex-col gap-4">
        <span className="overline">{product.category} · {product.room}</span>
        {!compact && <h1>{product.name}</h1>}
        <Price product={product} className="!text-[1.375rem]" />
        <div className="rating"><Icon name="star" size={14} /><span>{product.rating.average}</span><span className="faint">· {product.rating.count} reviews</span></div>
        <p className="muted">{product.description}</p>
        <div>
          <span className="label">Colors</span>
          <div className="swatches mt-2">{product.colors.map((c) => <span key={c.key} className="!h-6 !w-6" style={{ background: c.hex }} title={c.name} />)}</div>
        </div>
        {sold ? <Badge tone="neutral" className="self-start">Sold out</Badge>
          : product.stock <= 3 ? <Badge tone="warning" dot className="self-start">Only {product.stock} left</Badge>
            : <Badge tone="success" dot className="self-start">In stock · ships in 5–7 days</Badge>}
        {sold ? (
          <Button size="lg" block onClick={() => toast('We’ll email you when it’s back in stock', { type: 'info' })}>Notify me when it’s back</Button>
        ) : (
          <Button
            variant="primary" size="lg" block loading={adding}
            onClick={async () => { setAdding(true); const ok = await add(product); setAdding(false); if (ok) setAdded(true); }}
          >
            {added ? 'Added ✓ Add another' : 'Add to cart'}
          </Button>
        )}
      </div>
    </div>
  );
}
