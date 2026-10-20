import { create } from 'zustand';

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
};
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } };

export const useUi = create((set, get) => ({
  theme: document.documentElement.dataset.theme || 'light',
  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    write('mi-theme', theme);
    set({ theme });
  },
  drawerOpen: false,
  setDrawer: (drawerOpen) => set({ drawerOpen }),
  density: read('mi-density', 3),
  setDensity: (density) => { write('mi-density', density); set({ density }); },
}));

/** Guest wishlist (design spec 4.4): kept locally, merged into the account on sign-in. */
export const useGuestWishlist = create((set, get) => ({
  ids: read('mi-guest-wishlist', []),
  toggle: (id) => {
    const ids = get().ids.includes(id) ? get().ids.filter((x) => x !== id) : [id, ...get().ids];
    write('mi-guest-wishlist', ids);
    set({ ids });
    return ids.includes(id);
  },
  clear: () => { write('mi-guest-wishlist', []); set({ ids: [] }); },
}));

export const recent = {
  get: () => read('mi-recent', []),
  push: (id) => write('mi-recent', [id, ...read('mi-recent', []).filter((x) => x !== id)].slice(0, 8)),
};
