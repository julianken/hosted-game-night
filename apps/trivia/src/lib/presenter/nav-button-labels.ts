/**
 * nav-button-labels.ts
 *
 * Pure function that maps each AudienceScene to forward/back button label
 * strings. Null means the button is structurally disabled (no action exists).
 *
 * Designed for use by useNavButtonLabels hook — no React or Zustand imports.
 */

import type { AudienceScene } from '@/types/audience-scene';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Subset of DerivedTransitionContext plus recapShowingAnswer.
 * All context needed for context-dependent label decisions.
 */
export interface NavLabelContext {
  isLastQuestion: boolean;
  isLastRound: boolean;
  recapShowingAnswer: boolean | null;
}

/**
 * Forward and back button label strings.
 * null means the button is structurally disabled — no action exists.
 */
export interface NavButtonLabels {
  forward: string | null;
  back: string | null;
}

// =============================================================================
// LABEL LOOKUP
// =============================================================================

/**
 * Compute forward and back button labels for the current audience scene.
 *
 * Returns null for structurally disabled buttons (final_podium, paused,
 * emergency_blank forward; all non-recap back buttons).
 *
 * Transient disable (answer_reveal during revealPhase) is handled by the
 * hook layer — not here.
 */
export function getNavButtonLabels(
  scene: AudienceScene,
  ctx: NavLabelContext
): NavButtonLabels {
  const forward = getForwardLabel(scene, ctx);
  const back = getBackLabel(scene);
  return { forward, back };
}

function getForwardLabel(
  scene: AudienceScene,
  ctx: NavLabelContext
): string | null {
  const { isLastQuestion, isLastRound, recapShowingAnswer } = ctx;

  switch (scene) {
    case 'waiting':
      return 'Start Game';

    case 'game_intro':
    case 'round_intro':
      return 'Skip Intro';

    case 'question_anticipation':
    case 'final_buildup':
      return 'Skip';

    case 'question_display':
    case 'question_closed':
      return isLastQuestion ? 'End Round' : 'Next Question';

    case 'answer_reveal':
      if (!isLastQuestion) return 'Next Answer';
      if (!isLastRound) return 'Round Recap';
      return 'End Game';

    case 'round_summary':
      return 'Review Answers';

    case 'recap_title':
      return 'Start Review';

    case 'recap_qa':
      if (!recapShowingAnswer) return 'Show Answer';
      if (!isLastQuestion) return 'Next Question';
      return 'View Scores';

    case 'round_scoring':
      return 'View Scores';

    case 'recap_scores':
      return isLastRound ? 'End Game' : 'Next Round';

    case 'final_podium':
    case 'paused':
    case 'emergency_blank':
      return null;

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = scene;
      return _exhaustive;
    }
  }
}

function getBackLabel(scene: AudienceScene): string | null {
  switch (scene) {
    case 'recap_title':
      return 'Scores';
    case 'recap_qa':
      return 'Previous';
    case 'round_scoring':
      return 'Q&A Review';
    case 'recap_scores':
      return 'Q&A Review';
    default:
      return null;
  }
}
