// Motion tokens from the design spec §5, as Framer Motion values.
export const ease = {
  standard: [0.2, 0, 0, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
  spring: [0.34, 1.56, 0.64, 1],
};
export const dur = { instant: 0.1, fast: 0.15, base: 0.22, moderate: 0.32, slow: 0.48, slower: 0.7 };

export const page = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.moderate, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: ease.in } },
};

/** Card reveal on scroll: 24px rise + fade, 60ms stagger capped at 6. */
export const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: dur.slow, ease: ease.out, delay: Math.min(i, 5) * 0.06 },
});
