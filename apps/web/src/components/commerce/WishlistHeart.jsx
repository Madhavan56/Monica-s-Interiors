import { useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { icons } from '../../lib/art.js';
import { ease } from '../../lib/motion.js';
import { useToggleWishlist, useWishlistIds } from '../../features/wishlist/useWishlist.js';
import { toast } from '../../stores/toasts.js';
import { useNavigate } from 'react-router-dom';

const ANGLES = [0, 60, 120, 180, 240, 300];

/** Heart toggle with squash → spring overshoot and a six-dot burst (design spec 3.3, §5). */
export function WishlistHeart({ product, className = '' }) {
  const saved = useWishlistIds().has(product.id);
  const toggle = useToggleWishlist();
  const heart = useAnimationControls();
  const reduce = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);
  const navigate = useNavigate();

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    toggle(product, next);
    if (!reduce) {
      if (next) {
        setBurstKey((k) => k + 1);
        heart.start({ scale: [1, 0.8, 1.2, 1], transition: { duration: 0.48, times: [0, 0.21, 0.6, 1], ease: [ease.in, ease.spring, ease.standard] } });
      } else {
        heart.start({ scale: [1, 0.9, 1], transition: { duration: 0.22, ease: ease.standard } });
      }
    }
    if (next) toast('Saved to wishlist', { action: 'View', onAction: () => navigate('/wishlist') });
  };

  return (
    <button
      type="button" className={`heart ${className}`} aria-pressed={saved}
      aria-label={`Save ${product.name} to wishlist`} onClick={onClick}
    >
      <motion.span animate={heart} className="grid" dangerouslySetInnerHTML={{ __html: icons.heart }} />
      {burstKey > 0 && (
        <span key={burstKey} className="pointer-events-none absolute inset-0" aria-hidden="true">
          {ANGLES.map((a) => (
            <span key={a} className="absolute inset-0" style={{ transform: `rotate(${a}deg)` }}>
              <motion.i
                className="absolute left-1/2 top-1/2 -ml-0.5 -mt-0.5 h-1 w-1 rounded-full bg-accent"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.48, delay: 0.1, ease: ease.out }}
              />
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
