/**
 * T4.5: next-action-hints mapping table
 *
 * Extracted from components/presenter/NextActionHint.tsx for standalone use.
 * Maps all 16 AudienceScene values to one-liner presenter action hints.
 */

import type { AudienceScene } from '@/types/audience-scene';

/**
 * Context-sensitive presenter instructions for each audience scene.
 * Maps all 16 AudienceScene values to one-liner action hints.
 */
export const NEXT_ACTION_HINTS: Record<AudienceScene, string> = {
  waiting: 'Add teams and questions, then press Start Game',
  game_intro: 'Game intro is playing. Press Enter to begin Round 1.',
  round_intro: 'Round intro is playing. Press Enter to show the first question.',
  question_anticipation: 'Category is appearing on the audience display...',
  question_display: 'Press T to start timer, or S to close question.',
  question_closed: 'Score teams with 1-9, then S for next question.',
  round_summary: 'Round complete. Right Arrow to enter scores. N to skip to next round.',
  final_buildup: 'Final sequence playing. Press Enter to skip to podium.',
  final_podium: 'Winner displayed! Press R when ready for a new game.',
  paused: 'Game paused. Press P to resume.',
  emergency_blank: 'EMERGENCY: Display blanked. Press E to restore.',
  answer_reveal: 'Reviewing answers. Right Arrow for next answer. N for next round.',
  // Recap scenes (BEA-587)
  recap_title: 'Round recap starting. Right Arrow to continue.',
  recap_qa: 'Right Arrow to reveal answer. Left Arrow for previous. N for next round.',
  round_scoring: 'Enter scores and press Done. Right Arrow to review answers, Left Arrow to go back.',
  recap_scores: 'Recap scores displayed. Left Arrow to review Q&A. Right Arrow or N for next round.',
};
