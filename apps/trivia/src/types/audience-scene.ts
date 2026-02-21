/**
 * Audience Scene Layer
 *
 * The AudienceScene type controls what the audience display renders.
 * It is orthogonal to GameStatus -- the 5-state engine is completely
 * unchanged. This layer sits on top as a pure visual routing layer.
 *
 * Design principle P5: "The AudienceScene layer is orthogonal to GameStatus."
 *
 * Authority: FINAL_SPEC.md + phase-5/01-types-scene-engine.md
 */

// =============================================================================
// AUDIENCE SCENE
// =============================================================================

/**
 * All 14 audience scene values.
 *
 * Scene validity by GameStatus:
 *   setup          -> waiting
 *   playing        -> game_intro, round_intro, question_anticipation,
 *                    question_reading, question_active, question_closed,
 *                    answer_reveal, score_flash,
 *                    waiting, paused, emergency_blank
 *   between_rounds -> round_summary, paused, emergency_blank
 *   paused         -> paused, emergency_blank
 *   ended          -> final_buildup, final_podium, paused, emergency_blank
 */
export type AudienceScene =
  /** Pre-game: breathing wordmark + room code + team roster grid. */
  | 'waiting'
  /** Game starting: "GET READY" scales in. 6s auto-advance. Skippable. */
  | 'game_intro'
  /** "ROUND N" + category + question count + standings (round 2+). 4s auto. */
  | 'round_intro'
  /** "QUESTION N" + category badge. 1.5s auto-advance. Skippable with D/Enter. */
  | 'question_anticipation'
  /** Question text + answer options. Timer NOT started. Indefinite. */
  | 'question_reading'
  /** Question text + answer options. Circular timer running in bottom-right. */
  | 'question_active'
  /** "TIME'S UP!" badge replaces timer. Question/options remain visible. Indefinite. */
  | 'question_closed'
  /** Per-question answer reveal with 5-beat choreography. 4s auto-advance to score_flash. */
  | 'answer_reveal'
  /** Compact scoreboard with score deltas ("+N this question"). 5s auto-advance. */
  | 'score_flash'
  /** Full scoreboard + round winner callout + score deltas. Indefinite. */
  | 'round_summary'
  /** "GAME OVER" scales in dramatically. 3s auto-advance. */
  | 'final_buildup'
  /** Staged 3rd -> 2nd -> 1st podium reveal. ~8s animation, then indefinite. */
  | 'final_podium'
  /** "Game Paused" overlay. Timer stopped. Restores to sceneBeforePause on resume. */
  | 'paused'
  /** Fully blank screen for emergency use. Restores to sceneBeforePause on restore. */
  | 'emergency_blank';

// =============================================================================
// REVEAL PHASE
// =============================================================================

/**
 * Sub-state controlling the 5-beat reveal choreography.
 *
 * Applies during the answer_reveal scene.
 *
 * SYNCED via TriviaGameState (not presenter-local). The audience display uses
 * this field in settled-state rendering for reconnect scenarios -- it does not
 * drive CSS animations (those play from mount). null means no reveal active.
 *
 * Timing reference (REVEAL_TIMING constants below):
 *   freeze       -> 0ms-300ms    : tension pause, vignette fades in
 *   dim_wrong    -> 300ms-600ms  : incorrect options dim to 32% opacity
 *   illuminate   -> 600ms-800ms  : correct option glows green, scale 1.06x
 *   score_update -> 800ms-1200ms : score deltas visible
 *   breathing    -> 1200ms+      : hold; presenter controls advance
 */
export type RevealPhase =
  | 'freeze'        // Beat 1: tension pause
  | 'dim_wrong'     // Beat 2: incorrect options dim
  | 'illuminate'    // Beat 3: correct answer glows + sound
  | 'score_update'  // Beat 4: score deltas visible
  | 'breathing'     // Beat 5: hold for audience reaction
  | null;           // No reveal in progress

// =============================================================================
// SCORE DELTA
// =============================================================================

/**
 * Score change for a single team at a scene transition.
 * Delta = points earned on the just-closed question.
 */
export interface ScoreDelta {
  /** Branded TeamId. */
  teamId: string;
  /** Team display name (snapshot at delta creation time). */
  teamName: string;
  /** Points earned (positive) or lost (negative). */
  delta: number;
  /** Absolute score after this delta. */
  newScore: number;
  /** Rank after this delta (1 = first). */
  newRank: number;
  /** Rank before this delta. */
  previousRank: number;
}

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

/**
 * Auto-advance durations for timed scenes (milliseconds).
 *
 * All timed scenes are skippable by the presenter. These are the
 * auto-advance durations when the presenter does not skip.
 */
export const SCENE_TIMING = {
  /** game_intro: "GET READY" -- 6 seconds */
  GAME_INTRO_MS: 6000,
  /** round_intro: "ROUND N" card -- 4 seconds (5 for final round) */
  ROUND_INTRO_MS: 4000,
  /** round_intro (final round variant): 5 seconds */
  ROUND_INTRO_FINAL_MS: 5000,
  /** question_anticipation: "QUESTION N" badge -- 1.5 seconds */
  QUESTION_ANTICIPATION_MS: 1500,
  /** answer_reveal (instant mode): auto-advance to score_flash -- 4 seconds */
  ANSWER_REVEAL_MS: 4000,
  /** score_flash (instant mode): auto-advance to next question -- 5 seconds */
  SCORE_FLASH_MS: 5000,
  /** final_buildup: "GAME OVER" -- 3 seconds */
  FINAL_BUILDUP_MS: 3000,
} as const;

/**
 * Reveal choreography timing (milliseconds from scene mount).
 *
 * Applies to the answer_reveal scene.
 * The audience CSS animation uses these as keyframe offsets.
 * The presenter's RevealPhase state advances at these intervals.
 */
export const REVEAL_TIMING = {
  /** Beat 1 starts: 0ms. Ends at DIM_WRONG_START_MS. */
  FREEZE_START_MS: 0,
  /** Beat 2 starts: incorrect options begin dimming. */
  DIM_WRONG_START_MS: 300,
  /** Beat 3 starts: correct option begins glowing. Sound fires here. */
  ILLUMINATE_START_MS: 600,
  /** Beat 4 starts: score deltas visible. */
  SCORE_UPDATE_START_MS: 800,
  /**
   * Lock expires: presenter can advance after this point.
   * Queued keypresses fire at this boundary.
   */
  POST_REVEAL_LOCK_MS: 1100,
  /** Beat 5 starts: breathing phase. Presenter holds as long as needed. */
  BREATHING_START_MS: 1200,
} as const;

// =============================================================================
// SCENE METADATA
// =============================================================================

/**
 * Set of scenes that auto-advance after a fixed duration.
 * The auto-advance hook consults this to know when to set a timer.
 * All timed scenes are skippable -- the timer is cancelled on skip.
 */
export const TIMED_SCENES = new Set<AudienceScene>([
  'game_intro',
  'round_intro',
  'question_anticipation',
  'answer_reveal',
  'score_flash',
  'final_buildup',
]);

/**
 * Valid audience scenes per GameStatus.
 * Used by deriveSceneFromStatus() to validate and reset invalid scenes.
 */
export const VALID_SCENES_BY_STATUS: Record<string, ReadonlySet<AudienceScene>> = {
  setup: new Set<AudienceScene>(['waiting']),
  playing: new Set<AudienceScene>([
    'game_intro', 'round_intro', 'question_anticipation',
    'question_reading', 'question_active', 'question_closed',
    'answer_reveal', 'score_flash',
    'waiting', 'paused', 'emergency_blank',
  ]),
  between_rounds: new Set<AudienceScene>([
    'round_summary', 'paused', 'emergency_blank',
  ]),
  paused: new Set<AudienceScene>(['paused', 'emergency_blank']),
  ended: new Set<AudienceScene>([
    'final_buildup', 'final_podium', 'paused', 'emergency_blank',
  ]),
};
