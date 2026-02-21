/**
 * Scene transition logic for the audience display layer.
 *
 * All functions are pure -- no store access, no side effects.
 * The store actions in game-store.ts call these to compute next state.
 *
 * Design principle P5: "The AudienceScene layer is orthogonal to GameStatus."
 * The 5-state engine is untouched. This module bridges GameStatus to AudienceScene.
 */

import type { TriviaGameState, GameStatus, AudienceScene } from '@/types';
import {
  SCENE_TIMING,
  TIMED_SCENES,
  VALID_SCENES_BY_STATUS,
} from '@/types/audience-scene';

// =============================================================================
// DERIVE SCENE FROM STATUS
// =============================================================================

/**
 * Fallback mapper: given a GameStatus, return the canonical default AudienceScene.
 *
 * Called when:
 *  1. A GameStatus transition invalidates the current audienceScene.
 *  2. A session is loaded from DB (audienceScene is not serialized).
 *  3. A REQUEST_SYNC is received with an unknown scene.
 */
export function deriveSceneFromStatus(
  status: GameStatus,
): AudienceScene {
  switch (status) {
    case 'setup':
      return 'waiting';
    case 'playing':
      return 'waiting';
    case 'between_rounds':
      return 'round_summary';
    case 'paused':
      return 'paused';
    case 'ended':
      return 'final_buildup';
    default: {
      // Exhaustiveness guard -- TypeScript ensures all GameStatus values handled.
      const _exhaustive: never = status;
      void _exhaustive;
      return 'waiting';
    }
  }
}

// =============================================================================
// SCENE VALIDATION
// =============================================================================

/**
 * Returns true if the given scene is valid for the given GameStatus.
 * Used to detect stale scenes after status transitions.
 */
export function isSceneValidForStatus(
  scene: AudienceScene,
  status: GameStatus
): boolean {
  const validSet = VALID_SCENES_BY_STATUS[status];
  return validSet ? validSet.has(scene) : false;
}

// =============================================================================
// SCENE TIMING
// =============================================================================

/**
 * Returns the auto-advance duration in milliseconds for a timed scene,
 * or null if the scene is not timed (indefinite).
 *
 * The `isFinalRound` parameter adjusts round_intro duration for the final round.
 */
export function getSceneDuration(
  scene: AudienceScene,
  isFinalRound = false
): number | null {
  switch (scene) {
    case 'game_intro':
      return SCENE_TIMING.GAME_INTRO_MS;
    case 'round_intro':
      return isFinalRound
        ? SCENE_TIMING.ROUND_INTRO_FINAL_MS
        : SCENE_TIMING.ROUND_INTRO_MS;
    case 'question_anticipation':
      return SCENE_TIMING.QUESTION_ANTICIPATION_MS;
    case 'answer_reveal':
      return SCENE_TIMING.ANSWER_REVEAL_MS;
    case 'score_flash':
      return SCENE_TIMING.SCORE_FLASH_MS;
    case 'final_buildup':
      return SCENE_TIMING.FINAL_BUILDUP_MS;
    default:
      return null; // Indefinite scene
  }
}

/**
 * Returns true if the given scene has a fixed auto-advance duration.
 */
export function isSceneTimed(scene: AudienceScene): boolean {
  return TIMED_SCENES.has(scene);
}

// =============================================================================
// SCENE STATE MACHINE
// =============================================================================

/**
 * Context bag for getNextScene(). Callers provide only the fields
 * relevant to the current transition.
 */
export interface SceneTransitionContext {
  /** True if this is the last question of the current round. */
  isLastQuestion?: boolean;
  /** True if this is the last round of the game. */
  isLastRound?: boolean;
}

/**
 * Scene state machine: given the current scene and a transition trigger,
 * returns the next scene.
 *
 * This function encodes the complete scene transition graph from the design.
 * It is the single source of truth for "what scene comes after X when Y happens."
 *
 * The `trigger` parameter is a string key representing the presenter action
 * or system event that caused the transition. The action semantics:
 *
 *   'auto'       -- timed auto-advance fired (timer expired)
 *   'skip'       -- presenter skipped a timed scene (Enter/Space/D)
 *   'timer_start'-- presenter pressed T to start timer
 *   'close'      -- presenter pressed S to close question / enter scoring
 *   'reveal'     -- presenter pressed A to reveal answer
 *   'advance'    -- presenter pressed Right Arrow / Enter
 *   'complete'   -- presenter pressed C to complete round (last question)
 *   'next_round' -- presenter pressed N (from round_summary)
 *   'pause'      -- presenter pressed P
 *   'resume'     -- presenter pressed P to resume
 *   'emergency'  -- presenter pressed E
 *   'restore'    -- presenter pressed E to restore from emergency blank
 *   'start_game' -- presenter started the game
 *   'end_game'   -- game ended
 *   'display_question' -- presenter set a display question (D key)
 *
 * Returns null if no valid transition exists for the (scene, trigger) pair.
 * The store action should treat null as a no-op.
 */
export function getNextScene(
  current: AudienceScene,
  trigger: string,
  context: SceneTransitionContext
): AudienceScene | null {
  const { isLastQuestion = false, isLastRound = false } = context;

  switch (current) {
    // -- Pre-game -----------------------------------------------------------
    case 'waiting':
      if (trigger === 'start_game') return 'game_intro';
      if (trigger === 'display_question') return 'question_anticipation';
      return null;

    // -- Game start ---------------------------------------------------------
    case 'game_intro':
      if (trigger === 'auto' || trigger === 'skip') return 'round_intro';
      return null;

    // -- Round start --------------------------------------------------------
    case 'round_intro':
      if (trigger === 'auto' || trigger === 'skip') return 'question_anticipation';
      return null;

    // -- Question lifecycle -------------------------------------------------
    case 'question_anticipation':
      if (trigger === 'auto' || trigger === 'skip') return 'question_reading';
      return null;

    case 'question_reading':
      if (trigger === 'timer_start') return 'question_active';
      if (trigger === 'close') return 'answer_reveal';
      if (trigger === 'reveal') return 'answer_reveal';
      return null;

    case 'question_active':
      if (trigger === 'auto' || trigger === 'close') return 'question_closed';
      return null;

    case 'question_closed':
      if (trigger === 'close') return 'answer_reveal';
      if (trigger === 'reveal') return 'answer_reveal';
      return null;

    // -- Answer reveal ------------------------------------------------------
    case 'answer_reveal':
      if (trigger === 'auto' || trigger === 'advance') return 'score_flash';
      return null;

    case 'score_flash':
      if (trigger === 'auto' || trigger === 'advance') {
        if (isLastQuestion) {
          return isLastRound ? 'final_buildup' : 'round_summary';
        }
        return 'question_anticipation';
      }
      if (trigger === 'complete' && isLastQuestion) {
        return isLastRound ? 'final_buildup' : 'round_summary';
      }
      return null;

    // -- Round summary ------------------------------------------------------
    case 'round_summary':
      if (trigger === 'next_round') {
        return isLastRound ? 'final_buildup' : 'round_intro';
      }
      return null;

    // -- Game end -----------------------------------------------------------
    case 'final_buildup':
      if (trigger === 'auto' || trigger === 'skip') return 'final_podium';
      return null;

    case 'final_podium':
      // Indefinite end state -- no auto-advance
      return null;

    // -- Pause / emergency --------------------------------------------------
    case 'paused':
      if (trigger === 'resume') {
        // Caller uses state.sceneBeforePause -- scene.ts returns a sentinel
        // The actual target is in sceneBeforePause; store action handles this
        return null; // Store action restores from sceneBeforePause directly
      }
      return null;

    case 'emergency_blank':
      if (trigger === 'restore') {
        // Same pattern as paused -- store action restores from sceneBeforePause
        return null;
      }
      return null;

    default: {
      const _exhaustive: never = current;
      void _exhaustive;
      return null;
    }
  }
}

// =============================================================================
// SCENE SETTER HELPER
// =============================================================================

/**
 * Returns a partial state update that correctly sets the audience scene
 * and records the timestamp. Used by store actions to build new state.
 */
export function buildSceneUpdate(scene: AudienceScene): {
  audienceScene: AudienceScene;
  sceneTimestamp: number;
} {
  return {
    audienceScene: scene,
    sceneTimestamp: Date.now(),
  };
}

/**
 * Returns a partial state update for entering pause or emergency_blank.
 * Saves the current scene to sceneBeforePause.
 */
export function buildPauseSceneUpdate(
  currentScene: AudienceScene,
  type: 'pause' | 'emergency'
): {
  audienceScene: AudienceScene;
  sceneBeforePause: AudienceScene;
  sceneTimestamp: number;
} {
  const targetScene: AudienceScene = type === 'emergency' ? 'emergency_blank' : 'paused';
  return {
    audienceScene: targetScene,
    sceneBeforePause: currentScene,
    sceneTimestamp: Date.now(),
  };
}

/**
 * Returns a partial state update for resuming from pause or emergency_blank.
 * Restores the scene from sceneBeforePause.
 * Falls back to deriveSceneFromStatus() if sceneBeforePause is null.
 */
export function buildResumeSceneUpdate(
  state: Pick<TriviaGameState, 'sceneBeforePause' | 'status'>
): {
  audienceScene: AudienceScene;
  sceneBeforePause: null;
  sceneTimestamp: number;
} {
  const scene = state.sceneBeforePause
    ?? deriveSceneFromStatus(state.status);
  return {
    audienceScene: scene,
    sceneBeforePause: null,
    sceneTimestamp: Date.now(),
  };
}
