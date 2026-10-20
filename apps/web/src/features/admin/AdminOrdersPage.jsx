import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { STATUS_META, TRANSITIONS } from '@mi/shared';
import { api } from '../../lib/api.js';
import { price, fmtDate } from '../../lib/format.js';
import { toast } from '../../stores/toasts.js';
import { Button, SkeletonLines, StatusBadge } from '../../components/ui/index.jsx';

/** Staff view: move orders along the state machine (only valid next statuses are offered). */
export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'orders'], queryFn: () => api('/admin/orders').then((r) => r.data), refetchInterval: 15_000 });
  const [notes, setNotes] = useState({});

  const update = useMutation({
    mutationFn: ({ orderNumber, status, version }) => api(`/admin/orders/${orderNumber}/status`, {
      method: 'POST', body: { status, note: notes[orderNumber] || undefined, expectedVersion: version },
    }),
    onSuccess: (_r, v) => {
      toast(`#${v.orderNumber} → ${STATUS_META[v.status].label}`);
      setNotes((n) => ({ ...n, [v.orderNumber]: '' }));
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (e) => { toast(e.message, { type: 'error', duration: 6000 }); qc.invalidateQueries({ queryKey: ['admin', 'orders'] }); },
  });

  return (
    <div className="container">
      <div className="title-row">
        <div><h1>Manage orders</h1><p className="muted mt-1.5">Status changes push live to the customer’s tracking page.</p></div>
      </div>
      {isLoading ? <SkeletonLines lines={6} /> : (
        <div className="flex flex-col gap-3">
          {data.map((o) => (
            <div key={o.orderNumber} className="order-card">
              <div className="oc-head">
                <div>
                  <Link to={`/orders/${o.orderNumber}`} className="tnum font-semibold hover:underline">#{o.orderNumber}</Link>
                  <p className="meta">{o.customer?.name} · {fmtDate(o.placedAt)} · {o.itemCount} items · {price(o.amounts.total)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              {TRANSITIONS[o.status].length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="input !h-9 max-w-xs" placeholder="Note for the customer (optional)" aria-label={`Note for order ${o.orderNumber}`}
                    value={notes[o.orderNumber] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [o.orderNumber]: e.target.value }))}
                  />
                  {TRANSITIONS[o.status].map((s) => (
                    <Button key={s} size="sm" variant={s === 'cancelled' ? 'tertiary' : 'secondary'} loading={update.isPending && update.variables?.orderNumber === o.orderNumber && update.variables?.status === s}
                      onClick={() => update.mutate({ orderNumber: o.orderNumber, status: s, version: o.version })}>
                      → {STATUS_META[s].label === 'Processing' ? STATUS_META[s].step : STATUS_META[s].label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
