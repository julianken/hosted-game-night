'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { SCENE_TRIGGERS } from '@/lib/game/scene';
import { useNavButtonLabels } from '@/hooks/use-nav-button-labels';

/**
 * SceneNavButtons
 *
 * Always-visible ← → buttons. The → button is a "smart next step" that
 * walks through the entire game flow: start game → skip intros → show
 * question → close & advance to next question → ... → results → next
 * round → final podium.
 *
 * The ← button dispatches the BACK trigger for recap navigation.
 *
 * Forward is disabled during the reveal animation lock on answer_reveal.
 * Forward and back display contextual text labels that change per scene.
 * Visible text IS the accessible name when present (WCAG 2.5.3).
 * When disabled/icon-only, aria-label provides the fallback accessible name.
 */
export function SceneNavButtons() {
  const labels = useNavButtonLabels();

  const forwardDisabled = labels.forward === null || labels.forward.disabled;
  const backDisabled = labels.back === null;

  const handleForward = () => {
    const store = useGameStore.getState();
    const scene = store.audienceScene;

    switch (scene) {
      // Pre-game: start the game
      case 'waiting':
        store.startGame();
        break;

      // Timed scenes: skip to the next scene
      case 'game_intro':
      case 'round_intro':
      case 'question_anticipation':
      case 'final_buildup':
        store.advanceScene(SCENE_TRIGGERS.SKIP);
        break;

      // Question showing: close it and advance past question_closed in one step
      case 'question_display':
        if (store.timer.isRunning) store.stopTimer();
        store.advanceScene(SCENE_TRIGGERS.CLOSE);
        // State is now question_closed — advance again to next question or round_summary
        store.advanceScene(SCENE_TRIGGERS.CLOSE);
        break;

      // Question closed (if reached via S key): advance to next question or round_summary
      case 'question_closed':
        store.advanceScene(SCENE_TRIGGERS.CLOSE);
        break;

      // Results, recap, and answer review: advance through the flow
      case 'answer_reveal':
      case 'round_summary':
      case 'recap_title':
      case 'recap_qa':
      case 'recap_scores':
        store.advanceScene(SCENE_TRIGGERS.ADVANCE);
        break;

      // Terminal / overlay scenes: no-op
      case 'final_podium':
      case 'emergency_blank':
      case 'paused':
        break;
    }
  };

  const handleBack = () => {
    useGameStore.getState().advanceScene(SCENE_TRIGGERS.BACK);
  };

  return (
    <nav aria-label="Scene navigation" className="flex items-center gap-2">
      {/* Back button: icon on left, label text on right. Disabled + icon-only outside recap. */}
      <button
        type="button"
        onClick={handleBack}
        disabled={backDisabled}
        data-testid="nav-back"
        aria-label={backDisabled ? 'Back' : undefined}
        title="Back (Arrow Left)"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-2 rounded-lg px-3 py-2 bg-surface-elevated hover:bg-surface-hover text-foreground border border-border transition-colors focus-visible:outline-2 focus-visible:outline-primary/40 focus-visible:outline-offset-2 disabled:opacity-[0.38] disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <AnimatePresence mode="wait">
          {labels.back !== null && (
            <motion.span
              key={labels.back.text}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm font-medium whitespace-nowrap"
            >
              {labels.back.text}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Forward button: label text on left, icon on right. */}
      <button
        type="button"
        onClick={handleForward}
        disabled={forwardDisabled}
        data-testid="nav-forward"
        aria-label={forwardDisabled && labels.forward === null ? 'Forward' : undefined}
        title="Forward (Arrow Right)"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-2 rounded-lg px-3 py-2 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-[0.38] disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-primary/40 focus-visible:outline-offset-2"
      >
        <AnimatePresence mode="wait">
          {labels.forward !== null && (
            <motion.span
              key={labels.forward.text}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm font-medium whitespace-nowrap"
            >
              {labels.forward.text}
            </motion.span>
          )}
        </AnimatePresence>
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
