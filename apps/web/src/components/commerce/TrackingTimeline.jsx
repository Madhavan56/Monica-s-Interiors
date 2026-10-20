import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MAIN_PATH, STATUS_META } from '@mi/shared';
import { fmtShort, fmtTime } from '../../lib/format.js';
import { dur, ease } from '../../lib/motion.js';
import { Icon } from '../ui/index.jsx';

/**
 * Vertical tracking timeline (design spec 3.6). On first paint the completed rail
 * fills top→bottom over 700ms and each completed node pops as the fill reaches it.
 * New steps arriving over SSE slide in.
 */
export function TrackingTimeline({ steps, animateIn = true }) {
  const reduce = useReducedMotion();
  const play = animateIn && !reduce;
  const segs = Math.max(1, steps.length - 1);
  const segDur = dur.slower / segs;

  return (
    <ol className="timeline" aria-label="Tracking history">
      <AnimatePresence initial={false}>
        {steps.map((s, i) => {
          const exception = s.kind === 'exception';
          const done = s.state === 'done';
          const current = s.state === 'current';
          const cls = `${s.state} ${exception ? 'exception' : ''}`;
          const nextDone = steps[i + 1] && steps[i + 1].state !== 'upcoming';
          return (
            <motion.li
              key={`${s.status}-${s.at ?? i}`}
              className={cls}
              aria-current={current ? 'step' : undefined}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur.moderate, ease: ease.out }}
              layout="position"
            >
              <motion.span
                className="node" aria-hidden="true"
                initial={play && done ? { scale: 0.6 } : false}
                animate={{ scale: 1 }}
                transition={{ duration: dur.base, ease: ease.spring, delay: play ? i * 0.12 : 0 }}
              >
                {done && !exception && <Icon name="check" size={14} />}
                {exception && '!'}
                {current && !reduce && (
                  <motion.span
                    className="absolute -inset-0.5 rounded-full"
                    style={{ background: exception ? 'var(--color-status-warning)' : 'var(--color-accent)' }}
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 2, ease: ease.out, repeat: 2, delay: play ? i * 0.12 : 0 }}
                  />
                )}
              </motion.span>
              {i < steps.length - 1 && (
                <span className="rail" aria-hidden="true" style={nextDone || done ? { opacity: 1, background: 'none' } : undefined}>
                  {(done || (current && nextDone)) && (
                    <motion.span
                      className="absolute inset-0 origin-top bg-primary"
                      initial={play ? { scaleY: 0 } : false}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: segDur, ease: ease.standard, delay: play ? i * segDur : 0 }}
                    />
                  )}
                </span>
              )}
              <div>
                <div className="step-title">
                  {s.label} <span className="sr-only">({exception ? 'exception' : s.state})</span>
                </div>
                {s.at ? (
                  <div className="step-time">{fmtShort(s.at)}, {fmtTime(s.at)}{s.location ? ` · ${s.location}` : ''}</div>
                ) : (
                  <div className="step-time">{s.expected ? `Expected ${fmtShort(s.expected)}` : 'Pending'}</div>
                )}
                {s.note && <div className="step-detail">{s.note}</div>}
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

/** Horizontal 6-dot progress (desktop) and single bar (mobile) for the delivery hero. */
export function ProgressSteps({ steps, currentStatus }) {
  const reduce = useReducedMotion();
  const main = steps.filter((s) => s.kind === 'main');
  const doneCount = main.filter((s) => s.state === 'done').length;
  const currentIdx = main.findIndex((s) => s.state === 'current');
  const reached = currentIdx >= 0 ? currentIdx : Math.max(0, doneCount - 1);
  const fill = reached / (MAIN_PATH.length - 1);
  const t = { duration: reduce ? 0 : dur.slower, ease: ease.standard, delay: reduce ? 0 : 0.15 };
  const stepNo = Math.min(reached + 1, MAIN_PATH.length);

  return (
    <>
      <div className="progress-steps play" aria-hidden="true">
        <div className="track"><motion.i style={{ transformOrigin: 'left', transition: 'none' }} initial={{ scaleX: 0 }} animate={{ scaleX: fill }} transition={t} /></div>
        {MAIN_PATH.map((status, i) => {
          const s = main.find((m) => m.status === status);
          return (
            <div key={status} className={`dot ${s?.state === 'done' ? 'done' : ''} ${s?.state === 'current' ? 'current' : ''}`}>
              <b /><span>{STATUS_META[status].step}</span>
            </div>
          );
        })}
      </div>
      <div className="progress-simple" aria-hidden="true">
        <div className="body-sm tnum"><strong>Step {stepNo} of {MAIN_PATH.length}</strong> · {STATUS_META[MAIN_PATH[reached]].step}{STATUS_META[currentStatus]?.exception ? ` · ${STATUS_META[currentStatus].label}` : ''}</div>
        <div className="bar"><motion.i style={{ transformOrigin: 'left', transition: 'none' }} initial={{ scaleX: 0 }} animate={{ scaleX: (reached + 1) / MAIN_PATH.length }} transition={t} /></div>
      </div>
    </>
  );
}
