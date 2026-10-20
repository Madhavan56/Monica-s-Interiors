import { memo, useMemo } from 'react';
import { productArt, thumbArt, sceneArt } from '../../lib/art.js';
import { Picture } from '../ui/Picture.jsx';

/** Room and hero photography (CC0, see images-src/CREDITS.md). Names without a photo fall back to drawn scenes. */
const SCENE_PHOTOS = {
  hero: { src: '/images/scenes/hero.jpg', alt: 'Living room with a blue sofa and herringbone wood floor' },
  living: { src: '/images/scenes/living.jpg', alt: 'Warm living room with a cream sofa, cushions and a wooden bookcase' },
  bedroom: { src: '/images/scenes/bedroom.jpg', alt: 'Loft bedroom with a patterned bed and a white desk by the window' },
  dining: { src: '/images/scenes/dining.jpg', alt: 'Round white dining table with two chairs in a sunny corner' },
  workspace: { src: '/images/scenes/workspace.jpg', alt: 'Desk workspace with a lamp, plant and computer' },
  editorial: { src: '/images/scenes/editorial.jpg', alt: 'Dining room lit by warm pendant lights' },
  login: { src: '/images/scenes/login.jpg', alt: 'Bright living room with a grey sofa, round coffee table and tall windows' },
};

// Rendered widths, so the browser picks the smallest file that stays sharp.
const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

/** Product image: optimized photo when the product has one, otherwise the drawn placeholder. */
export const ProductArt = memo(function ProductArt({ product, withAlt = true, className = '', priority = false, sizes = CARD_SIZES }) {
  const [main, alt] = product.images ?? [];
  const html = useMemo(
    () => (main?.url ? null : productArt(product.art) + (withAlt ? productArt(product.art, 'alt') : '')),
    [main?.url, product.art, withAlt],
  );
  if (main?.url) {
    return (
      <div className={`art ${className}`}>
        <Picture src={main.url} alt={main.alt || product.name} sizes={sizes} priority={priority} className="absolute inset-0" imgClassName="main-view" />
        {withAlt && alt?.url && <Picture src={alt.url} sizes={sizes} className="alt-view absolute inset-0" />}
      </div>
    );
  }
  return <div className={`art ${className}`} role="img" aria-label={product.name} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Square thumbnail for order items: photo snapshot if the order stored one, else the drawing. */
export const ThumbArt = memo(function ThumbArt({ item, className = '' }) {
  const html = useMemo(() => (item.image ? null : thumbArt(item.art)), [item.image, item.art]);
  if (item.image) return <Picture src={item.image} sizes="96px" className={`relative ${className}`} />;
  return <div className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Hero, room tiles, editorial and login imagery. Decorative unless `describe` is set. */
export const SceneArt = memo(function SceneArt({ name, ratio, align, className = '', describe = false, priority = false, sizes = '100vw' }) {
  const photo = SCENE_PHOTOS[name];
  const html = useMemo(() => (photo ? null : sceneArt(name, { ratio, align })), [photo, name, ratio, align]);
  if (photo) {
    return (
      <div className={className}>
        <Picture src={photo.src} alt={describe ? photo.alt : ''} sizes={sizes} priority={priority} className="absolute inset-0" imgClassName="scene-photo" />
      </div>
    );
  }
  return <div className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
});
