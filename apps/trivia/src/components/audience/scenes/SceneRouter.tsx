'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { sceneWrapper, sceneWrapperReduced } from '@/lib/motion/presets';

// Scene components
import { WaitingScene } from './WaitingScene';
import { QuestionReadingScene } from './QuestionReadingScene';
import { QuestionActiveScene } from './QuestionActiveScene';
import { AnswerRevealScene } from './AnswerRevealScene';
import { PausedScene } from './PausedScene';
import { EmergencyBlankScene } from './EmergencyBlankScene';

// Fallback components for scenes not yet built in T1 scope
import { AudienceScoreboard } from '@/components/audience/AudienceScoreboard';
import { GameEndDisplay } from '@/components/audience/GameEndDisplay';

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
  const revealCeremonyQuestionIndex = useGameStore(
    (state) => state.revealCeremonyQuestionIndex
  );
  const currentRound = useGameStore((state) => state.currentRound);

  const { teamsSortedByScore } = useGameSelectors();
  const teams = useGameStore((state) => state.teams);
  const totalRounds = useGameStore((state) => state.totalRounds);

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
      case 'question_reading':
      case 'question_active':
      case 'answer_reveal':
      case 'question_closed':
      case 'score_flash':
        return `${audienceScene}-${displayQuestionIndex ?? 'none'}`;

      case 'round_reveal_intro':
      case 'round_reveal_question':
      case 'round_reveal_answer':
        return `${audienceScene}-${revealCeremonyQuestionIndex ?? 'none'}`;

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

      case 'question_reading':
        return <QuestionReadingScene />;

      case 'question_active':
        return <QuestionActiveScene />;

      case 'answer_reveal':
        return <AnswerRevealScene />;

      case 'paused':
        return <PausedScene />;

      // -- Later-tier scenes: status-based fallbacks ------------------------
      case 'round_summary':
        return (
          <AudienceScoreboard
            teams={teamsSortedByScore}
            currentRound={currentRound}
            totalRounds={totalRounds}
          />
        );

      case 'final_buildup':
      case 'final_podium':
        return <GameEndDisplay teams={teams} />;

      // -- Scenes not yet built (T2+): show a waiting placeholder -----------
      case 'game_intro':
        return <WaitingScene message="Starting game..." />;

      case 'round_intro':
        return <WaitingScene message={`Round ${currentRound + 1}`} />;

      case 'question_anticipation':
        return <WaitingScene message="Get ready for the next question..." />;

      case 'question_closed':
        // question closed — timer expired, waiting for scoring
        return <QuestionActiveScene />;

      case 'score_flash':
        return (
          <AudienceScoreboard
            teams={teamsSortedByScore}
            currentRound={currentRound}
            totalRounds={totalRounds}
          />
        );

      case 'scoring_pause':
        return <WaitingScene message="Scoring in progress..." />;

      case 'question_transition':
        return <WaitingScene message="Next question coming up..." />;

      case 'round_reveal_intro':
        return <WaitingScene message="Revealing answers..." />;

      case 'round_reveal_question':
        return <QuestionReadingScene />;

      case 'round_reveal_answer':
        return <AnswerRevealScene />;

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
