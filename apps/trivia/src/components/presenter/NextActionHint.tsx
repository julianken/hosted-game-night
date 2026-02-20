'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import type { AudienceScene } from '@/types/audience-scene';

/**
 * Context-sensitive presenter instructions for each audience scene.
 * Maps all 19 AudienceScene values to one-liner action hints.
 */
const NEXT_ACTION_HINTS: Record<AudienceScene, string> = {
  waiting: 'Add teams and questions, then press Start Game',
  game_intro: 'Game intro is playing. Press Enter to begin Round 1.',
  round_intro: 'Round intro is playing. Press Enter to show the first question.',
  question_anticipation: 'Category is appearing on the audience display...',
  question_reading: 'Question is on screen. Press T to start timer, or S to score.',
  question_active: 'Timer running. Score teams with 1-9. Press S to close.',
  question_closed: "Time's up! Score remaining teams, then press S to close.",
  scoring_pause: 'Score teams with 1-9. Right Arrow for next Q, or C to complete round.',
  question_transition: 'Next question loading...',
  round_reveal_intro: 'Reveal ceremony starting. Press Enter to skip intro.',
  round_reveal_question: 'Press Enter to reveal the answer.',
  round_reveal_answer: 'Right Arrow for next question. Escape to skip to scores.',
  round_summary: 'Round complete! Press N for next round.',
  final_buildup: 'Final sequence playing. Press Enter to skip to podium.',
  final_podium: 'Winner displayed! Press R when ready for a new game.',
  paused: 'Game paused. Press P to resume.',
  emergency_blank: 'EMERGENCY: Display blanked. Press E to restore.',
  answer_reveal: 'Answer revealed. Press S for scores, or Right Arrow for next.',
  score_flash: 'Scores showing. Right Arrow for next question, C to complete round.',
};

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
  const audienceScene = useGameStore((state) => state.audienceScene);
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
