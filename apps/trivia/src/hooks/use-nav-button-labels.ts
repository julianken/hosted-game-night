/**
 * useNavButtonLabels
 *
 * Connects getNavButtonLabels() to Zustand game state.
 *
 * Uses a single useShallow selector to subscribe to only the fields
 * that affect label computation: audienceScene, revealPhase,
 * recapShowingAnswer, isLastQuestion, isLastRound.
 *
 * Adds transient disable: forward is disabled when revealPhase !== null
 * and audienceScene === 'answer_reveal' (reveal animation lock, 1.1s).
 */

import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/stores/game-store';
import { deriveTransitionContext } from '@/lib/game/scene-transitions';
import { getNavButtonLabels } from '@/lib/presenter/nav-button-labels';

// =============================================================================
// RETURN TYPE
// =============================================================================

export interface NavButtonState {
  text: string;
  disabled: boolean;
}

export interface NavButtonLabelsResult {
  /** Forward button state. null means structurally disabled (no action exists). */
  forward: NavButtonState | null;
  /** Back button state. null means structurally disabled (no back action exists). */
  back: NavButtonState | null;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Returns display state for the SceneNavButtons forward and back buttons.
 *
 * - forward.text changes per scene
 * - forward.disabled is true when structurally disabled (null) OR during reveal lock
 *   OR during round_scoring when scores have not been submitted yet (submission gate)
 * - back is null (disabled, icon-only) outside recap scenes
 * - back.text is set in recap scenes (recap_title, recap_qa, recap_scores)
 *
 * Do NOT subscribe to timer state here — no label depends on timer.
 */
export function useNavButtonLabels(): NavButtonLabelsResult {
  const { audienceScene, revealPhase, recapShowingAnswer, isLastQuestion, isLastRound, roundScoringSubmitted } =
    useGameStore(
      useShallow((state) => {
        const ctx = deriveTransitionContext(state);
        return {
          audienceScene: state.audienceScene,
          revealPhase: state.revealPhase,
          recapShowingAnswer: state.recapShowingAnswer,
          isLastQuestion: ctx.isLastQuestion,
          isLastRound: ctx.isLastRound,
          roundScoringSubmitted: state.roundScoringSubmitted,
        };
      })
    );

  const labels = getNavButtonLabels(audienceScene, {
    isLastQuestion,
    isLastRound,
    recapShowingAnswer,
  });

  // Transient disable: reveal animation lock on answer_reveal (1.1s)
  const isRevealLocked = revealPhase !== null && audienceScene === 'answer_reveal';

  // Submission gate: forward is disabled during round_scoring until scores submitted
  const isSubmissionGated = audienceScene === 'round_scoring' && !roundScoringSubmitted;

  const forward: NavButtonLabelsResult['forward'] =
    labels.forward === null
      ? null
      : {
          text: labels.forward,
          disabled: isRevealLocked || isSubmissionGated,
        };

  const back: NavButtonLabelsResult['back'] =
    labels.back === null
      ? null
      : {
          text: labels.back,
          disabled: false,
        };

  return { forward, back };
}
