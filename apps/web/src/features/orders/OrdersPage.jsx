import { Fragment, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../../lib/api.js';
import { fmtMonth } from '../../lib/format.js';
import { useDebouncedValue, useDelayedLoading } from '../../lib/hooks.js';
import { toast } from '../../stores/toasts.js';
import { Button, EmptyState, Field, Icon } from '../../components/ui/index.jsx';
import { OrderCard } from '../../components/commerce/OrderCard.jsx';
import { useState } from 'react';

const TABS = [['all', 'All'], ['progress', 'In progress'], ['delivered', 'Delivered'], ['closed', 'Cancelled / Returned']];

function OrderSkeleton() {
  return (
    <div className="order-card" aria-hidden="true">
      <div className="flex justify-between"><div className="skel line" style={{ width: 120, height: 16 }} /><div className="skel line" style={{ width: 80, height: 24, borderRadius: 12 }} /></div>
      <div className="skel line" style={{ width: '50%' }} />
      <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ width: 64, height: 64, borderRadius: 8 }} />)}</div>
      <div className="skel line" style={{ width: '40%' }} />
    </div>
  );
}

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'all';
  const range = params.get('range') || 'all';
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 250);
  const tabsRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', tab, range, q],
    queryFn: () => api(`/orders${qs({ status: tab, range, q })}`),
    placeholderData: keepPreviousData,
  });
  const { showSkeleton } = useDelayedLoading(isLoading);
  const orders = data?.data ?? [];
  const counts = data?.meta.counts ?? {};

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v === 'all') p.delete(k); else p.set(k, v);
    setParams(p, { replace: true });
  };

  const onTabKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = TABS.findIndex(([k]) => k === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length][0];
    setParam('tab', next);
    setTimeout(() => tabsRef.current?.querySelector(`[data-tab="${next}"]`)?.focus());
  };

  const buyAgain = async (order) => {
    try {
      const cart = await qc.fetchQuery({ queryKey: ['cart'], queryFn: () => api('/cart').then((r) => r.data) });
      let latest = cart;
      for (const item of order.items) {
        const current = latest.items.find((i) => i.id === item.productId)?.qty ?? 0;
        latest = (await api(`/cart/items/${item.productId}`, { method: 'PUT', body: { qty: Math.min(10, current + item.qty) } })).data;
      }
      qc.setQueryData(['cart'], latest);
      toast(`${order.itemCount} item${order.itemCount === 1 ? '' : 's'} added to cart`);
    } catch (e) {
      toast(e.message, { type: 'error', duration: 5000 });
    }
  };

  let month = '';
  return (
    <div className="container">
      <div className="title-row">
        <h1>Orders</h1>
        <div className="actions items-center">
          <Field aria-label="Search by order number or product" type="search" placeholder="Order number or product" leadingIcon="search" className="orders-search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="sr-only" htmlFor="range">Time range</label>
          <select id="range" className="select !h-12 !w-auto" value={range} onChange={(e) => setParam('range', e.target.value)}>
            <option value="all">All time</option><option value="30d">Last 30 days</option><option value="180d">Last 6 months</option><option value="2026">2026</option>
          </select>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Order status" ref={tabsRef} onKeyDown={onTabKey}>
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" data-tab={k} id={`tab-${k}`} aria-controls="orders-panel" aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} className="tab" onClick={() => setParam('tab', k)}>
            {l}<span className="count">{counts[k] ?? ''}</span>
          </button>
        ))}
      </div>

      <div className="orders-layout">
        <div role="tabpanel" id="orders-panel" aria-labelledby={`tab-${tab}`} className="order-list" aria-busy={isLoading || undefined}>
          {showSkeleton && [0, 1, 2].map((i) => <OrderSkeleton key={i} />)}
          {isError && <EmptyState title="Couldn’t load your orders" action={<Button variant="primary" onClick={() => refetch()}>Try again</Button>}>{error.message}</EmptyState>}
          {!isLoading && !isError && !orders.length && (
            q || range !== 'all' || tab !== 'all'
              ? <EmptyState icon="emptySearch" title="No orders match">Try another order number or time range.</EmptyState>
              : <EmptyState icon="emptyBox" title="No orders yet" action={<Button as={Link} to="/products" variant="primary">Start shopping</Button>}>When you order something, you’ll track it here.</EmptyState>
          )}
          {!isLoading && !showSkeleton && orders.map((o, i) => {
            const m = fmtMonth(o.placedAt);
            const label = m !== month ? <p className="overline month-label">{m}</p> : null;
            month = m;
            return <Fragment key={o.orderNumber}>{label}<OrderCard order={o} index={i} onBuyAgain={buyAgain} /></Fragment>;
          })}
        </div>
        <aside className="help-card" aria-labelledby="help-title">
          <h3 id="help-title" className="!text-xl">Need help?</h3>
          <p className="body-sm muted">Our care team replies within an hour, 9 AM to 9 PM, every day.</p>
          <a href="#chat" onClick={(e) => { e.preventDefault(); toast('Chat connects once support is set up', { type: 'info' }); }}><Icon name="chat" />Chat with us</a>
          <a href="tel:+918040002026"><Icon name="phone" />Call +91 80 4000 2026</a>
          <a href="#returns" onClick={(e) => { e.preventDefault(); toast('Returns are free within 30 days of delivery', { type: 'info' }); }}><Icon name="returnIcon" />Returns policy</a>
        </aside>
      </div>
    </div>
  );
}
