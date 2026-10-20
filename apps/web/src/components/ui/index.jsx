import { forwardRef, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { STATUS_META } from '@mi/shared';
import { useToasts } from '../../stores/toasts.js';
import { useMediaQuery } from '../../lib/hooks.js';
import { dur, ease } from '../../lib/motion.js';
import { Icon } from './Icon.jsx';
import { icons as ICONS_RAW } from '../../lib/art.js';

export { Icon };

// ---------- Button (design spec 3.7) ----------
const VARIANT = { primary: 'btn-primary', secondary: 'btn-secondary', tertiary: 'btn-tertiary', danger: 'btn-danger' };
const SIZE = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', block, loading, className = '', children, as: As = 'button', ...rest }, ref,
) {
  const cls = `btn ${VARIANT[variant]} ${SIZE[size]} ${block ? 'btn-block' : ''} ${className}`;
  return (
    <As ref={ref} className={cls} aria-busy={loading || undefined} {...(As === 'button' && { type: rest.type || 'button' })} {...rest}>
      {loading ? (<><span className="spinner" aria-hidden="true" /><span className="sr-only">Loading</span></>) : children}
    </As>
  );
});

export function IconButton({ icon, label, size = 22, className = '', children, ...rest }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} {...rest}>
      <Icon name={icon} size={size} />
      {children}
    </button>
  );
}

// ---------- Badges (design spec 3.5) ----------
export function Badge({ tone, dot, className = '', children }) {
  return <span className={`badge ${tone || ''} ${dot ? 'dot' : ''} ${className}`}>{children}</span>;
}
export function StatusBadge({ status }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

// ---------- Form field (design spec 3.8) ----------
export const Field = forwardRef(function Field({ label, error, helper, id, trailing, leadingIcon, className = '', ...input }, ref) {
  const auto = useId();
  const fid = id || auto;
  const describedBy = [error && `${fid}-error`, helper && `${fid}-help`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={fid}>{label}</label>}
      <div className="input-wrap">
        {leadingIcon && <Icon name={leadingIcon} className="leading" />}
        <input
          ref={ref} id={fid} className={`input ${trailing ? 'has-trailing' : ''} ${leadingIcon ? 'has-leading' : ''}`}
          aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...input}
        />
        {trailing && <span className="trailing">{trailing}</span>}
      </div>
      {error && <p className="field-error show" id={`${fid}-error`}><Icon name="alert" size={16} /><span>{error}</span></p>}
      {helper && <p className="helper" id={`${fid}-help`}>{helper}</p>}
    </div>
  );
});

// ---------- Modal / bottom sheet (design spec 3.9) ----------
export function Modal({ open, onClose, title, children, footer, size = 480 }) {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const titleId = useId();
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
    const trigger = document.activeElement;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => ref.current?.querySelector('[data-autofocus], h3')?.focus(), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !ref.current) return;
      const f = [...ref.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      root?.removeAttribute('inert');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      trigger?.focus?.();
    };
  }, [open, onClose]);

  const panel = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { opacity: 0, scale: reduce ? 1 : 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: reduce ? 1 : 0.96 } };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-scrim open" style={{ transition: 'none' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: dur.moderate, ease: ease.out } }}
          exit={{ opacity: 0, transition: { duration: dur.base, ease: ease.in } }}
        >
          <motion.div
            ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}
            className="modal" style={{ maxWidth: size, transition: 'none' }}
            {...panel}
            transition={{ duration: dur.moderate, ease: ease.out }}
            drag={isMobile ? 'y' : false} dragListener={false} dragControls={drag} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, info) => { if (info.offset.y > 100) onClose(); }}
          >
            <div className="sheet-handle" aria-hidden="true" style={{ touchAction: 'none' }} onPointerDown={(e) => drag.start(e)} />
            <div className="modal-head">
              <h3 id={titleId} tabIndex={-1}>{title}</h3>
              <IconButton icon="close" label="Close" onClick={onClose} />
            </div>
            <div>{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------- Toasts (design spec 3.10) ----------
function ToastItem({ t }) {
  const dismiss = useToasts((s) => s.dismiss);
  const timer = useRef();
  const remaining = useRef(t.duration ?? (t.type === 'error' ? 0 : t.action ? 6000 : 4000));
  const started = useRef(Date.now());
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const start = () => {
    if (!remaining.current) return;
    started.current = Date.now();
    timer.current = setTimeout(() => dismiss(t.id), remaining.current);
  };
  const pause = () => { clearTimeout(timer.current); remaining.current -= Date.now() - started.current; };
  useEffect(() => { start(); return () => clearTimeout(timer.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const offset = isDesktop ? { x: 16 } : { y: 16 };
  return (
    <motion.div
      layout className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : undefined}
      initial={{ opacity: 0, ...offset }} animate={{ opacity: 1, x: 0, y: 0, transition: { duration: dur.base, ease: ease.out } }}
      exit={{ opacity: 0, ...offset, transition: { duration: 0.16, ease: ease.in } }}
      onMouseEnter={pause} onMouseLeave={start} onFocus={pause} onBlur={start}
    >
      <Icon name={t.type === 'error' ? 'alert' : t.type === 'info' ? 'info' : 'checkCircle'} />
      <span className="msg">{t.message}</span>
      {t.action && <button type="button" className="btn btn-tertiary btn-sm" onClick={() => { t.onAction?.(); dismiss(t.id); }}>{t.action}</button>}
      <IconButton icon="close" label="Dismiss" size={16} onClick={() => dismiss(t.id)} />
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toast-region" role="status" aria-live="polite">
      <AnimatePresence initial={false}>{toasts.map((t) => <ToastItem key={t.id} t={t} />)}</AnimatePresence>
    </div>
  );
}

// ---------- Skeletons (design spec 3.11) ----------
export function ProductSkeletons({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skel-card" aria-hidden="true">
          <div className="skel img" />
          <div className="skel line" style={{ width: '40%' }} />
          <div className="skel line" style={{ width: '80%' }} />
          <div className="skel line" style={{ width: '30%' }} />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </>
  );
}

export function SkeletonLines({ lines = 3 }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => <div key={i} className="skel line" style={{ width: `${90 - i * 20}%` }} />)}
    </div>
  );
}

// ---------- Empty state ----------
export function EmptyState({ icon = 'emptyBox', title, children, action }) {
  return (
    <div className="empty">
      <span aria-hidden="true" className="text-ink-tertiary [&>svg]:h-24 [&>svg]:w-24" dangerouslySetInnerHTML={{ __html: ICONS_RAW[icon] }} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
