/**
 * T4.5: next-action-hints mapping table
 *
 * Extracted from components/presenter/NextActionHint.tsx for standalone use.
 * Maps all 19 AudienceScene values to one-liner presenter action hints.
 */

import type { AudienceScene } from '@/types/audience-scene';

/**
 * Context-sensitive presenter instructions for each audience scene.
 * Maps all 19 AudienceScene values to one-liner action hints.
 */
export const NEXT_ACTION_HINTS: Record<AudienceScene, string> = {
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
