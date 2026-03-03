import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useGameStore } from '@/stores/game-store';
import { resetGameStore } from '@/test/helpers/store';
import { SceneNavButtons } from '../SceneNavButtons';
import type { AudienceScene } from '@/types/audience-scene';
import type { TriviaGameState, Question, QuestionId } from '@/types';

beforeEach(() => {
  resetGameStore();
  vi.restoreAllMocks();
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Two questions for round 0, one question for round 1.
 * Lets us test isLastQuestion=false (Q0), isLastQuestion=true (Q1),
 * and round progression.
 */
const makeQuestions = (): Question[] => [
  {
    id: 'q0' as QuestionId,
    text: 'Q0',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['A', 'B', 'C', 'D'],
    correctAnswers: ['A'],
    category: 'general_knowledge',
    roundIndex: 0,
  },
  {
    id: 'q1' as QuestionId,
    text: 'Q1',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['A', 'B', 'C', 'D'],
    correctAnswers: ['A'],
    category: 'general_knowledge',
    roundIndex: 0,
  },
  {
    id: 'q2' as QuestionId,
    text: 'Q2 Round 1',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['A', 'B', 'C', 'D'],
    correctAnswers: ['A'],
    category: 'general_knowledge',
    roundIndex: 1,
  },
];

/**
 * Set up game store state for a given scene.
 * displayQuestionIndex=0 → first (not last) question of round 0 by default.
 */
function setSceneState(
  scene: AudienceScene,
  overrides?: Partial<TriviaGameState>
) {
  const questions = makeQuestions();
  useGameStore.setState({
    audienceScene: scene,
    revealPhase: null,
    recapShowingAnswer: null,
    questions,
    currentRound: 0,
    totalRounds: 2,
    displayQuestionIndex: 0,
    selectedQuestionIndex: 0,
    ...overrides,
  });
}

/**
 * Set up store where current display question is the last in the round.
 * With makeQuestions(), round 0 has Q0 and Q1 — so index 1 is the last.
 */
function setLastQuestionState(
  scene: AudienceScene,
  overrides?: Partial<TriviaGameState>
) {
  setSceneState(scene, { displayQuestionIndex: 1, selectedQuestionIndex: 1, ...overrides });
}

// =============================================================================
// TESTS
// =============================================================================

describe('SceneNavButtons', () => {
  it('always renders both back and forward buttons', () => {
    setSceneState('waiting');
    render(<SceneNavButtons />);

    // Forward button has label "Start Game" on waiting scene
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeInTheDocument();
    // Back button is disabled on waiting (no label) — query by testid
    expect(screen.getByTestId('nav-back')).toBeInTheDocument();
  });

  it('renders on every scene including question_display', () => {
    setSceneState('question_display');
    render(<SceneNavButtons />);

    expect(screen.getByRole('button', { name: 'Close Question' })).toBeInTheDocument();
    expect(screen.getByTestId('nav-back')).toBeInTheDocument();
  });

  it('renders on emergency_blank with both buttons disabled', () => {
    setSceneState('emergency_blank');
    render(<SceneNavButtons />);

    // Forward is null (disabled) on emergency_blank — query by testid
    const forwardBtn = screen.getByTestId('nav-forward');
    const backBtn = screen.getByTestId('nav-back');

    expect(forwardBtn).toBeDisabled();
    expect(backBtn).toBeDisabled();
  });

  describe('forward button', () => {
    it('calls startGame on waiting scene', () => {
      setSceneState('waiting');
      const startGameMock = vi.fn();
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'waiting',
        startGame: startGameMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

      expect(startGameMock).toHaveBeenCalled();
    });

    it('calls advanceScene with SKIP on timed intro scenes', () => {
      setSceneState('game_intro');
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'game_intro',
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip Intro' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('skip');
    });

    it('stops timer and chains two CLOSE advances on question_display', () => {
      setSceneState('question_display');
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      const stopTimerMock = vi.fn();
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'question_display',
        advanceScene: advanceSceneMock,
        stopTimer: stopTimerMock,
        timer: { isRunning: true, remaining: 10, duration: 30 },
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Close Question' }));

      expect(stopTimerMock).toHaveBeenCalled();
      expect(advanceSceneMock).toHaveBeenCalledTimes(2);
      expect(advanceSceneMock).toHaveBeenNthCalledWith(1, 'close');
      expect(advanceSceneMock).toHaveBeenNthCalledWith(2, 'close');
    });

    it('calls advanceScene with CLOSE on question_closed', () => {
      // Not last question: forward = "Next Question"
      setSceneState('question_closed');
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'question_closed',
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('close');
    });

    it('calls advanceScene with ADVANCE on results scenes', () => {
      // Not last question: forward = "Review Answers" on round_summary
      setSceneState('round_summary');
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'round_summary',
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Review Answers' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('advance');
    });

    it('is disabled during reveal lock on answer_reveal', () => {
      setSceneState('answer_reveal', { revealPhase: 'freeze' });
      render(<SceneNavButtons />);

      expect(screen.getByTestId('nav-forward')).toBeDisabled();
    });

    it('is enabled when revealPhase is null on answer_reveal', () => {
      // Not last question: forward = "Next Answer"
      setSceneState('answer_reveal', { revealPhase: null });
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Next Answer' })).not.toBeDisabled();
    });

    it('is not disabled on other scenes even when revealPhase is set', () => {
      setSceneState('round_summary', { revealPhase: 'freeze' });
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Review Answers' })).not.toBeDisabled();
    });
  });

  describe('back button', () => {
    it('calls advanceScene with "back" trigger', () => {
      // recap_title has back label "Scores"
      setSceneState('recap_title');
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Scores' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('back');
    });

    it('is disabled on non-recap scenes', () => {
      setSceneState('waiting');
      render(<SceneNavButtons />);

      expect(screen.getByTestId('nav-back')).toBeDisabled();
    });

    it('is enabled on recap_title with label "Scores"', () => {
      setSceneState('recap_title');
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Scores' })).not.toBeDisabled();
    });

    it('is enabled on recap_qa with label "Previous"', () => {
      setSceneState('recap_qa', { recapShowingAnswer: false });
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
    });

    it('is enabled on recap_scores with label "Q&A Review"', () => {
      setSceneState('recap_scores');
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Q&A Review' })).not.toBeDisabled();
    });
  });

  describe('context-dependent forward labels', () => {
    it('question_closed shows "Next Question" when not last question', () => {
      setSceneState('question_closed');
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'Next Question' })).toBeInTheDocument();
    });

    it('question_closed shows "End Round" when last question', () => {
      setLastQuestionState('question_closed');
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'End Round' })).toBeInTheDocument();
    });

    it('answer_reveal shows "Next Answer" when not last question', () => {
      setSceneState('answer_reveal');
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'Next Answer' })).toBeInTheDocument();
    });

    it('answer_reveal shows "Round Recap" when last question and not last round', () => {
      setLastQuestionState('answer_reveal');
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'Round Recap' })).toBeInTheDocument();
    });

    it('answer_reveal shows "End Game" when last question and last round', () => {
      setLastQuestionState('answer_reveal', { totalRounds: 1 });
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'End Game' })).toBeInTheDocument();
    });

    it('recap_qa shows "Show Answer" when not showing answer', () => {
      setSceneState('recap_qa', { recapShowingAnswer: false });
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'Show Answer' })).toBeInTheDocument();
    });

    it('recap_qa shows "Next Question" when showing answer and not last question', () => {
      setSceneState('recap_qa', { recapShowingAnswer: true });
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'Next Question' })).toBeInTheDocument();
    });

    it('recap_qa shows "View Scores" when showing answer and last question', () => {
      setLastQuestionState('recap_qa', { recapShowingAnswer: true });
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'View Scores' })).toBeInTheDocument();
    });

    it('recap_scores shows "Next Round" when not last round', () => {
      setSceneState('recap_scores');
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'Next Round' })).toBeInTheDocument();
    });

    it('recap_scores shows "End Game" when last round', () => {
      setSceneState('recap_scores', { totalRounds: 1 });
      render(<SceneNavButtons />);
      expect(screen.getByRole('button', { name: 'End Game' })).toBeInTheDocument();
    });
  });
});
