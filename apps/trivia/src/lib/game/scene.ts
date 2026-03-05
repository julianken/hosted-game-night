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
// SCENE TRIGGERS
// =============================================================================

/**
 * Canonical trigger strings for scene transitions.
 *
 * These are the only valid trigger values that advanceScene() and
 * getNextScene() accept. Keyboard handlers, auto-advance timers,
 * and store actions all use these constants instead of ad-hoc strings.
 */
export const SCENE_TRIGGERS = {
  AUTO: 'auto',
  SKIP: 'skip',
  CLOSE: 'close',
  REVEAL: 'reveal',
  ADVANCE: 'advance',
  BACK: 'back',
  NEXT_ROUND: 'next_round',
  START_GAME: 'start_game',
  DISPLAY_QUESTION: 'display_question',
} as const;

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
 *   'back'       -- presenter pressed Left Arrow (recap backward navigation)
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
      if (trigger === 'auto' || trigger === 'skip') return 'question_display';
      return null;

    case 'question_display':
      if (trigger === 'close') return 'question_closed';
      if (trigger === 'auto') return 'question_closed'; // timer expired
      // Advance skips question_closed entirely (nav button shortcut)
      if (trigger === 'advance') {
        return isLastQuestion ? 'round_summary' : 'question_anticipation';
      }
      return null;

    case 'question_closed':
      // Pub trivia: host reads answers aloud, no per-question reveal on screen.
      // S/advance goes directly to next question or round_summary (last Q).
      if (trigger === 'close' || trigger === 'advance') {
        if (isLastQuestion) {
          return 'round_summary';
        }
        return 'question_anticipation';
      }
      return null;

    // -- Answer review (round-end only) ------------------------------------
    // Only reachable from round_summary. Presenter cycles through each
    // question's answer. Store handles advancing displayQuestionIndex.
    case 'answer_reveal':
      if (trigger === 'advance' || trigger === 'skip') {
        // Last question reviewed → move to next round or game end
        if (isLastQuestion) {
          return isLastRound ? 'final_buildup' : 'round_intro';
        }
        // Not last question: store handles cycling (returns null here)
        return null;
      }
      // N key: skip remaining answers and go to next round
      if (trigger === 'next_round') {
        return isLastRound ? 'final_buildup' : 'round_intro';
      }
      return null;

    // -- Round summary (scoring wait screen) --------------------------------
    case 'round_summary':
      // Right Arrow: start recap flow
      if (trigger === 'advance') return 'recap_title';
      // N key: skip recap, go directly to next round
      if (trigger === 'next_round') {
        return isLastRound ? 'final_buildup' : 'round_intro';
      }
      return null;

    // -- Recap flow (between-rounds answer review) -------------------------
    case 'recap_title':
      // Left Arrow: back to round summary
      if (trigger === 'back') return 'round_summary';
      // Right Arrow: begin Q/A review
      if (trigger === 'advance') return 'recap_qa';
      // N key: skip recap entirely, go to next round
      if (trigger === 'next_round') {
        return isLastRound ? 'final_buildup' : 'round_intro';
      }
      return null;

    case 'recap_qa':
      // Right Arrow / skip: advance to round_scoring (facilitator enters per-team round scores)
      if (trigger === 'advance' || trigger === 'skip') return 'round_scoring';
      // N key: skip remaining recap, go to next round
      if (trigger === 'next_round') {
        return isLastRound ? 'final_buildup' : 'round_intro';
      }
      return null;

    case 'round_scoring':
      // Right Arrow / advance / Enter (skip): proceed to recap_scores (show updated leaderboard)
      if (trigger === 'advance' || trigger === 'skip') return 'recap_scores';
      // N key: skip scores display, go directly to next round
      if (trigger === 'next_round') {
        return isLastRound ? 'final_buildup' : 'round_intro';
      }
      return null;

    case 'recap_scores':
      // Left Arrow: back to Q/A review
      if (trigger === 'back') return 'recap_qa';
      // Right Arrow / Enter / N: proceed to next round
      if (trigger === 'advance' || trigger === 'next_round') {
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

    // -- Emergency blank (visual-only, no game status change) ----------------
    case 'paused':
      // Legacy scene value — should not be reached but handle gracefully
      return null;

    case 'emergency_blank':
      // Restore handled by store action directly (reads sceneBeforePause)
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
 * Returns a partial state update for entering emergency_blank.
 * Saves the current scene to sceneBeforePause for restoration.
 */
export function buildEmergencyBlankUpdate(
  currentScene: AudienceScene
): {
  audienceScene: AudienceScene;
  sceneBeforePause: AudienceScene;
  sceneTimestamp: number;
} {
  return {
    audienceScene: 'emergency_blank',
    sceneBeforePause: currentScene,
    sceneTimestamp: Date.now(),
  };
}

/**
 * Returns a partial state update for restoring from emergency_blank.
 * Restores the scene from sceneBeforePause.
 * Falls back to deriveSceneFromStatus() if sceneBeforePause is null.
 */
export function buildEmergencyRestoreUpdate(
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
