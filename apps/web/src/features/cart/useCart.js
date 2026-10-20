import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useSession } from '../../stores/session.js';
import { toast } from '../../stores/toasts.js';

export function useCart() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => api('/cart').then((r) => r.data),
    enabled: status === 'authenticated',
  });
}

export function useSetCartQty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, qty }) => api(`/cart/items/${productId}`, { method: 'PUT', body: { qty } }),
    onSuccess: ({ data }) => qc.setQueryData(['cart'], data),
    onError: (err) => toast(err.message, { type: 'error', duration: 5000 }),
  });
}

/** Add one of a product; guests are sent to sign in first. */
export function useAddToCart() {
  const qc = useQueryClient();
  const setQty = useSetCartQty();
  const navigate = useNavigate();
  const location = useLocation();
  return {
    isPending: setQty.isPending,
    add: async (product, { quiet } = {}) => {
      if (useSession.getState().status !== 'authenticated') {
        toast('Sign in to add pieces to your cart', { type: 'info' });
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return false;
      }
      const cart = qc.getQueryData(['cart']) ?? (await qc.fetchQuery({ queryKey: ['cart'], queryFn: () => api('/cart').then((r) => r.data) }));
      const current = cart?.items.find((i) => i.id === product.id)?.qty ?? 0;
      try {
        await setQty.mutateAsync({ productId: product.id, qty: current + 1 });
      } catch {
        return false; // error toast already shown by the mutation
      }
      if (!quiet) toast('Added to cart', { action: 'View cart', onAction: () => navigate('/checkout') });
      return true;
    },
  };
}
