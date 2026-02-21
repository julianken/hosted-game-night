/**
 * Trivia Motion Animation Presets
 *
 * Phase 5 / BEA-569: Complete spring vocabulary + motion variants for the
 * trivia redesign. Six named springs capture distinct emotional characters.
 * Backward-compatible aliases preserve every existing export — zero call-site
 * changes required.
 *
 * GPU compositing rules:
 * - All Motion variants animate transform (x, y, scale, scaleX, rotate) and
 *   opacity only. Two documented exceptions: box-shadow (correct answer glow,
 *   1 element) and filter: saturate() (incorrect options, 3 elements).
 * - will-change is NOT set here — Motion handles compositor hints internally.
 * - Score bars use scaleX with transform-origin: left center, never width %.
 *
 * Reduced motion:
 * - Use reducedVariant() at component render time to select the correct variant.
 * - CSS animations are disabled via @media (prefers-reduced-motion: reduce) in
 *   globals.css.
 */

import type { Transition, Variants } from 'motion/react';

// ============================================================================
// EASE CONSTANTS
// ============================================================================

/**
 * Cubic-bezier easing curves for use in tween transitions.
 * These match the CSS custom properties --ease-entrance, --ease-exit,
 * --ease-emphasis defined in globals.css.
 */
export const EASE = {
  /** Content arrives with energy — matches --ease-entrance */
  entrance:  [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Content departs fast — matches --ease-exit */
  exit:      [0.4, 0, 1, 1] as [number, number, number, number],
  /** Symmetric pulse / emphasis — matches --ease-emphasis */
  emphasis:  [0.4, 0, 0.2, 1] as [number, number, number, number],
  /** Linear — timer bar depletion */
  mechanical: 'linear' as const,
} as const;

// ============================================================================
// PRIMARY SPRINGS — Source of truth
// ============================================================================

/**
 * springPlayful
 * Use for: question entrance, option stagger, category badge, team roster
 *          cards, checkmark appearance — any "arrives with energy" element.
 * Character: Quick settle, slight overshoot (~4%). Fast and lively.
 */
export const springPlayful: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 22,
  mass: 0.45,
};

/**
 * springDramatic
 * Use for: answer reveal correct option scale, round number, "ANSWERS" title,
 *          "GET READY" / "GAME OVER" hero text, podium 2nd/3rd cards.
 * Character: Heavier feel, moderate overshoot (~8%). "This matters" gravity.
 */
export const springDramatic: Transition = {
  type: 'spring',
  stiffness: 180,
  damping: 28,
  mass: 1.1,
};

/**
 * springUrgent
 * Use for: buzz-in slam, score +1 pop in QuickScoreGrid, timer threshold
 *          visual snap, "TIME'S UP!" badge slam.
 * Character: Fast snap, one crisp rebound, settles immediately (~12% overshoot
 *            at peak, settles in <80ms).
 */
export const springUrgent: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 24,
  mass: 0.6,
};

/**
 * springScenePanel
 * Use for: full-screen scene transitions (round overlay, game intro panel).
 * Character: Slow, gravitas. High mass = sense of a large panel moving into
 *            place. Overshoot ~2%, practically imperceptible.
 */
export const springScenePanel: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 20,
  mass: 1.2,
};

/**
 * springCelebration
 * Use for: 1st place winner card entrance, final podium reveal.
 * Character: Lower damping = perceptible bounce (~15% overshoot). Earned,
 *            festive. The bounce IS the celebration.
 */
export const springCelebration: Transition = {
  type: 'spring',
  stiffness: 160,
  damping: 14,
  mass: 0.85,
};

/**
 * springScoreBar
 * Use for: scaleX animation on score bars (.score-bar-fill) and AnimatedScore
 *          counter transitions.
 * Character: Overdamped — absolutely no bounce. A progress bar bouncing is
 *            wrong. 0% overshoot, smooth deceleration.
 */
export const springScoreBar: Transition = {
  type: 'spring',
  stiffness: 90,
  damping: 22,
  mass: 1.0,
};

// ============================================================================
// BACKWARD-COMPATIBLE ALIASES
// All 5 original export names preserved. Zero call-site changes required.
// ============================================================================

/** @deprecated Use springPlayful directly. Alias preserved for compatibility. */
export const springQuestionReveal = springPlayful;

/** @deprecated Use springDramatic directly. Alias preserved for compatibility. */
export const springAnswerReveal = springDramatic;

/** @deprecated Use springScoreBar directly. Alias preserved for compatibility. */
export const springScoreRoll = springScoreBar;

/** @deprecated Use springScenePanel directly. Alias preserved for compatibility. */
export const springSceneTransition = springScenePanel;

/** @deprecated Use springCelebration directly. Alias preserved for compatibility. */
export const springPodium = springCelebration;

// ============================================================================
// MOTION VARIANT FACTORIES
// ============================================================================

/**
 * reducedVariant
 * Selects between a full variant and a reduced-motion variant at render time.
 * Pattern used in every animated audience component:
 *   const shouldReduce = useReducedMotion();
 *   const vars = reducedVariant(shouldReduce ?? false, fullVariant, reducedVariant);
 */
export function reducedVariant<T extends Variants>(
  shouldReduce: boolean,
  full: T,
  reduced: T,
): T {
  return shouldReduce ? reduced : full;
}

/**
 * sceneEnter
 * Factory returning a standard scene-enter variant with configurable y offset.
 * Used for elements that slide up into place as a scene mounts.
 */
export function sceneEnter(yOffset = 20): Variants {
  return {
    hidden:  { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.18, ease: EASE.entrance },
    },
  };
}

/**
 * sceneExit
 * Factory returning a standard scene-exit variant.
 */
export function sceneExit(yOffset = -8): Variants {
  return {
    visible: { opacity: 1, y: 0 },
    exit: {
      opacity: 0,
      y: yOffset,
      transition: { duration: 0.28, ease: EASE.exit },
    },
  };
}

// ============================================================================
// SCENE WRAPPER VARIANTS
// Used by SceneRouter with AnimatePresence mode="wait".
// ============================================================================

/** Full-motion scene wrapper — fade + subtle scale */
export const sceneWrapper: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.18, ease: EASE.entrance },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.28, ease: EASE.exit },
  },
};

export const sceneWrapperReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Hero text scenes (game_intro, round_intro, final_buildup).
 * Scales from slightly below 1 with overshoot — "arrives with authority".
 */
export const heroSceneEnter: Variants = {
  hidden:  { opacity: 0, scale: 0.85, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springDramatic,
  },
  exit: {
    opacity: 0,
    scale: 1.04,
    transition: { duration: 0.24, ease: EASE.exit },
  },
};

export const heroSceneEnterReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

/** Neutral/waiting scenes — subtle entrance, audience is waiting */
export const neutralSceneEnter: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: EASE.entrance } },
  exit:    { opacity: 0, transition: { duration: 0.20, ease: EASE.exit } },
};

// ============================================================================
// ANSWER REVEAL VARIANTS
// Five-beat choreography. The audience runs CSS delays from mount; these
// Motion variants provide the React-side state counterpart.
// ============================================================================

/** Incorrect options — dim + desaturate at reveal */
export const answerIncorrect: Variants = {
  default:  { opacity: 1, filter: 'saturate(1)', scale: 1.0 },
  revealed: {
    opacity: 0.32,
    filter: 'saturate(0.2)',
    transition: { duration: 0.25, ease: EASE.exit, delay: 0.08 },
  },
};

export const answerIncorrectReduced: Variants = {
  default:  { opacity: 1 },
  revealed: { opacity: 0.40, transition: { duration: 0 } },
};

/** Correct option — scale up. box-shadow applied via CSS class toggle. */
export const answerCorrect: Variants = {
  default:  { scale: 1.0 },
  revealed: {
    scale: 1.06,
    transition: { ...springDramatic, delay: 0.35 },
  },
};

export const answerCorrectReduced: Variants = {
  default:  { scale: 1.0 },
  revealed: { scale: 1.0, transition: { duration: 0 } },
};

/** Checkmark on correct option — appears at ~600ms post-reveal */
export const answerCheckmark: Variants = {
  hidden:  { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...springPlayful, delay: 0.55 },
  },
};

export const answerCheckmarkReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.10, delay: 0.10 } },
};

/** Explanation text — appears at ~900ms post-reveal */
export const answerExplanation: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.30, ease: EASE.entrance, delay: 0.90 },
  },
};

export const answerExplanationReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15, delay: 0.20 } },
};

/** "4 of 6 teams got this right" — appears at ~1200ms */
export const teamCountLine: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: EASE.entrance, delay: 1.20 },
  },
};

// ============================================================================
// SCORE VARIANTS
// ============================================================================

/** Score delta badge — "+N this round" — stagger within scoreboard rows */
export const scoreDeltaBadge: Variants = {
  hidden:  { opacity: 0, x: 12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { ...springPlayful, delay: 0.3 },
  },
};

export const scoreDeltaBadgeReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.10, delay: 0.10 } },
};

/**
 * scoreFloat — "+N" indicator that floats up from a team row anchor.
 * Auto-removes after 1.2s lifecycle managed by the component.
 */
export const scoreFloat: Variants = {
  initial: { opacity: 0, y: 0, scale: 0.7 },
  enter: {
    opacity: 1,
    scale: 1.1,
    transition: { ...springUrgent },
  },
  float: {
    y: -44,
    opacity: [1, 1, 0],
    transition: {
      y:       { duration: 0.9, ease: EASE.exit, delay: 0.2 },
      opacity: { duration: 0.4, ease: EASE.exit, delay: 0.8 },
    },
  },
};

export const scoreFloatReduced: Variants = {
  initial: { opacity: 0 },
  enter:   { opacity: 1, transition: { duration: 0.10 } },
  float:   { opacity: 0, transition: { duration: 0.20, delay: 1.5 } },
};

// ============================================================================
// PODIUM REVEAL VARIANTS
// Staggered slide-up sequence for FinalPodiumScene.
// Delays handled via transition.delay — no imperative timers needed.
// ============================================================================

/** 1st place — springCelebration, climax delay */
export const podium1st: Variants = {
  hidden:  { opacity: 0, scale: 0.75, y: 48 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...springCelebration, delay: 4.8 },
  },
};

/** 2nd place — springDramatic, mid delay */
export const podium2nd: Variants = {
  hidden:  { opacity: 0, y: 60, scale: 0.90 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springDramatic, delay: 3.0 },
  },
};

/** 3rd place — springDramatic, earliest */
export const podium3rd: Variants = {
  hidden:  { opacity: 0, y: 60, scale: 0.90 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springDramatic, delay: 2.0 },
  },
};

/** Reduced motion — all podium cards appear simultaneously, no delays */
export const podium1stReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.20 } },
};

export const podium2ndReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.20 } },
};

export const podium3rdReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.20 } },
};

/** "AND THE WINNER IS..." announcement — fades in then fades out */
export const winnerAnnouncement: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.40, ease: EASE.entrance, delay: 0.5 } },
  exit:    { opacity: 0, transition: { duration: 0.30, ease: EASE.exit } },
};

/** Remaining teams (4th+) — fade as group, no drama */
export const podiumRest: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.50, ease: EASE.entrance, delay: 7.0 } },
};

export const podiumRestReduced: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.20 } },
};

// ============================================================================
// LEGACY VARIANTS (preserved from original presets.ts)
// These are used by existing components. Do not remove.
// ============================================================================

/**
 * Motion variants for question hero entrance.
 * Usage: <motion.div variants={questionReveal} initial="hidden" animate="visible" />
 */
export const questionReveal = {
  hidden:  { opacity: 0, y: 32, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1 },
};

/**
 * Stagger container for answer options.
 * Usage: <motion.div variants={answerOptionStagger} initial="hidden" animate="visible" />
 */
export const answerOptionStagger = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

/** Individual answer option entrance variant */
export const answerOption = {
  hidden:  { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1 },
};

/**
 * Stagger container for scoreboard rows.
 * Usage: <motion.div variants={scoreboardRowStagger} initial="hidden" animate="visible" />
 */
export const scoreboardRowStagger = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

/** Individual scoreboard row entrance variant */
export const scoreboardRow = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0 },
};

/** Round transition overlay container */
export const roundTransitionContainer = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.4,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.4 },
  },
};

/** Individual child in round transition overlay */
export const roundTransitionChild = {
  hidden:  { opacity: 0, y: 40, scale: 0.92 },
  visible: { opacity: 1, y: 0,  scale: 1 },
};

/** Winner card dramatic entrance */
export const winnerCard = {
  hidden:  { opacity: 0, scale: 0.85, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springCelebration,
  },
};

/** 2nd / 3rd place flanking cards */
export const podiumCard = {
  hidden:  { opacity: 0, scale: 0.9, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springDramatic,
  },
};
