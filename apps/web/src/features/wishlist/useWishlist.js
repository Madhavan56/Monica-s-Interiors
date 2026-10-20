import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../../lib/api.js';
import { useSession } from '../../stores/session.js';
import { useGuestWishlist } from '../../stores/ui.js';
import { toast } from '../../stores/toasts.js';

const isAuthed = () => useSession.getState().status === 'authenticated';

/** Full wishlist (signed in: from API; guest: product details for local ids). */
export function useWishlist() {
  const status = useSession((s) => s.status);
  const guestIds = useGuestWishlist((s) => s.ids);
  const authed = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api('/wishlist').then((r) => r.data),
    enabled: status === 'authenticated',
  });
  const guest = useQuery({
    queryKey: ['products', 'ids', guestIds],
    queryFn: () => api(`/products${qs({ ids: guestIds, limit: 48 })}`).then((r) => {
      const byId = new Map(r.data.map((p) => [p.id, p]));
      const items = guestIds.map((id) => byId.get(id)).filter(Boolean).map((p) => ({ ...p, priceDrop: 0 }));
      return { items, ids: items.map((p) => p.id), count: items.length };
    }),
    enabled: status === 'anonymous' && guestIds.length > 0,
    placeholderData: (prev) => prev,
  });
  if (status === 'anonymous') {
    return { ...guest, data: guestIds.length ? guest.data : { items: [], ids: [], count: 0 }, isLoading: guestIds.length > 0 && guest.isLoading, isGuest: true };
  }
  return { ...authed, isLoading: status === 'loading' || authed.isLoading, isGuest: false };
}

/** Just the saved ids, for hearts and the navbar badge. */
export function useWishlistIds() {
  const status = useSession((s) => s.status);
  const guestIds = useGuestWishlist((s) => s.ids);
  const { data } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api('/wishlist').then((r) => r.data),
    enabled: status === 'authenticated',
  });
  return new Set(status === 'authenticated' ? data?.ids ?? [] : guestIds);
}

/** Optimistic toggle with rollback (design spec 3.3). */
export function useToggleWishlist() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ product, save }) => api(`/wishlist/${product.id}`, { method: save ? 'PUT' : 'DELETE' }),
    onMutate: async ({ product, save }) => {
      await qc.cancelQueries({ queryKey: ['wishlist'] });
      const prev = qc.getQueryData(['wishlist']);
      qc.setQueryData(['wishlist'], (old) => {
        const base = old ?? { items: [], ids: [], count: 0 };
        const items = save ? [{ ...product, priceDrop: 0 }, ...base.items.filter((p) => p.id !== product.id)] : base.items.filter((p) => p.id !== product.id);
        return { items, ids: items.map((p) => p.id), count: items.length };
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(['wishlist'], ctx?.prev);
      toast(err.message || 'Couldn’t update your wishlist. Try again.', { type: 'error', duration: 5000 });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  return (product, save) => {
    if (isAuthed()) return mutation.mutate({ product, save });
    const guest = useGuestWishlist.getState();
    if (guest.ids.includes(product.id) !== save) guest.toggle(product.id);
    return undefined;
  };
}
