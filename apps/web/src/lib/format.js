export { formatINR as price } from '@mi/shared';

const TZ = 'Asia/Kolkata';
const fmt = (opts) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts });

export const fmtDate = (d) => fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
export const fmtShort = (d) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d));
export const fmtLong = (d) => fmt({ weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(d));
export const fmtMonth = (d) => fmt({ month: 'long', year: 'numeric' }).format(new Date(d));
export const fmtTime = (d) => fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d)).toUpperCase();
export const isToday = (d) => fmt({ dateStyle: 'short' }).format(new Date(d)) === fmt({ dateStyle: 'short' }).format(new Date());
