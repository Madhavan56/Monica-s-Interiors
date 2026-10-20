import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { price } from '../../lib/format.js';
import { ease } from '../../lib/motion.js';
import { useDelayedLoading } from '../../lib/hooks.js';
import { toast } from '../../stores/toasts.js';
import { Badge, Button, EmptyState, ProductSkeletons } from '../../components/ui/index.jsx';
import { ProductCard } from '../../components/commerce/ProductCard.jsx';
import { useAddToCart } from '../cart/useCart.js';
import { useToggleWishlist, useWishlist } from './useWishlist.js';

export default function WishlistPage() {
  const { data, isLoading, isGuest } = useWishlist();
  const toggle = useToggleWishlist();
  const { add } = useAddToCart();
  const { showSkeleton } = useDelayedLoading(isLoading);
  const items = data?.items ?? [];
  const saved = new Set(data?.ids ?? []);

  const also = useQuery({
    queryKey: ['products', { sort: 'rating', limit: 8 }],
    queryFn: () => api('/products?sort=rating&limit=8').then((r) => r.data),
  });

  const remove = (p) => {
    toggle(p, false);
    toast('Removed from wishlist', { action: 'Undo', onAction: () => toggle(p, true) });
  };
  const moveToCart = async (p) => {
    if (await add(p, { quiet: true })) {
      toggle(p, false);
      toast('Moved to cart');
    }
  };
  const addAll = async () => {
    const avail = items.filter((p) => p.stock > 0);
    for (const p of avail) {
      if (!(await add(p, { quiet: true }))) return; // add() handles sign-in redirect and errors
    }
    toast(`${avail.length} piece${avail.length === 1 ? '' : 's'} added to cart`);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/products?ids=${[...saved].join(',')}`);
      toast('Link copied. Anyone with it can see these pieces.');
    } catch {
      toast('Couldn’t copy the link. Try again.', { type: 'error', duration: 5000 });
    }
  };

  const extra = (p) => (
    <div className="wish-extra">
      {p.stock === 0 ? (
        <Button size="sm" className="card-actions" onClick={() => toast('We’ll email you when it’s back in stock', { type: 'info' })}>Notify me</Button>
      ) : (
        <>
          {p.priceDrop > 0 && <Badge tone="success" dot>Price dropped {price(p.priceDrop)}</Badge>}
          {p.stock <= 3 && <Badge tone="warning" dot>Only {p.stock} left</Badge>}
          <Button size="sm" className="card-actions" onClick={() => moveToCart(p)}>Move to cart</Button>
        </>
      )}
      <Button size="sm" variant="tertiary" className="card-actions self-start !px-0" onClick={() => remove(p)}>Remove</Button>
    </div>
  );

  return (
    <div className="container">
      <div className="title-row">
        <div>
          <h1>Your wishlist</h1>
          {items.length > 0 && <p className="muted tnum mt-1.5">{items.length} saved piece{items.length === 1 ? '' : 's'}</p>}
        </div>
        {items.length > 0 && (
          <div className="actions">
            <Button variant="tertiary" onClick={share}>Share list</Button>
            <Button onClick={addAll}>Add all to cart</Button>
          </div>
        )}
      </div>

      {isGuest && (
        <div className="panel mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="!mb-0 !text-xl">Keep your saved pieces on every device</h3>
            <p className="muted body-sm mt-1">You’re browsing as a guest. Sign in and we’ll merge these into your account.</p>
          </div>
          <Button as={Link} to="/login?next=/wishlist" variant="primary">Sign in</Button>
        </div>
      )}

      <div className="product-grid cols-4">
        {showSkeleton && <ProductSkeletons count={4} />}
        <AnimatePresence mode="popLayout">
          {!isLoading && !showSkeleton && items.map((p, i) => (
            <motion.div
              key={p.id} layout
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2, ease: ease.in } }}
              transition={{ layout: { duration: 0.32, ease: ease.standard } }}
            >
              <ProductCard product={p} index={i} extra={extra(p)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!isLoading && !items.length && (
        <EmptyState icon="emptyChair" title="Nothing saved yet" action={<Button as={Link} to="/products?sort=newest" variant="primary">Explore new arrivals</Button>}>
          Tap the heart on any piece to keep it here.
        </EmptyState>
      )}

      <section className="section" aria-labelledby="also-title">
        <div className="section-head"><h2 id="also-title">You may also like</h2></div>
        <div className="product-grid cols-4">
          {(also.data ?? []).filter((p) => !saved.has(p.id) && p.stock > 0).slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>
    </div>
  );
}
