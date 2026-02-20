'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGame } from './use-game';
import { useFullscreen } from './use-fullscreen';
import { useGameStore } from '@/stores/game-store';
import { useAudienceScene } from './use-audience-scene';
import type { AudienceScene } from '@/types/audience-scene';
import { REVEAL_TIMING } from '@/types/audience-scene';
import { useQuickScore } from './use-quick-score';

/**
 * Keyboard shortcut hook for trivia game controls.
 *
 * Navigation:
 * - ArrowUp/ArrowDown = Navigate questions
 *
 * Answer reveal:
 * - Space = Peek answer (toggle, local only - original behavior preserved)
 *
 * Game controls:
 * - P = Pause/Resume game (scene-aware: sets/restores audienceScene)
 * - E = Emergency pause (blanks display, scene-aware)
 * - R = Reset game (double-press required — T2.5.7)
 * - N = Next round (when in between_rounds state AND scene is round_summary)
 *
 * Display:
 * - D = Toggle display (show/hide question on audience)
 * - T = Toggle scoreboard on audience display
 * - F = Toggle fullscreen
 *
 * Audio:
 * - M = Mute/unmute TTS
 *
 * Scene-aware shortcuts (T1.12):
 * - T key (KeyT, no modifier): Start timer — NOT toggle. Transitions to question_active.
 * - S key: Context-dependent scene transitions.
 * - Enter: Skip timed scenes and ceremony advance.
 *
 * Quick Score shortcuts (T2.4):
 * - 1-9 (Digit1-Digit9): During scoring phases, toggle score for team N.
 *   1 = team at index 0, 9 = team at index 8.
 * - 0 (Digit0): During scoring phases, toggle score for team at index 9.
 * - Shift+1-9: During scoring phases, remove a point from team N.
 * - Ctrl/Cmd+Z: Undo last score action.
 *
 * Scoring phase scenes (when 1-9 keys are active):
 * - scoring_pause (batch mode)
 * - question_closed (both modes)
 * - answer_reveal (instant mode)
 * - score_flash (instant mode)
 * - round_reveal_question (batch ceremony)
 * - round_reveal_answer (batch ceremony)
 *
 * Batch ceremony shortcuts (T2.5.6):
 * - C: Complete round / start ceremony (scoring_pause + last Q in batch, or score_flash in instant)
 * - Right Arrow: Context-dependent advancement (scoring_pause -> next Q, ceremony advance)
 * - Left Arrow: Ceremony retreat (round_reveal_answer -> question, round_reveal_question -> prev)
 * - Escape: Abort ceremony -> round_summary
 *
 * Reset confirmation (T2.5.7):
 * - R (first press): Show "Press R again to reset" warning
 * - R (second press within 2s): Execute reset
 *
 * Help:
 * - ? = Show help modal
 */

/** Scenes that trigger the POST_REVEAL_LOCK */
const REVEAL_LOCK_SCENES: ReadonlySet<AudienceScene> = new Set([
  'answer_reveal',
  'round_reveal_answer',
]);

/** Keys blocked during the reveal lock (advancement keys only) */
const LOCKED_KEY_CODES: ReadonlySet<string> = new Set([
  'Enter',
  'ArrowRight',
  'Space',
]);

/**
 * Scenes where 1-9/0 quick-score keys and Shift+digit/-score keys are active.
 */
const SCORING_PHASE_SCENES: ReadonlySet<AudienceScene> = new Set([
  'scoring_pause',
  'question_closed',
  'answer_reveal',
  'score_flash',
  'round_reveal_question',
  'round_reveal_answer',
]);

/**
 * Map from event.code (Digit1-Digit9, Digit0) to team index (0-based).
 * Digit1 -> 0, Digit2 -> 1, ..., Digit9 -> 8, Digit0 -> 9.
 */
const DIGIT_TO_TEAM_INDEX: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Digit8: 7,
  Digit9: 8,
  Digit0: 9,
};

/** Duration for R key double-press confirmation window (ms) */
const RESET_CONFIRM_MS = 2000;

export function useGameKeyboard() {
  const game = useGame();
  const fullscreen = useFullscreen();
  const [peekAnswer, setPeekAnswer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // R key double-press state (T2.5.7)
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetConfirmRef = useRef(false);
  const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick score — keyed by selectedQuestionIndex so it resets per question
  const quickScore = useQuickScore(game.selectedQuestionIndex);

  // POST_REVEAL_LOCK: prevents premature advancement during reveal animation
  const isLockedRef = useRef(false);
  const pendingKeyRef = useRef<string | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useAudienceScene for the presenter — gives us timeRemaining for auto-advance
  const audienceSceneControls = useAudienceScene({ role: 'presenter' });

  // Toggle scoreboard visibility
  const toggleScoreboard = useCallback(() => {
    const state = useGameStore.getState();
    useGameStore.setState({ showScoreboard: !state.showScoreboard });
  }, []);

  // Toggle TTS
  const toggleTTS = useCallback(() => {
    const state = useGameStore.getState();
    useGameStore.setState({ ttsEnabled: !state.ttsEnabled });
  }, []);

  // POST_REVEAL_LOCK: Start lock when entering a reveal scene, clear after POST_REVEAL_LOCK_MS.
  // Queued keypresses are replayed by dispatching a synthetic keydown event.
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      const scene = state.audienceScene;
      const prevScene = prevState.audienceScene;
      if (scene !== prevScene && REVEAL_LOCK_SCENES.has(scene)) {
        // Entering a reveal scene: engage lock
        isLockedRef.current = true;
        pendingKeyRef.current = null;

        // Clear any existing timer
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

        lockTimerRef.current = setTimeout(() => {
          isLockedRef.current = false;
          // Replay queued keypress
          const pending = pendingKeyRef.current;
          pendingKeyRef.current = null;
          if (pending) {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: pending, bubbles: true }));
          }
        }, REVEAL_TIMING.POST_REVEAL_LOCK_MS);
      }
    });

    return () => {
      unsub();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  // Auto-advance: when timeRemaining reaches 0, fire the appropriate next-scene transition.
  // useAudienceScene sets timeRemaining to 0 when the timer expires. We watch for that
  // and call the keyboard handler logic for the corresponding scene.
  useEffect(() => {
    const { timeRemaining, scene } = audienceSceneControls;
    if (timeRemaining !== 0) return;

    // timeRemaining hit 0 — auto-advance this scene
    const store = useGameStore.getState();

    switch (scene) {
      case 'game_intro':
        store.setAudienceScene('round_intro');
        break;
      case 'round_intro':
        store.setAudienceScene('question_anticipation');
        break;
      case 'question_anticipation':
        store.setAudienceScene('question_reading');
        break;
      case 'round_reveal_intro':
        store.advanceCeremony();
        break;
      case 'question_transition':
        store.setAudienceScene('question_anticipation');
        break;
      case 'answer_reveal':
        store.setAudienceScene('score_flash');
        break;
      case 'score_flash':
        store.setAudienceScene('question_reading');
        break;
      case 'final_buildup':
        store.setAudienceScene('final_podium');
        break;
      default:
        break;
    }
  // Only re-run when timeRemaining transitions to 0
  }, [audienceSceneControls.timeRemaining]); // intentional: only watch timeRemaining

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // POST_REVEAL_LOCK: Queue advancement keys during reveal animation
      if (isLockedRef.current && LOCKED_KEY_CODES.has(event.code)) {
        event.preventDefault();
        pendingKeyRef.current = event.code;
        return;
      }

      // Read current scene at event time (avoids stale closure)
      const currentScene: AudienceScene = useGameStore.getState().audienceScene;
      const store = useGameStore.getState();

      // -- Quick score: 1-9 / 0 digit keys (T2.4) --
      // Handle before the main switch so digit keys don't fall through
      if (event.code in DIGIT_TO_TEAM_INDEX) {
        // During scoring phases: toggle or remove team score
        if (SCORING_PHASE_SCENES.has(currentScene)) {
          const teamIndex = DIGIT_TO_TEAM_INDEX[event.code];
          const teams = useGameStore.getState().teams;
          const team = teams[teamIndex];

          if (team) {
            if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
              // Shift+Digit: remove a point from team N (direct -1, no toggle tracking)
              event.preventDefault();
              store.adjustTeamScore(team.id, -1);
            } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
              // Plain digit: toggle score for team N
              event.preventDefault();
              quickScore.toggleTeam(team.id);
            }
          }
          return;
        }
        // Outside scoring phase — fall through to allow digit keys for other uses
      }

      switch (event.code) {
        // Navigation
        case 'ArrowUp':
          event.preventDefault();
          if (game.selectedQuestionIndex > 0) {
            game.selectQuestion(game.selectedQuestionIndex - 1);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (game.selectedQuestionIndex < game.questions.length - 1) {
            game.selectQuestion(game.selectedQuestionIndex + 1);
          }
          break;

        // Right Arrow — context-dependent advancement (T2.5.6)
        case 'ArrowRight': {
          event.preventDefault();
          switch (currentScene) {
            case 'scoring_pause': {
              // Check if this is the last question of the round by computing from store state
              const roundQs = store.questions.filter(
                (q) => q.roundIndex === store.currentRound
              );
              const displayIdx = store.displayQuestionIndex;
              const currentRoundQIndex = displayIdx !== null
                ? roundQs.findIndex((q) => store.questions.indexOf(q) === displayIdx)
                : -1;
              const isLast = currentRoundQIndex >= 0 && currentRoundQIndex >= roundQs.length - 1;

              if (isLast) {
                // Last Q of round in batch: C key should be used instead, but Right Arrow also works
                // Advance to ceremony (same as C key)
                store.startRevealCeremony();
              } else {
                // Move to next question via question_transition
                store.setAudienceScene('question_transition');
              }
              break;
            }

            case 'question_transition':
              // Skip the transition and go directly to question_anticipation
              store.setAudienceScene('question_anticipation');
              break;

            case 'round_reveal_answer':
              // Advance ceremony (next Q or end ceremony)
              store.advanceCeremony();
              break;

            case 'answer_reveal':
              // Instant mode: advance to next question anticipation
              store.setAudienceScene('question_anticipation');
              break;

            case 'score_flash': {
              // Instant mode: check if last question of round
              const roundQs = store.questions.filter(
                (q) => q.roundIndex === store.currentRound
              );
              const displayIdx = store.displayQuestionIndex;
              const currentRoundQIndex = displayIdx !== null
                ? roundQs.findIndex((q) => store.questions.indexOf(q) === displayIdx)
                : -1;
              const isLastInRound = currentRoundQIndex >= 0 && currentRoundQIndex >= roundQs.length - 1;

              if (!isLastInRound) {
                store.setAudienceScene('question_anticipation');
              }
              // If last question, do nothing (N key advances to next round)
              break;
            }

            default:
              break;
          }
          break;
        }

        // Left Arrow — ceremony retreat (T2.5.6)
        case 'ArrowLeft': {
          event.preventDefault();
          switch (currentScene) {
            case 'round_reveal_answer':
            case 'round_reveal_question':
              store.retreatCeremony();
              break;
            default:
              break;
          }
          break;
        }

        // Escape — abort ceremony (T2.5.6)
        case 'Escape': {
          switch (currentScene) {
            case 'round_reveal_question':
            case 'round_reveal_answer':
              event.preventDefault();
              store.abortCeremony();
              break;
            default:
              break;
          }
          break;
        }

        // Peek answer (local only)
        case 'Space':
          event.preventDefault();
          setPeekAnswer((prev) => !prev);
          break;

        // Toggle display question on audience
        case 'KeyD':
          if (game.displayQuestionIndex === game.selectedQuestionIndex) {
            // Currently showing this question, hide it
            game.setDisplayQuestion(null);
          } else {
            // Show the selected question
            game.setDisplayQuestion(game.selectedQuestionIndex);
          }
          break;

        // Pause/Resume game — scene-aware
        case 'KeyP':
          if (game.canPause) {
            game.pauseGame();
            store.setAudienceScene('paused');
          } else if (game.canResume) {
            game.resumeGame();
            // Restore previous scene on resume (sceneBeforePause is set by engine)
            const sceneBeforePause = useGameStore.getState().sceneBeforePause;
            if (sceneBeforePause) {
              store.setAudienceScene(sceneBeforePause);
            } else {
              store.setAudienceScene('waiting');
            }
          }
          break;

        // Emergency pause - blanks audience display — scene-aware
        case 'KeyE':
          if (game.canPause || game.canResume) {
            game.emergencyPause();
            store.setAudienceScene('emergency_blank');
          }
          break;

        // Reset game — double-press confirmation (T2.5.7)
        case 'KeyR':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (resetConfirmRef.current) {
              // Second press within 2s — execute reset
              if (resetConfirmTimerRef.current) {
                clearTimeout(resetConfirmTimerRef.current);
                resetConfirmTimerRef.current = null;
              }
              resetConfirmRef.current = false;
              setShowResetConfirm(false);
              game.resetGame();
              setPeekAnswer(false);
              store.setAudienceScene('waiting');
            } else {
              // First press — request confirmation
              resetConfirmRef.current = true;
              setShowResetConfirm(true);

              resetConfirmTimerRef.current = setTimeout(() => {
                resetConfirmRef.current = false;
                setShowResetConfirm(false);
                resetConfirmTimerRef.current = null;
              }, RESET_CONFIRM_MS);
            }
          }
          break;

        // Next round (only when between rounds AND scene is round_summary)
        // Guard: N must not fire during ceremony scenes that occur during between_rounds status.
        case 'KeyN':
          if (game.status === 'between_rounds' && currentScene === 'round_summary') {
            game.nextRound();
          }
          break;

        // C key — start ceremony (batch mode only, last question of round) (T2.5.6)
        // Also activates during score_flash in instant mode for consistency
        case 'KeyC':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (currentScene === 'scoring_pause') {
              // Batch mode: check if this is the last question of the round
              const roundQs = store.questions.filter(
                (q) => q.roundIndex === store.currentRound
              );
              const displayIdx = store.displayQuestionIndex;
              const currentRoundQIndex = displayIdx !== null
                ? roundQs.findIndex((q) => store.questions.indexOf(q) === displayIdx)
                : -1;
              const isLast = currentRoundQIndex >= 0 && currentRoundQIndex >= roundQs.length - 1;

              if (isLast) {
                store.startRevealCeremony();
              }
            } else if (currentScene === 'score_flash') {
              // Instant mode: start ceremony for consistency (if batch mode)
              if (store.settings.revealMode === 'batch') {
                store.startRevealCeremony();
              }
            }
          }
          break;

        // Mute/unmute TTS
        case 'KeyM':
          toggleTTS();
          break;

        // T key — start timer and transition to question_active scene
        // NOT a toggle: if timer is already running, no-op for the timer start.
        // Scene transition always fires when in question_reading scene.
        case 'KeyT':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // Check if we're in a question scene where starting the timer makes sense
            if (
              currentScene === 'question_reading' ||
              currentScene === 'question_anticipation'
            ) {
              // Only start timer if not already running
              if (!store.timer.isRunning) {
                store.startTimer();
              }
              store.setAudienceScene('question_active');
            } else {
              // Fallback: toggle scoreboard (legacy T behavior for non-question scenes)
              toggleScoreboard();
            }
          } else {
            toggleScoreboard();
          }
          break;

        // S key — context-dependent scene transitions
        case 'KeyS':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            switch (currentScene) {
              case 'question_reading':
                // Skip timer — transition directly to answer reveal (or question_closed)
                // In instant mode, go to answer_reveal; otherwise question_closed
                if (store.settings.revealMode === 'instant') {
                  store.setAudienceScene('answer_reveal');
                } else {
                  store.setAudienceScene('question_closed');
                }
                break;
              case 'question_active':
                // Close question — transition to question_closed
                store.stopTimer();
                store.setAudienceScene('question_closed');
                break;
              case 'question_closed':
                // Enter scoring — in instant mode go to answer_reveal
                if (store.settings.revealMode === 'instant') {
                  store.setAudienceScene('answer_reveal');
                } else {
                  store.setAudienceScene('scoring_pause');
                }
                break;
              default:
                break;
            }
          }
          break;

        // Enter — skip timed scenes and ceremony advance
        case 'Enter':
          switch (currentScene) {
            case 'game_intro':
              store.setAudienceScene('round_intro');
              break;
            case 'round_intro':
              store.setAudienceScene('question_anticipation');
              break;
            case 'question_anticipation':
              store.setAudienceScene('question_reading');
              break;
            case 'answer_reveal':
              store.setAudienceScene('score_flash');
              break;
            case 'score_flash':
              // Advance to next question
              store.setAudienceScene('question_reading');
              break;
            case 'final_buildup':
              store.setAudienceScene('final_podium');
              break;
            // Batch ceremony: Enter advances at any ceremony scene
            case 'round_reveal_intro':
              store.advanceCeremony();
              break;
            case 'round_reveal_question':
              store.advanceCeremony();
              break;
            case 'round_reveal_answer':
              store.advanceCeremony();
              break;
            case 'question_transition':
              // Skip transition, go directly to question_anticipation
              store.setAudienceScene('question_anticipation');
              break;
            default:
              break;
          }
          break;

        // Toggle fullscreen
        case 'KeyF':
          fullscreen.toggleFullscreen();
          break;

        // Ctrl/Cmd+Z — undo last score action (T2.4)
        case 'KeyZ':
          if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
            if (SCORING_PHASE_SCENES.has(currentScene)) {
              event.preventDefault();
              quickScore.undo();
            }
          }
          break;

        // Show help modal (? = Shift + /)
        case 'Slash':
          if (event.shiftKey) {
            event.preventDefault();
            setShowHelp((prev) => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game, fullscreen, toggleScoreboard, toggleTTS, quickScore]);

  // Cleanup reset confirm timer on unmount
  useEffect(() => {
    return () => {
      if (resetConfirmTimerRef.current) {
        clearTimeout(resetConfirmTimerRef.current);
      }
    };
  }, []);

  return {
    ...game,
    peekAnswer,
    setPeekAnswer,
    showHelp,
    setShowHelp,
    // R key double-press confirmation state
    showResetConfirm,
    // Fullscreen state and controls
    isFullscreen: fullscreen.isFullscreen,
    toggleFullscreen: fullscreen.toggleFullscreen,
    // Additional toggles
    toggleScoreboard,
    toggleTTS,
    // Quick score (T2.4/T2.5)
    quickScore,
    // Scene controls (for presenter UI)
    audienceSceneControls,
  };
}
