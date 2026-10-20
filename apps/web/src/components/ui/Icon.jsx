import { icons } from '../../lib/art.js';

/** Inline SVG icon from the shared icon set (24px grid, 1.5 stroke). */
export function Icon({ name, size = 20, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: size, height: size, ...style }}
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}
