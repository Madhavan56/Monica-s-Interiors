// Fetch wrapper: Bearer token from memory, one shared silent refresh on TOKEN_EXPIRED (architecture doc §3).
import { useSession } from '../stores/session.js';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || 'Something went wrong. Try again.');
    this.status = status;
    this.code = body?.error?.code || (status === 0 ? 'NETWORK' : 'UNKNOWN');
    this.fields = body?.error?.fields;
    this.requestId = body?.error?.requestId;
  }
}

const BASE = '/api/v1';
let refreshing = null;

/** Rotate the refresh cookie and get a new access token. Concurrent callers share one request. */
export function refreshSession() {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'fetch' } })
    .then(async (res) => {
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        useSession.getState().clear();
        throw new ApiError(res.status, body);
      }
      if (!body?.data) {
        useSession.getState().clear(); // no saved session: signed-out visitor
        throw new ApiError(401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } });
      }
      useSession.getState().setSession(body.data);
      return body.data;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function api(path, { method = 'GET', body, headers = {}, signal, retry = true } = {}) {
  const token = useSession.getState().accessToken;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, signal, credentials: 'include',
      headers: {
        'X-Requested-With': 'fetch',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, { error: { message: 'You seem to be offline. Check your connection and try again.' } });
  }
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new ApiError(res.status, json);
    if (err.code === 'TOKEN_EXPIRED' && retry) {
      await refreshSession();
      return api(path, { method, body, headers, signal, retry: false });
    }
    throw err;
  }
  return json;
}

/** Query-string helper that drops empty values. */
export const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return;
    p.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};
