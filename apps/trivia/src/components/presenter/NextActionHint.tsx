'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { NEXT_ACTION_HINTS } from '@/lib/presenter/next-action-hints';

/**
 * NextActionHint (T2.8)
 *
 * Context-sensitive single-line hint shown on the presenter page.
 * Cross-fades on scene change via AnimatePresence mode="wait".
 *
 * Visual style: monospace-ish font, subtle secondary foreground color.
 * Reads audienceScene directly from game store.
 */
export function NextActionHint() {
  const audienceScene = useGameStore((state) => state.audienceScene ?? 'waiting');
  const hint = NEXT_ACTION_HINTS[audienceScene];

  return (
    <div
      className="w-full"
      role="status"
      aria-live="polite"
      aria-label="Next action hint"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={audienceScene}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="text-foreground-secondary truncate"
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
          }}
        >
          {hint}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
