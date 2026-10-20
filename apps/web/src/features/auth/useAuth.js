import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useSession } from '../../stores/session.js';
import { useGuestWishlist } from '../../stores/ui.js';

/** After any sign-in: merge guest wishlist, refresh user-scoped queries. */
async function afterSignIn(qc) {
  const guest = useGuestWishlist.getState();
  if (guest.ids.length) {
    try {
      await api('/wishlist/merge', { method: 'POST', body: { productIds: guest.ids } });
      guest.clear();
    } catch { /* keep guest ids; merge again next time */ }
  }
  await qc.invalidateQueries({ queryKey: ['wishlist'] });
  await qc.invalidateQueries({ queryKey: ['cart'] });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/auth/login', { method: 'POST', body }),
    onSuccess: async ({ data }) => {
      useSession.getState().setSession(data);
      await afterSignIn(qc);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/auth/register', { method: 'POST', body }),
    onSuccess: async ({ data }) => {
      useSession.getState().setSession(data);
      await afterSignIn(qc);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      useSession.getState().clear();
      qc.removeQueries({ queryKey: ['wishlist'] });
      qc.removeQueries({ queryKey: ['cart'] });
      qc.removeQueries({ queryKey: ['orders'] });
      qc.removeQueries({ queryKey: ['tracking'] });
    },
  });
}
