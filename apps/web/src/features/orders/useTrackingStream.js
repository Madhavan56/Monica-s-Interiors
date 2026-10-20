import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { refreshSession } from '../../lib/api.js';
import { useSession } from '../../stores/session.js';
import { toast } from '../../stores/toasts.js';
import { STATUS_META } from '@mi/shared';

class FatalError extends Error {}
class RestartError extends Error {}

/**
 * Live tracking over SSE (architecture doc §6). fetch-event-source lets us send the
 * Bearer header (plain EventSource can't). Each message is written into the
 * ['tracking', orderNumber] cache, so the timeline re-renders and animates the new step.
 * Falls back to polling every 60s if the stream can't stay up.
 */
export function useTrackingStream(orderNumber, { onUpdate } = {}) {
  const qc = useQueryClient();
  const lastVersion = useRef(0);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const ctrl = new AbortController();
    let failures = 0;
    let poll;
    const key = ['tracking', orderNumber];

    const start = () => fetchEventSource(`/api/v1/orders/${orderNumber}/tracking/stream`, {
      signal: ctrl.signal,
      openWhenHidden: true,
      headers: {
        Authorization: `Bearer ${useSession.getState().accessToken}`,
        'X-Requested-With': 'fetch',
        ...(lastVersion.current && { 'Last-Event-ID': String(lastVersion.current) }),
      },
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) { failures = 0; return; }
        if (res.status === 401) {
          await refreshSession().catch(() => { throw new FatalError('signed out'); });
          throw new RestartError('token refreshed'); // headers are fixed per stream, so reopen with the new token
        }
        throw new FatalError(`stream failed ${res.status}`);
      },
      onmessage(msg) {
        if (msg.event !== 'tracking' || !msg.data) return;
        const view = JSON.parse(msg.data);
        const prev = qc.getQueryData(key);
        if (prev && view.version <= prev.version) return;
        qc.setQueryData(key, view);
        lastVersion.current = view.version;
        if (prev && prev.currentStatus !== view.currentStatus) {
          toast(`Update: ${STATUS_META[view.currentStatus].label}`, { type: 'info' });
          onUpdateRef.current?.(view);
        }
      },
      // The server ends streams on purpose (after ~50s on serverless hosts): reconnect.
      onclose() {
        throw new Error('stream ended');
      },
      onerror(err) {
        if (err instanceof FatalError || err instanceof RestartError) throw err;
        failures += 1;
        if (failures > 5) throw new FatalError('too many failures');
        return Math.min(30_000, 1000 * 2 ** failures); // backoff, then retry (a successful reopen resets it)
      },
    }).catch((err) => {
      if (ctrl.signal.aborted) return;
      if (err instanceof RestartError) { start(); return; }
      poll = setInterval(() => qc.invalidateQueries({ queryKey: key }), 60_000);
    });

    start();
    return () => { ctrl.abort(); clearInterval(poll); };
  }, [orderNumber, qc]);
}
