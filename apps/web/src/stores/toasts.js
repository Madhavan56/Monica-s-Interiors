import { create } from 'zustand';

let nextId = 1;

export const useToasts = create((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, type: 'success', ...t }].slice(-3) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** toast('Saved', { type, action, onAction, duration }) */
export const toast = (message, opts = {}) => useToasts.getState().push({ message, ...opts });
