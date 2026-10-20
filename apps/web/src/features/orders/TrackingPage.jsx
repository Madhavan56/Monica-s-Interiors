import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CUSTOMER_CANCELLABLE, STATUS_META } from '@mi/shared';
import { api } from '../../lib/api.js';
import { price, fmtDate, fmtLong, fmtShort, fmtTime, isToday } from '../../lib/format.js';
import { useMediaQuery } from '../../lib/hooks.js';
import { toast } from '../../stores/toasts.js';
import { Button, EmptyState, Icon, Modal, SkeletonLines, StatusBadge } from '../../components/ui/index.jsx';
import { ProgressSteps, TrackingTimeline } from '../../components/commerce/TrackingTimeline.jsx';
import { ThumbArt } from '../../components/commerce/ProductArt.jsx';
import { useTrackingStream } from './useTrackingStream.js';

function heroTitle(t, order) {
  const s = t.currentStatus;
  if (s === 'delivered') return order.deliveredAt ? `Delivered ${fmtLong(order.deliveredAt)}` : 'Delivered';
  if (s === 'cancelled') return 'This order was cancelled';
  if (['returned', 'refunded', 'return_requested'].includes(s)) return STATUS_META[s].label;
  if (!t.eta) return 'Arrival date coming soon';
  if (s === 'delayed') return `Now arriving ${fmtLong(t.eta)}`;
  if (s === 'out_for_delivery' || isToday(t.eta)) return 'Arriving today';
  return `Arriving ${fmtLong(t.eta)}`;
}

function Panel({ title, children, collapsible }) {
  if (collapsible) {
    return (
      <details className="panel mobile-acc">
        <summary><h3 className="!m-0 flex items-center justify-between">{title}<span aria-hidden="true" className="faint">+</span></h3></summary>
        <div className="mt-4">{children}</div>
      </details>
    );
  }
  return <section className="panel" aria-label={title}><h3>{title}</h3>{children}</section>;
}

export default function TrackingPage() {
  const { orderNumber } = useParams();
  const qc = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [help, setHelp] = useState(false);
  const firstPaint = useRef(true);

  const order = useQuery({ queryKey: ['order', orderNumber], queryFn: () => api(`/orders/${orderNumber}`).then((r) => r.data) });
  const tracking = useQuery({ queryKey: ['tracking', orderNumber], queryFn: () => api(`/orders/${orderNumber}/tracking`).then((r) => r.data) });
  useTrackingStream(orderNumber, { onUpdate: () => { firstPaint.current = false; qc.invalidateQueries({ queryKey: ['order', orderNumber] }); qc.invalidateQueries({ queryKey: ['orders'] }); } });
  useEffect(() => { document.title = `Order #${orderNumber} – Monica's Interiors`; }, [orderNumber]);
  useEffect(() => { if (tracking.data) { const t = setTimeout(() => { firstPaint.current = false; }, 1500); return () => clearTimeout(t); } return undefined; }, [tracking.data]);

  const cancel = useMutation({
    mutationFn: () => api(`/orders/${orderNumber}/cancel`, { method: 'POST' }),
    onSuccess: ({ data }) => {
      qc.setQueryData(['tracking', orderNumber], data);
      qc.invalidateQueries({ queryKey: ['order', orderNumber] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setConfirmCancel(false);
      toast('Order cancelled. Refund started.');
    },
    onError: (e) => toast(e.message, { type: 'error', duration: 6000 }),
  });

  if (order.isError) {
    return (
      <div className="container">
        <EmptyState icon="emptyBox" title={`We couldn’t find order #${orderNumber}`} action={<Button as={Link} to="/orders" variant="primary">All orders</Button>}>
          Check the number in your confirmation email.
        </EmptyState>
      </div>
    );
  }
  if (!order.data || !tracking.data) {
    return <div className="container py-10"><SkeletonLines lines={4} /><div className="skel mt-8" style={{ height: 220, borderRadius: 24 }} /></div>;
  }

  const o = order.data;
  const t = tracking.data;
  const s = t.currentStatus;
  const closed = ['delivered', 'cancelled', 'returned', 'refunded', 'return_requested'].includes(s);
  const canCancel = CUSTOMER_CANCELLABLE.includes(s);

  const side = [
    ['Delivery address', (
      <>
        <p className="font-semibold">{o.shippingAddress.name}</p>
        <p className="muted body-sm mt-1">{o.shippingAddress.line1}{o.shippingAddress.line2 && <>, {o.shippingAddress.line2}</>}<br />{o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pincode}<br />{o.shippingAddress.phone}</p>
      </>
    )],
    ...(o.assemblySlot ? [['White-glove assembly', (
      <>
        <p className="body-sm flex items-center gap-1.5"><Icon name="sparkle" size={18} />Booked for <strong>{fmtShort(o.assemblySlot.start)}, {fmtTime(o.assemblySlot.start)} – {fmtTime(o.assemblySlot.end)}</strong></p>
        <p className="body-sm muted mt-1.5">Two technicians, about 45 minutes. Packaging taken away.</p>
      </>
    )]] : []),
    ['Payment summary', (
      <>
        <div className="summary-row"><span className="muted">Subtotal</span><span>{price(o.amounts.subtotal)}</span></div>
        <div className="summary-row"><span className="muted">Delivery</span><span>{o.amounts.delivery ? price(o.amounts.delivery) : 'Free'}</span></div>
        <div className="summary-row"><span className="muted">GST</span><span>Included</span></div>
        <div className="summary-row total"><span>Total</span><span>{price(o.amounts.total)}</span></div>
        <p className="caption faint mt-2">{o.payment.status === 'refunded' ? 'Refunded to your original payment method' : `Paid by ${o.payment.method} on ${fmtDate(o.payment.paidAt || o.placedAt)}`}</p>
      </>
    )],
  ];

  return (
    <div className="container pt-4">
      <Link className="back-link" to="/orders"><Icon name="chevronLeft" size={18} /> All orders</Link>
      <div className="track-head mt-2">
        <h1 className="tnum">Order #{o.orderNumber}</h1>
        <StatusBadge status={s} />
      </div>
      <p className="muted mt-1.5">Placed {fmtDate(o.placedAt)}</p>

      <section className="delivery-hero" aria-labelledby="eta">
        {s === 'delayed' && (
          <div className="banner" role="status">
            <Icon name="alert" />
            <div>
              <p className="font-semibold">Your delivery is running late</p>
              <p className="body-sm mt-0.5">{t.steps.find((x) => x.status === 'delayed' && x.state === 'current')?.note ?? 'The courier has reported a delay.'}</p>
              <Button size="sm" className="mt-3" onClick={() => toast('Rescheduling opens once the courier API is connected.', { type: 'info' })}>Reschedule delivery</Button>
            </div>
          </div>
        )}
        <h2 id="eta" aria-live="polite">{heroTitle(t, o)}</h2>
        {!closed && t.deliveryWindow && <p className="muted mt-1.5">Delivery window {t.deliveryWindow}</p>}
        {s !== 'cancelled' && <ProgressSteps steps={t.steps} currentStatus={s} />}
        {t.carrier && (
          <div className="carrier">
            <Icon name="truck" size={18} /><span>{t.carrier.name}</span>
            <button
              type="button" className="copy-btn" aria-label={`Copy tracking number ${t.carrier.trackingNumber}`}
              onClick={async () => { try { await navigator.clipboard.writeText(t.carrier.trackingNumber); toast('Tracking number copied'); } catch { toast('Couldn’t copy. Select the number instead.', { type: 'error', duration: 5000 }); } }}
            >
              {t.carrier.trackingNumber} <Icon name="copy" size={14} />
            </button>
          </div>
        )}
      </section>

      <div className="track-layout">
        <div>
          <section className="panel" aria-labelledby="hist">
            <h3 id="hist">Tracking history</h3>
            <TrackingTimeline steps={t.steps} animateIn={firstPaint.current} />
          </section>
          <section className="panel" aria-labelledby="items-h">
            <h3 id="items-h">Items ({o.itemCount})</h3>
            {o.items.map((i) => (
              <div key={i.productId} className="item-row">
                <ThumbArt item={i} className="thumb" />
                <div>
                  <Link className="font-semibold hover:underline" to={`/products/${i.slug}`}>{i.name}</Link>
                  <div className="body-sm muted">{i.material} · Qty {i.qty}</div>
                </div>
                <div className="tnum font-semibold">{price(i.lineTotal)}</div>
              </div>
            ))}
          </section>
          <div className="track-actions">
            <Button onClick={() => toast('Invoices download once billing is connected', { type: 'info' })}><Icon name="download" size={18} /> Download invoice</Button>
            {canCancel && <Button variant="tertiary" onClick={() => setConfirmCancel(true)}>Cancel order</Button>}
            <Button variant="tertiary" onClick={() => setHelp(true)}>Get help</Button>
          </div>
        </div>
        <aside aria-label="Order details">
          {side.map(([title, body]) => <Panel key={title} title={title} collapsible={isMobile}>{body}</Panel>)}
        </aside>
      </div>

      <Modal
        open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this order?"
        footer={(<>
          <Button onClick={() => setConfirmCancel(false)}>Keep order</Button>
          <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel order</Button>
        </>)}
      >
        <p className="muted">We’ll stop order #{o.orderNumber} and refund {price(o.amounts.total)} to your original payment method within 3–5 working days. This can’t be undone.</p>
      </Modal>

      <Modal open={help} onClose={() => setHelp(false)} title="How can we help?">
        <p className="muted mb-4">Order #{o.orderNumber}. Our care team replies within an hour, 9 AM to 9 PM.</p>
        <div className="flex flex-col gap-2">
          <Button block onClick={() => toast('Chat connects once support is set up', { type: 'info' })}><Icon name="chat" size={18} /> Chat with us</Button>
          <Button as="a" href="tel:+918040002026" block><Icon name="phone" size={18} /> Call +91 80 4000 2026</Button>
        </div>
      </Modal>
    </div>
  );
}
