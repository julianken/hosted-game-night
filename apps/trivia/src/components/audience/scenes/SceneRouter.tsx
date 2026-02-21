'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '@/stores/game-store';
import { sceneWrapper, sceneWrapperReduced } from '@/lib/motion/presets';

// Scene components
import { WaitingScene } from './WaitingScene';
import { QuestionDisplayScene } from './QuestionDisplayScene';
import { AnswerRevealScene } from './AnswerRevealScene';
import { PausedScene } from './PausedScene';
import { EmergencyBlankScene } from './EmergencyBlankScene';
// T2 scenes
import { QuestionClosedScene } from './QuestionClosedScene';
import { ScoreFlashScene } from './ScoreFlashScene';
import { RoundIntroScene } from './RoundIntroScene';
import { RoundSummaryScene } from './RoundSummaryScene';
// T3 new scenes
import { GameIntroScene } from './GameIntroScene';
import { FinalBuildupScene } from './FinalBuildupScene';
import { FinalPodiumScene } from './FinalPodiumScene';

export interface SceneRouterProps {
  isConnected: boolean;
  isResolvingRoomCode?: boolean;
}

/**
 * SceneRouter (T1.10)
 *
 * Routes the current audienceScene value to the appropriate scene component.
 * Wraps scene components under AnimatePresence mode="wait" for smooth
 * exit-before-enter transitions between scenes.
 *
 * Key behaviors:
 * - Pre-connection guard: renders WaitingScene outside AnimatePresence before connected
 * - Emergency blank bypass: renders EmergencyBlankScene outside AnimatePresence (no exit)
 * - Scene key derivation: includes question/round index for smooth re-mounts on Q change
 *
 * Scene transitions (per FINAL_SPEC.md):
 *   Exit:  280ms, ease [0.4, 0, 1, 1], opacity: 0, scale: 0.98
 *   Enter: 180ms, ease [0.22, 1, 0.36, 1], opacity: 0, y: 6 -> opacity: 1, y: 0
 */
export function SceneRouter({ isConnected, isResolvingRoomCode = false }: SceneRouterProps) {
  const shouldReduceMotion = useReducedMotion();

  const audienceScene = useGameStore((state) => state.audienceScene);
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const currentRound = useGameStore((state) => state.currentRound);
  const timerIsRunning = useGameStore((state) => state.timer.isRunning);

  // Emergency blank: render immediately outside AnimatePresence (no exit transition)
  if (audienceScene === 'emergency_blank') {
    return <EmergencyBlankScene />;
  }

  // Pre-connection: render WaitingScene outside AnimatePresence
  if (!isConnected) {
    return (
      <WaitingScene
        message={isResolvingRoomCode ? 'Connecting to room...' : 'Waiting for presenter...'}
      />
    );
  }

  // Derive stable scene key for AnimatePresence — ensures remount on question change
  function getSceneKey(): string {
    switch (audienceScene) {
      case 'question_display':
      case 'answer_reveal':
      case 'question_closed':
      case 'score_flash':
        return `${audienceScene}-${displayQuestionIndex ?? 'none'}`;

      case 'round_intro':
      case 'round_summary':
        return `${audienceScene}-${currentRound}`;

      default:
        return audienceScene;
    }
  }

  const sceneKey = getSceneKey();
  const variants = shouldReduceMotion ? sceneWrapperReduced : sceneWrapper;

  // Render the appropriate scene component for the current audienceScene
  const renderScene = () => {
    switch (audienceScene) {
      // -- T1 scenes (fully implemented) ------------------------------------
      case 'waiting':
        return <WaitingScene />;

      case 'question_display':
        return <QuestionDisplayScene answersEnabled={timerIsRunning} />;

      case 'answer_reveal':
        return <AnswerRevealScene />;

      case 'paused':
        return <PausedScene />;

      // -- T2 scenes (fully implemented) ------------------------------------
      case 'round_summary':
        return <RoundSummaryScene />;

      // -- T3 new scenes ----------------------------------------------------
      case 'game_intro':
        return <GameIntroScene />;

      case 'final_buildup':
        return <FinalBuildupScene />;

      case 'final_podium':
        return <FinalPodiumScene />;

      case 'round_intro':
        return <RoundIntroScene />;

      case 'question_anticipation':
        return <WaitingScene message="Get ready for the next question..." />;

      case 'question_closed':
        return <QuestionClosedScene />;

      case 'score_flash':
        return <ScoreFlashScene />;

      default:
        return <WaitingScene />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={sceneKey}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full h-full"
      >
        {renderScene()}
      </motion.div>
    </AnimatePresence>
  );
}
