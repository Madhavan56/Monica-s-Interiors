// Placeholder "photography": warm, minimal SVG furniture scenes.
// Swap for real product photos later by replacing productArt() output with <img>.

export const PALETTES = [
  { wall: ['#EFE6DA', '#E4D7C6'], floor: '#D8C8B2', obj: '#CDBBA0', dark: '#8C735A', accent: '#B4664A' }, // oat
  { wall: ['#E7E4DC', '#D9D5CA'], floor: '#C9C2B4', obj: '#9AA58C', dark: '#5F6B55', accent: '#D8CBB5' }, // sage
  { wall: ['#F1E7DF', '#E6D4C7'], floor: '#D9C2B2', obj: '#B4664A', dark: '#7C4430', accent: '#EFE8DC' }, // terracotta
  { wall: ['#E9E6E1', '#DCD7CF'], floor: '#CFC8BD', obj: '#3A3633', dark: '#1F1C1A', accent: '#B08D4C' }, // charcoal
  { wall: ['#F2EEE6', '#E8E0D2'], floor: '#DACDB8', obj: '#5A4033', dark: '#3B2A21', accent: '#C9A35F' }, // walnut
  { wall: ['#ECE8E0', '#E0DACE'], floor: '#D2C9BA', obj: '#EFE8DC', dark: '#A8977F', accent: '#9AA58C' }, // ivory
];

const shapes = {
  sofa: (c) => `
    <rect x="70" y="250" width="260" height="80" rx="18" fill="${c.obj}"/>
    <rect x="60" y="300" width="280" height="60" rx="14" fill="${c.dark}"/>
    <rect x="88" y="288" width="108" height="34" rx="12" fill="${c.obj}"/>
    <rect x="204" y="288" width="108" height="34" rx="12" fill="${c.obj}"/>
    <rect x="44" y="278" width="44" height="84" rx="18" fill="${c.obj}"/>
    <rect x="312" y="278" width="44" height="84" rx="18" fill="${c.obj}"/>
    <rect x="96" y="262" width="44" height="40" rx="10" fill="${c.accent}" opacity=".9"/>
    <rect x="80" y="360" width="7" height="14" fill="${c.dark}"/><rect x="313" y="360" width="7" height="14" fill="${c.dark}"/>`,
  chair: (c) => `
    <rect x="128" y="214" width="144" height="120" rx="48" fill="${c.obj}"/>
    <rect x="116" y="298" width="168" height="44" rx="16" fill="${c.dark}"/>
    <rect x="132" y="290" width="136" height="26" rx="10" fill="${c.obj}"/>
    <path d="M142 340 L132 374 M258 340 L268 374" stroke="${c.dark}" stroke-width="7" stroke-linecap="round"/>`,
  table: (c) => `
    <rect x="70" y="276" width="260" height="16" rx="5" fill="${c.obj}"/>
    <rect x="94" y="292" width="10" height="82" rx="3" fill="${c.dark}"/><rect x="296" y="292" width="10" height="82" rx="3" fill="${c.dark}"/>
    <path d="M190 276 C178 256 182 238 196 228 L204 228 C218 238 222 256 210 276 Z" fill="${c.accent}"/>
    <path d="M200 228 C196 204 188 192 176 184 M200 228 C206 206 216 196 228 190" stroke="${c.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  lamp: (c) => `
    <ellipse cx="200" cy="232" rx="70" ry="22" fill="#fff" opacity=".35"/>
    <path d="M158 146 L242 146 L266 220 L134 220 Z" fill="${c.obj}"/>
    <rect x="197" y="220" width="6" height="142" fill="${c.dark}"/>
    <ellipse cx="200" cy="364" rx="40" ry="9" fill="${c.dark}"/>`,
  bed: (c) => `
    <rect x="60" y="206" width="280" height="116" rx="16" fill="${c.dark}"/>
    <rect x="48" y="290" width="304" height="58" rx="12" fill="${c.obj}"/>
    <rect x="84" y="268" width="104" height="32" rx="13" fill="#FBF8F3" opacity=".85"/>
    <rect x="212" y="268" width="104" height="32" rx="13" fill="#FBF8F3" opacity=".85"/>
    <rect x="216" y="290" width="136" height="58" rx="4" fill="${c.accent}" opacity=".75"/>
    <rect x="62" y="348" width="8" height="24" fill="${c.dark}"/><rect x="330" y="348" width="8" height="24" fill="${c.dark}"/>`,
  vase: (c) => `
    <path d="M176 226 C146 268 148 330 174 368 L226 368 C252 330 254 268 224 226 Z" fill="${c.obj}"/>
    <rect x="184" y="212" width="32" height="18" rx="4" fill="${c.dark}"/>
    <path d="M200 212 C194 170 176 140 150 120 M200 212 C204 168 222 140 252 126 M200 212 C200 176 198 150 200 110" stroke="${c.dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="152" cy="120" rx="10" ry="5" fill="${c.accent}"/><ellipse cx="252" cy="126" rx="10" ry="5" fill="${c.accent}"/><ellipse cx="200" cy="108" rx="9" ry="5" fill="${c.accent}"/>`,
  shelf: (c) => `
    <rect x="110" y="132" width="180" height="240" rx="4" fill="none" stroke="${c.dark}" stroke-width="8"/>
    <path d="M114 196 H286 M114 256 H286 M114 316 H286" stroke="${c.dark}" stroke-width="6"/>
    <rect x="128" y="156" width="14" height="40" fill="${c.accent}"/><rect x="144" y="162" width="12" height="34" fill="${c.obj}"/><rect x="158" y="152" width="16" height="44" fill="${c.dark}" opacity=".6"/>
    <circle cx="246" cy="236" r="18" fill="${c.obj}"/><rect x="134" y="228" width="40" height="28" rx="6" fill="${c.accent}" opacity=".7"/>
    <rect x="210" y="280" width="12" height="36" fill="${c.obj}"/><rect x="224" y="286" width="12" height="30" fill="${c.accent}"/><rect x="238" y="276" width="14" height="40" fill="${c.dark}" opacity=".5"/>`,
  mirror: (c) => `
    <path d="M136 368 V196 A64 64 0 0 1 264 196 V368 Z" fill="${c.dark}"/>
    <path d="M146 360 V198 A54 54 0 0 1 254 198 V360 Z" fill="#F7F3EC" opacity=".85"/>
    <path d="M170 360 L230 190" stroke="#fff" stroke-width="14" opacity=".5"/>`,
  pendant: (c) => `
    <line x1="200" y1="0" x2="200" y2="170" stroke="${c.dark}" stroke-width="2"/>
    <path d="M140 230 A60 60 0 0 1 260 230 Z" fill="${c.obj}"/>
    <ellipse cx="200" cy="232" rx="60" ry="6" fill="${c.dark}"/>
    <ellipse cx="200" cy="300" rx="90" ry="40" fill="#fff" opacity=".22"/>`,
  plant: (c) => `
    <path d="M168 300 L232 300 L224 368 L176 368 Z" fill="${c.accent}"/>
    <path d="M200 300 C170 260 150 230 136 190 C176 206 194 246 200 300 Z" fill="#7F8F6E"/>
    <path d="M200 300 C232 256 252 226 270 186 C226 204 206 244 200 300 Z" fill="#6E7E5E"/>
    <path d="M200 300 C196 250 198 210 206 168 C222 214 214 262 200 300 Z" fill="#8FA07C"/>`,
};

const extras = {
  frame: (c) => `<rect x="150" y="70" width="100" height="120" rx="3" fill="#FBF8F3" stroke="${c.dark}" stroke-width="5"/><circle cx="200" cy="120" r="22" fill="${c.accent}" opacity=".75"/><path d="M162 176 L188 146 L206 164 L222 150 L238 176 Z" fill="${c.obj}"/>`,
};

function frame(c, inner, { floorY = 370, id }) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.wall[0]}"/><stop offset="1" stop-color="${c.wall[1]}"/></linearGradient></defs>
    <rect width="400" height="500" fill="url(#${id})"/>
    <rect y="${floorY}" width="400" height="${500 - floorY}" fill="${c.floor}"/>
    <ellipse cx="200" cy="${floorY + 6}" rx="150" ry="10" fill="#000" opacity=".07"/>${inner}`;
}

let uid = 0;

/** A single product on a wall/floor backdrop. variant "alt" = closer crop + plant. */
export function productArt(p, variant = 'main') {
  const c = PALETTES[p.palette % PALETTES.length];
  const id = `g${++uid}`;
  const shape = shapes[p.shape](c);
  if (variant === 'alt') {
    const alt = { ...c, wall: [c.wall[1], c.wall[0]] };
    const inner = `<g transform="translate(-60 -70) scale(1.3)">${shape}</g><g transform="translate(250 150) scale(.5)">${shapes.plant(c)}</g>`;
    return `<svg class="alt-view" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${frame(alt, inner, { floorY: 400, id })}</svg>`;
  }
  return `<svg class="main-view" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${frame(c, shape, { id })}</svg>`;
}

/** Thumbnail (square crop) */
export function thumbArt(p) {
  const c = PALETTES[p.palette % PALETTES.length];
  const id = `t${++uid}`;
  return `<svg viewBox="40 110 320 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${frame(c, shapes[p.shape](c), { id })}</svg>`;
}

/** Wide room scenes for hero, room tiles, editorial and login */
export function sceneArt(name, { cls = '', ratio = 'wide', align = 'xMidYMid' } = {}) {
  const id = `s${++uid}`;
  const vb = ratio === 'tall' ? '0 0 600 800' : '0 0 1600 900';
  const W = ratio === 'tall' ? 600 : 1600, H = ratio === 'tall' ? 800 : 900;
  const floorY = Math.round(H * 0.74);
  const scenes = {
    living: { c: PALETTES[0], items: [['frame', 0.5, 0.18, 1.1], ['lamp', 0.22, 0, 1.25], ['sofa', 0.5, 0, 1.55], ['plant', 0.8, 0, 1.1], ['table', 0.5, 0, 0.9, 0.12]] },
    bedroom: { c: PALETTES[5], items: [['pendant', 0.2, -0.05, 1.0], ['bed', 0.52, 0, 1.6], ['vase', 0.86, 0, 0.8], ['frame', 0.52, 0.12, 0.9]] },
    dining: { c: PALETTES[2], items: [['pendant', 0.5, -0.06, 1.1], ['chair', 0.28, 0, 1.0], ['table', 0.5, 0, 1.3], ['chair', 0.72, 0, 1.0], ['mirror', 0.88, 0, 0.9]] },
    workspace: { c: PALETTES[1], items: [['shelf', 0.2, 0, 1.2], ['table', 0.56, 0, 1.2], ['chair', 0.56, 0, 0.9, 0.06], ['lamp', 0.84, 0, 1.0]] },
    hero: { c: { ...PALETTES[0], wall: ['#EEE4D6', '#E2D3BF'] }, items: [['frame', 0.72, 0.2, 0.9], ['lamp', 0.9, 0, 1.15], ['sofa', 0.72, 0, 1.35], ['plant', 0.54, 0, 0.85], ['table', 0.71, 0, 0.8, 0.1]] },
  };
  const s = scenes[name];
  const c = s.c;
  const parts = s.items.map(([shape, fx, dy, scale, drop = 0]) => {
    const k = (H / 500) * scale * (ratio === 'tall' ? 0.9 : 0.8);
    const x = W * fx - 200 * k;
    const y = floorY - 372 * k + H * drop + (shape === 'frame' || shape === 'pendant' ? H * dy : 0);
    const draw = shape === 'frame' ? extras.frame(c) : shapes[shape](c);
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})">${draw}</g>`;
  }).join('');
  return `<svg class="${cls}" viewBox="${vb}" preserveAspectRatio="${align} slice" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.wall[0]}"/><stop offset="1" stop-color="${c.wall[1]}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#${id})"/>
    <rect x="${W * 0.06}" y="0" width="${W * 0.12}" height="${floorY}" fill="#fff" opacity=".18"/>
    <rect y="${floorY}" width="${W}" height="${H - floorY}" fill="${c.floor}"/>
    <ellipse cx="${W / 2}" cy="${floorY + 10}" rx="${W * 0.45}" ry="18" fill="#000" opacity=".06"/>
    ${parts}</svg>`;
}

// ---------- Icons (24px, 1.5 stroke, rounded) ----------
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const icons = {
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="heart-path" d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>`,
  heartNav: I('<path class="fillable" d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  bag: I('<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  home: I('<path class="fillable" d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/>'),
  grid: I('<rect class="fillable" x="4" y="4" width="7" height="7" rx="1.5"/><rect class="fillable" x="13" y="4" width="7" height="7" rx="1.5"/><rect class="fillable" x="4" y="13" width="7" height="7" rx="1.5"/><rect class="fillable" x="13" y="13" width="7" height="7" rx="1.5"/>'),
  box: I('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9" stroke-opacity=".9"/>'),
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'stroke-width="2.25"'),
  checkCircle: I('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>'),
  alert: I('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>'),
  chevronLeft: I('<path d="m15 5-7 7 7 7"/>'),
  chevronRight: I('<path d="m9 5 7 7-7 7"/>'),
  arrowRight: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  truck: I('<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>'),
  phone: I('<path d="M5 4h4l1.5 4.5L8 10a11 11 0 0 0 6 6l1.5-2.5L20 15v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>'),
  chat: I('<path d="M4 5h16v11H9l-5 4z"/>'),
  refresh: I('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: I('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  sort: I('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'),
  eye: I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: I('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  logout: I('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
  leaf: I('<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7"/>'),
  returnIcon: I('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  sparkle: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  pin: I('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  download: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4l3.3 2.6C7.2 7.7 9.4 6 12 6z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.5 2-3.6a4.3 4.3 0 0 0-3.4-1.8c-1.4-.2-2.8.8-3.5.8s-1.9-.8-3.1-.8a4.6 4.6 0 0 0-3.9 2.4c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.4 1.2-.1 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.2 2.9-2.3a10 10 0 0 0 1.3-2.7 4.2 4.2 0 0 1-2.7-3.9zM14 5.5a4 4 0 0 0 1-3c-1 .1-2.1.7-2.8 1.5a3.8 3.8 0 0 0-1 2.9c1.1 0 2.1-.6 2.8-1.4z"/></svg>',
  emptyChair: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="28" y="22" width="40" height="38" rx="14"/><rect x="22" y="52" width="52" height="14" rx="6"/><path d="M30 66l-4 16M66 66l4 16M20 86h56"/></svg>',
  emptyBox: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M14 32 48 18l34 14v34L48 80 14 66z"/><path d="M14 32l34 14 34-14M48 46v34M31 25l34 14"/></svg>',
  emptySearch: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="42" cy="42" r="24"/><path d="m60 60 18 18M34 42h16"/></svg>',
};
