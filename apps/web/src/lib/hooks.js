import { useEffect, useState } from 'react';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export function useDebouncedValue(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Show a skeleton only if loading lasts > 300ms, then keep it ≥ 400ms (design spec 3.11). */
export function useDelayedLoading(loading) {
  const [show, setShow] = useState(false);
  const [shownAt, setShownAt] = useState(0);
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => { setShow(true); setShownAt(Date.now()); }, 300);
      return () => clearTimeout(t);
    }
    if (!show) return undefined;
    const t = setTimeout(() => setShow(false), Math.max(0, 400 - (Date.now() - shownAt)));
    return () => clearTimeout(t);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps
  return { showSkeleton: show, ready: !loading && !show };
}
