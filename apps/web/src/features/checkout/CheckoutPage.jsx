import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { addressSchema } from '@mi/shared';
import { api } from '../../lib/api.js';
import { price } from '../../lib/format.js';
import { useSession } from '../../stores/session.js';
import { toast } from '../../stores/toasts.js';
import { Button, EmptyState, Field, Icon, SkeletonLines } from '../../components/ui/index.jsx';
import { ThumbArt } from '../../components/commerce/ProductArt.jsx';
import { useCart, useSetCartQty } from '../cart/useCart.js';

/** Cart review + address + demo payment. Real payments (Razorpay) plug in at "Place order". */
export default function CheckoutPage() {
  const user = useSession((s) => s.user);
  const { data: cart, isLoading } = useCart();
  const setQty = useSetCartQty();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [assembly, setAssembly] = useState(true);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const saved = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema), mode: 'onBlur',
    defaultValues: saved ? { name: saved.name, line1: saved.line1, line2: saved.line2, city: saved.city, state: saved.state, pincode: saved.pincode, phone: saved.phone } : { name: user?.name ?? '' },
  });

  const place = useMutation({
    mutationFn: (address) => api('/orders/checkout', { method: 'POST', body: { address, assembly }, headers: { 'Idempotency-Key': idempotencyKey } }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast(`Order #${data.orderNumber} placed. Watch it move live.`);
      navigate(`/orders/${data.orderNumber}`);
    },
    onError: (e) => toast(e.message, { type: 'error', duration: 6000 }),
  });

  if (isLoading) return <div className="container py-10"><SkeletonLines lines={5} /></div>;
  if (!cart?.items.length) {
    return (
      <div className="container">
        <EmptyState icon="emptyBox" title="Your cart is empty" action={<Button as={Link} to="/products" variant="primary">Browse pieces</Button>}>
          Add a piece with “Quick add” or from its page.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="title-row"><h1>Checkout</h1></div>
      <div className="track-layout">
        <form id="checkout" noValidate onSubmit={handleSubmit((address) => place.mutate(address))} className="flex flex-col gap-4">
          <section className="panel" aria-labelledby="addr-h">
            <h3 id="addr-h">Delivery address</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" autoComplete="name" error={errors.name?.message} className="sm:col-span-2" {...register('name')} />
              <Field label="Street address" autoComplete="address-line1" error={errors.line1?.message} className="sm:col-span-2" {...register('line1')} />
              <Field label="Area / landmark (optional)" autoComplete="address-line2" className="sm:col-span-2" {...register('line2')} />
              <Field label="City" autoComplete="address-level2" error={errors.city?.message} {...register('city')} />
              <Field label="State" autoComplete="address-level1" error={errors.state?.message} {...register('state')} />
              <Field label="PIN code" inputMode="numeric" autoComplete="postal-code" error={errors.pincode?.message} {...register('pincode')} />
              <Field label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
            </div>
          </section>
          <section className="panel" aria-labelledby="extras-h">
            <h3 id="extras-h">Delivery options</h3>
            <label className="check"><input type="checkbox" checked={assembly} onChange={(e) => setAssembly(e.target.checked)} /> White-glove assembly (free, about 45 minutes)</label>
            <p className="body-sm muted mt-2 flex items-start gap-2"><Icon name="info" size={18} />Payment is simulated in this build. After you place the order, it moves through each status every 20 seconds so you can watch live tracking.</p>
          </section>
        </form>

        <aside aria-label="Order summary">
          <section className="panel">
            <h3>Your order ({cart.count})</h3>
            <AnimatePresence initial={false}>
              {cart.items.map((i) => (
                <motion.div key={i.id} layout exit={{ opacity: 0, height: 0 }} className="item-row !grid-cols-[64px_1fr_auto]">
                  <ThumbArt item={i} className="thumb" />
                  <div>
                    <div className="body-sm font-semibold">{i.name}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <button type="button" className="icon-btn !h-8 !w-8 border border-line-strong" aria-label={`Decrease ${i.name}`} onClick={() => setQty.mutate({ productId: i.id, qty: i.qty - 1 })}>−</button>
                      <span className="tnum w-6 text-center" aria-live="polite">{i.qty}</span>
                      <button type="button" className="icon-btn !h-8 !w-8 border border-line-strong" aria-label={`Increase ${i.name}`} onClick={() => setQty.mutate({ productId: i.id, qty: i.qty + 1 })} disabled={i.qty >= Math.min(10, i.stock)}>+</button>
                    </div>
                  </div>
                  <div className="tnum body-sm font-semibold">{price(i.lineTotal)}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="summary-row mt-2"><span className="muted">Subtotal</span><span>{price(cart.amounts.subtotal)}</span></div>
            <div className="summary-row"><span className="muted">Delivery</span><span>{cart.amounts.delivery ? price(cart.amounts.delivery) : 'Free'}</span></div>
            <div className="summary-row"><span className="muted">GST</span><span>Included</span></div>
            <div className="summary-row total"><span>Total</span><span>{price(cart.amounts.total)}</span></div>
            <Button type="submit" form="checkout" variant="primary" size="lg" block className="mt-4" loading={place.isPending}>Place order · {price(cart.amounts.total)}</Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
