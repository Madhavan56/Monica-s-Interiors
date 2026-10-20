import { useState } from 'react';
import manifest from '../../lib/image-manifest.json';

/**
 * Responsive, blur-up image (design spec §5 "Image load").
 * - Known images (from `npm run images`) get WebP srcset + a 24px blurred preview painted instantly.
 * - Unknown URLs (e.g. a CDN upload) render as a plain <img>.
 * - `priority` = above-the-fold/LCP image: eager + high fetch priority. Everything else is lazy.
 */
export function Picture({ src, alt = '', sizes = '100vw', priority = false, className = '', imgClassName = '', style }) {
  const m = manifest[src];
  const [loaded, setLoaded] = useState(false);
  const img = (
    <img
      src={m?.src ?? src}
      srcSet={m?.srcSet}
      sizes={m ? sizes : undefined}
      width={m?.w}
      height={m?.h}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
      onLoad={() => setLoaded(true)}
      ref={(el) => { if (el?.complete && el.naturalWidth && !loaded) setLoaded(true); }}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none ${loaded || priority ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
    />
  );
  return (
    <div
      className={`overflow-hidden bg-surface-alt bg-cover bg-center ${className}`}
      style={{ ...(m && { backgroundImage: `url("${m.blur}")` }), ...style }}
    >
      {img}
    </div>
  );
}
