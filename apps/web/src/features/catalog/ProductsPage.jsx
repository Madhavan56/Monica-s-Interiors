import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { CATEGORIES, COLORS, MATERIALS, ROOMS } from '@mi/shared';
import { api, qs } from '../../lib/api.js';
import { price } from '../../lib/format.js';
import { useDebouncedValue, useDelayedLoading } from '../../lib/hooks.js';
import { recent, useUi } from '../../stores/ui.js';
import { Button, EmptyState, Field, Icon, Modal, ProductSkeletons } from '../../components/ui/index.jsx';
import { ProductCard } from '../../components/commerce/ProductCard.jsx';
import { ProductDetail } from './ProductDetail.jsx';

const PAGE = 12;
const MAX = 12_000_000; // ₹1,20,000 in paise
const SORTS = [['featured', 'Featured'], ['newest', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['rating', 'Rating']];

/** Filter state lives in the URL so results are shareable and Back works (design spec 4.3). */
function useFilters() {
  const [params, setParams] = useSearchParams();
  const list = (k) => (params.get(k) ? params.get(k).split(',') : []);
  const filters = {
    category: params.get('category') || '',
    room: params.get('room') || '',
    material: list('material'),
    color: list('color'),
    maxPrice: Number(params.get('maxPrice')) || MAX,
    inStock: params.get('inStock') === 'true',
    q: params.get('q') || '',
    sort: params.get('sort') || 'featured',
  };
  const update = (patch) => {
    const next = { ...filters, ...patch };
    const p = new URLSearchParams();
    if (next.category) p.set('category', next.category);
    if (next.room) p.set('room', next.room);
    if (next.material.length) p.set('material', next.material.join(','));
    if (next.color.length) p.set('color', next.color.join(','));
    if (next.maxPrice < MAX) p.set('maxPrice', String(next.maxPrice));
    if (next.inStock) p.set('inStock', 'true');
    if (next.q) p.set('q', next.q);
    if (next.sort !== 'featured') p.set('sort', next.sort);
    setParams(p, { replace: true });
  };
  return [filters, update];
}

const apiQuery = (f) => ({ ...f, maxPrice: f.maxPrice < MAX ? f.maxPrice : undefined, inStock: f.inStock || undefined, sort: f.sort });

function Group({ title, open = true, children }) {
  return <details className="filter-group" open={open}><summary>{title}</summary>{children}</details>;
}

function FilterPanel({ f, set, idPrefix }) {
  const toggle = (key, value) => set({ [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] });
  return (
    <>
      <Group title="Price">
        <div className="pt-2">
          <label className="sr-only" htmlFor={`${idPrefix}max`}>Maximum price</label>
          <input
            className="range" type="range" id={`${idPrefix}max`} min={500_000} max={MAX} step={500_000} value={f.maxPrice}
            aria-valuetext={`Up to ${price(f.maxPrice)}`} onChange={(e) => set({ maxPrice: Number(e.target.value) })}
          />
          <div className="range-vals"><span>{price(500_000)}</span><span>Up to {price(f.maxPrice)}</span></div>
        </div>
      </Group>
      <Group title="Room">
        <div className="opts">
          {['', ...ROOMS].map((r) => (
            <label key={r || 'any'} className="check"><input type="radio" name={`${idPrefix}room`} checked={f.room === r} onChange={() => set({ room: r })} /> {r || 'Any room'}</label>
          ))}
        </div>
      </Group>
      <Group title="Material" open={false}>
        <div className="opts">{MATERIALS.map((m) => <label key={m} className="check"><input type="checkbox" checked={f.material.includes(m)} onChange={() => toggle('material', m)} /> {m}</label>)}</div>
      </Group>
      <Group title="Color">
        <div className="color-opts" role="group" aria-label="Colors">
          {Object.entries(COLORS).map(([k, c]) => (
            <button key={k} type="button" className="color-opt" style={{ background: c.hex }} aria-label={c.name} aria-pressed={f.color.includes(k)} onClick={() => toggle('color', k)} />
          ))}
        </div>
      </Group>
      <Group title="Availability">
        <div className="opts"><label className="check"><input type="checkbox" checked={f.inStock} onChange={(e) => set({ inStock: e.target.checked })} /> In stock only</label></div>
      </Group>
    </>
  );
}

const activeCount = (f) => (f.room ? 1 : 0) + f.material.length + f.color.length + (f.inStock ? 1 : 0) + (f.maxPrice < MAX ? 1 : 0);
const CLEARED = { room: '', material: [], color: [], inStock: false, maxPrice: MAX };

export default function ProductsPage() {
  const [f, set] = useFilters();
  const [params] = useSearchParams();
  const { density, setDensity } = useUi();
  const [search, setSearch] = useState(f.q);
  const debounced = useDebouncedValue(search, 250);
  const [sheet, setSheet] = useState(null); // 'filters' | 'sort'
  const [draft, setDraft] = useState(f);
  const [quick, setQuick] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => { if (debounced !== f.q) set({ q: debounced }); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (params.get('focus') === 'search') searchRef.current?.focus(); }, [params]);

  const query = useInfiniteQuery({
    queryKey: ['products', 'list', apiQuery(f)],
    queryFn: ({ pageParam }) => api(`/products${qs({ ...apiQuery(f), page: pageParam, limit: PAGE })}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page * last.meta.limit < last.meta.total ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const { showSkeleton } = useDelayedLoading(query.isLoading);
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);
  const total = query.data?.pages[0]?.meta.total ?? 0;

  const draftCount = useQuery({
    queryKey: ['products', 'count', apiQuery(draft)],
    queryFn: () => api(`/products${qs({ ...apiQuery(draft), limit: 1 })}`).then((r) => r.meta.total),
    enabled: sheet === 'filters',
    placeholderData: keepPreviousData,
  });

  const recentIds = recent.get();
  const recentQuery = useQuery({
    queryKey: ['products', 'ids', recentIds.slice(0, 4)],
    queryFn: () => api(`/products${qs({ ids: recentIds.slice(0, 4) })}`).then((r) => r.data),
    enabled: recentIds.length > 0,
  });

  const title = f.q ? `Results for “${f.q}”` : f.category || f.room || 'All pieces';
  useEffect(() => { document.title = `${f.category || f.room || 'Shop'} – Monica's Interiors`; }, [f.category, f.room]);

  const pills = [
    ...(f.room ? [['room', f.room, f.room]] : []),
    ...f.material.map((m) => ['material', m, m]),
    ...f.color.map((c) => ['color', c, COLORS[c]?.name ?? c]),
    ...(f.inStock ? [['inStock', '', 'In stock']] : []),
    ...(f.maxPrice < MAX ? [['maxPrice', '', `Under ${price(f.maxPrice)}`]] : []),
  ];
  const removePill = (k, v) => set(k === 'material' || k === 'color' ? { [k]: f[k].filter((x) => x !== v) } : { [k]: CLEARED[k] });
  const openQuick = (p) => { recent.push(p.id); setQuick(p); };

  return (
    <>
      <div className="container">
        <div className="page-head">
          <nav className="breadcrumb" aria-label="Breadcrumb"><ol><li><Link to="/">Home</Link></li><li aria-current="page">{f.category || f.room || 'Shop'}</li></ol></nav>
          <h1>{title}</h1>
          <p className="muted tnum" aria-live="polite">{query.isSuccess && `${total} piece${total === 1 ? '' : 's'}`}</p>
        </div>
      </div>

      <div className="chip-bar">
        <div className="container">
          <div className="chips" role="group" aria-label="Categories">
            {['', ...CATEGORIES].map((c) => (
              <button key={c || 'all'} type="button" className="chip" aria-pressed={f.category === c} onClick={() => set({ category: c })}>{c || 'All'}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="toolbar">
          <div className="mobile-tools">
            <Button onClick={() => { setDraft(f); setSheet('filters'); }}><Icon name="filter" size={18} /> Filter{activeCount(f) ? ` (${activeCount(f)})` : ''}</Button>
            <Button onClick={() => setSheet('sort')}><Icon name="sort" size={18} /> Sort</Button>
          </div>
          <div className="desktop-tools w-80">
            <Field ref={searchRef} label={null} aria-label="Search products" type="search" placeholder="Search sofas, oak, lamps…" leadingIcon="search" className="w-full [&_.input]:h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="tools desktop-tools">
            <label className="body-sm muted" htmlFor="sort">Sort</label>
            <select className="select !h-10 !w-auto" id="sort" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div role="group" aria-label="Grid density" className="flex gap-1">
              {[3, 4].map((d) => (
                <button key={d} type="button" className="icon-btn" aria-pressed={density === d} aria-label={`${d} columns`} onClick={() => setDensity(d)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" width="22" height="22">
                    {Array.from({ length: d }, (_, i) => <rect key={i} x={2 + i * (20 / d)} y="5" width={20 / d - 1.5} height="14" rx="1" />)}
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="shop-layout">
          <aside className="filters" aria-label="Filters"><FilterPanel f={f} set={set} idPrefix="d-" /></aside>
          <div>
            {pills.length > 0 && (
              <div className="active-filters">
                {pills.map(([k, v, l]) => (
                  <button key={k + v} type="button" className="chip removable" aria-label={`Remove filter ${l}`} onClick={() => removePill(k, v)}>{l} <Icon name="close" size={14} /></button>
                ))}
                <Button variant="tertiary" size="sm" onClick={() => set(CLEARED)}>Clear all</Button>
              </div>
            )}
            <div className={`product-grid ${density === 4 ? 'cols-4' : ''}`} aria-busy={query.isLoading || undefined}>
              {showSkeleton && <ProductSkeletons count={6} />}
              {!query.isLoading && !showSkeleton && items.map((p, i) => <ProductCard key={p.id} product={p} index={i % PAGE} onOpen={openQuick} priority={i < 3} />)}
              {query.isSuccess && !items.length && (
                <div className="col-span-full">
                  <EmptyState icon="emptySearch" title="No pieces match those filters" action={<Button variant="primary" onClick={() => { setSearch(''); set({ ...CLEARED, category: '', q: '' }); }}>Clear filters</Button>}>
                    Try removing a filter or widening the price range.
                  </EmptyState>
                </div>
              )}
              {query.isError && <div className="col-span-full"><EmptyState title="Couldn’t load pieces" action={<Button variant="primary" onClick={() => query.refetch()}>Try again</Button>}>{query.error.message}</EmptyState></div>}
            </div>
            {items.length > 0 && (
              <div className="results-foot">
                <p className="body-sm muted tnum">{query.hasNextPage ? `Showing ${items.length} of ${total}` : `Showing all ${total}`}</p>
                {query.hasNextPage && <Button loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more</Button>}
              </div>
            )}
          </div>
        </div>

        {recentQuery.data?.length > 0 && (
          <section className="section" aria-labelledby="recent-title">
            <div className="section-head"><h2 id="recent-title" className="!text-2xl">Recently viewed</h2></div>
            <div className="product-grid cols-4">{recentQuery.data.map((p, i) => <ProductCard key={p.id} product={p} index={i} onOpen={openQuick} />)}</div>
          </section>
        )}
      </div>

      <Modal
        open={sheet === 'filters'} onClose={() => setSheet(null)} title="Filters"
        footer={(<>
          <Button variant="tertiary" onClick={() => { set(CLEARED); setSheet(null); }}>Clear</Button>
          <Button variant="primary" onClick={() => { set(draft); setSheet(null); }}>Show {draftCount.data ?? '…'} results</Button>
        </>)}
      >
        <div className="sheet-filters"><FilterPanel f={draft} set={(patch) => setDraft((d) => ({ ...d, ...patch }))} idPrefix="m-" /></div>
      </Modal>

      <Modal open={sheet === 'sort'} onClose={() => setSheet(null)} title="Sort by">
        <div className="flex flex-col" role="radiogroup">
          {SORTS.map(([v, l]) => (
            <label key={v} className="check"><input type="radio" name="m-sort" checked={f.sort === v} onChange={() => { set({ sort: v }); setTimeout(() => setSheet(null), 150); }} /> {l}</label>
          ))}
        </div>
      </Modal>

      <Modal open={Boolean(quick)} onClose={() => setQuick(null)} title={quick?.name ?? ''} size={880}>
        {quick && (
          <>
            <ProductDetail product={quick} compact />
            <Link className="link-underline link-accent body-sm mt-4 inline-block" to={`/products/${quick.slug}`}>View full details</Link>
          </>
        )}
      </Modal>
    </>
  );
}
