'use client';

/**
 * ScoringPauseScene (T2.5.1)
 *
 * Re-exports QuestionTransitionScene as ScoringPauseScene.
 *
 * The scoring_pause and question_transition scenes render the same visual
 * component (the SVG progress ring with question count). The distinction
 * exists only in the state machine:
 *   - scoring_pause: Indefinite — presenter is scoring privately.
 *                    Does NOT auto-advance.
 *   - question_transition: Auto-advances after 1.5s.
 *
 * The audience display renders the same visual for both. Auto-advance
 * behavior is gated in the keyboard handler (useGameKeyboard) and the
 * useSceneAutoAdvance hook, not in the component itself.
 */
export { QuestionTransitionScene as ScoringPauseScene } from './QuestionTransitionScene';
