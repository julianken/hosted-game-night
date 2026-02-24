import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AudienceScene } from '@/types/audience-scene';

// ---------------------------------------------------------------------------
// Mock motion/react -- AnimatePresence + motion.div rendered as plain divs
// ---------------------------------------------------------------------------
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { variants?: unknown; initial?: string; animate?: string; exit?: string }) => {
      // Strip motion-specific props so they don't warn on a plain <div>
      const { variants: _v, initial: _i, animate: _a, exit: _e, ...htmlProps } = rest as Record<string, unknown>;
      void _v; void _i; void _a; void _e;
      return <div {...(htmlProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

// ---------------------------------------------------------------------------
// Mock motion presets
// ---------------------------------------------------------------------------
vi.mock('@/lib/motion/presets', () => ({
  sceneWrapper: {},
  sceneWrapperReduced: {},
}));

// ---------------------------------------------------------------------------
// Mock all 15 scene components as data-testid divs
// ---------------------------------------------------------------------------
vi.mock('../WaitingScene', () => ({
  WaitingScene: (props: { message?: string }) => (
    <div data-testid="WaitingScene">{props.message ?? 'default-waiting'}</div>
  ),
}));

vi.mock('../QuestionDisplayScene', () => ({
  QuestionDisplayScene: (props: { answersEnabled?: boolean }) => (
    <div data-testid="QuestionDisplayScene" data-answers-enabled={String(props.answersEnabled)} />
  ),
}));

vi.mock('../AnswerRevealScene', () => ({
  AnswerRevealScene: () => <div data-testid="AnswerRevealScene" />,
}));

vi.mock('../PausedScene', () => ({
  PausedScene: () => <div data-testid="PausedScene" />,
}));

vi.mock('../EmergencyBlankScene', () => ({
  EmergencyBlankScene: () => <div data-testid="EmergencyBlankScene" />,
}));

vi.mock('../QuestionClosedScene', () => ({
  QuestionClosedScene: () => <div data-testid="QuestionClosedScene" />,
}));

vi.mock('../RoundIntroScene', () => ({
  RoundIntroScene: () => <div data-testid="RoundIntroScene" />,
}));

vi.mock('../QuestionAnticipationScene', () => ({
  QuestionAnticipationScene: () => <div data-testid="QuestionAnticipationScene" />,
}));

vi.mock('../RoundSummaryScene', () => ({
  RoundSummaryScene: () => <div data-testid="RoundSummaryScene" />,
}));

vi.mock('../GameIntroScene', () => ({
  GameIntroScene: () => <div data-testid="GameIntroScene" />,
}));

vi.mock('../FinalBuildupScene', () => ({
  FinalBuildupScene: () => <div data-testid="FinalBuildupScene" />,
}));

vi.mock('../FinalPodiumScene', () => ({
  FinalPodiumScene: () => <div data-testid="FinalPodiumScene" />,
}));

vi.mock('../RecapTitleScene', () => ({
  RecapTitleScene: () => <div data-testid="RecapTitleScene" />,
}));

vi.mock('../RecapQAScene', () => ({
  RecapQAScene: () => <div data-testid="RecapQAScene" />,
}));

vi.mock('../RecapScoresScene', () => ({
  RecapScoresScene: () => <div data-testid="RecapScoresScene" />,
}));

// ---------------------------------------------------------------------------
// Mock game store
// ---------------------------------------------------------------------------
const mockStoreState: Record<string, unknown> = {
  audienceScene: 'waiting' as AudienceScene,
  displayQuestionIndex: 0,
  currentRound: 0,
  timer: { isRunning: false },
};

vi.mock('@/stores/game-store', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockStoreState),
}));

// ---------------------------------------------------------------------------
// Helper: set store state for a specific scene
// ---------------------------------------------------------------------------
function setScene(scene: AudienceScene, overrides: Partial<typeof mockStoreState> = {}): void {
  mockStoreState.audienceScene = scene;
  mockStoreState.displayQuestionIndex = overrides.displayQuestionIndex ?? 0;
  mockStoreState.currentRound = overrides.currentRound ?? 0;
  mockStoreState.timer = overrides.timer ?? { isRunning: false };
}

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import { SceneRouter } from '../SceneRouter';

// ===========================================================================
// TESTS
// ===========================================================================

describe('SceneRouter', () => {
  beforeEach(() => {
    setScene('waiting');
  });

  // -------------------------------------------------------------------------
  // Emergency blank bypass
  // -------------------------------------------------------------------------
  describe('emergency blank bypass', () => {
    it('renders EmergencyBlankScene immediately when audienceScene is emergency_blank', () => {
      setScene('emergency_blank');
      render(<SceneRouter isConnected={true} />);

      expect(screen.getByTestId('EmergencyBlankScene')).toBeInTheDocument();
    });

    it('renders EmergencyBlankScene even when not connected', () => {
      setScene('emergency_blank');
      render(<SceneRouter isConnected={false} />);

      expect(screen.getByTestId('EmergencyBlankScene')).toBeInTheDocument();
    });

    it('does not render any other scene component during emergency blank', () => {
      setScene('emergency_blank');
      render(<SceneRouter isConnected={true} />);

      expect(screen.queryByTestId('WaitingScene')).not.toBeInTheDocument();
      expect(screen.queryByTestId('PausedScene')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Pre-connection guard
  // -------------------------------------------------------------------------
  describe('pre-connection guard', () => {
    it('renders WaitingScene with default message when not connected', () => {
      setScene('question_display');
      render(<SceneRouter isConnected={false} />);

      const waiting = screen.getByTestId('WaitingScene');
      expect(waiting).toBeInTheDocument();
      expect(waiting).toHaveTextContent('Waiting for presenter...');
    });

    it('renders WaitingScene with resolving message when isResolvingRoomCode is true', () => {
      setScene('question_display');
      render(<SceneRouter isConnected={false} isResolvingRoomCode={true} />);

      const waiting = screen.getByTestId('WaitingScene');
      expect(waiting).toBeInTheDocument();
      expect(waiting).toHaveTextContent('Connecting to room...');
    });

    it('does not render the active scene component when not connected', () => {
      setScene('question_display');
      render(<SceneRouter isConnected={false} />);

      expect(screen.queryByTestId('QuestionDisplayScene')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // All 15 scene values via it.each
  // -------------------------------------------------------------------------
  describe('scene routing for all AudienceScene values', () => {
    const sceneToTestId: Array<[AudienceScene, string]> = [
      ['waiting', 'WaitingScene'],
      ['game_intro', 'GameIntroScene'],
      ['round_intro', 'RoundIntroScene'],
      ['question_anticipation', 'QuestionAnticipationScene'],
      ['question_display', 'QuestionDisplayScene'],
      ['question_closed', 'QuestionClosedScene'],
      ['answer_reveal', 'AnswerRevealScene'],
      ['round_summary', 'RoundSummaryScene'],
      ['recap_title', 'RecapTitleScene'],
      ['recap_qa', 'RecapQAScene'],
      ['recap_scores', 'RecapScoresScene'],
      ['final_buildup', 'FinalBuildupScene'],
      ['final_podium', 'FinalPodiumScene'],
      ['paused', 'PausedScene'],
      ['emergency_blank', 'EmergencyBlankScene'],
    ];

    it.each(sceneToTestId)(
      'renders %s scene component when audienceScene is "%s"',
      (scene, expectedTestId) => {
        setScene(scene);
        render(<SceneRouter isConnected={true} />);

        expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
      },
    );
  });

  // -------------------------------------------------------------------------
  // Scene key derivation
  // -------------------------------------------------------------------------
  describe('scene key derivation', () => {
    it('includes displayQuestionIndex in key for question_display scene', () => {
      setScene('question_display', { displayQuestionIndex: 3 });
      const { container } = render(<SceneRouter isConnected={true} />);

      // The motion.div wrapper receives the key; verify the scene rendered correctly
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeInTheDocument();
      expect(screen.getByTestId('QuestionDisplayScene')).toBeInTheDocument();
    });

    it('includes displayQuestionIndex in key for answer_reveal scene', () => {
      setScene('answer_reveal', { displayQuestionIndex: 5 });
      const { container } = render(<SceneRouter isConnected={true} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeInTheDocument();
      expect(screen.getByTestId('AnswerRevealScene')).toBeInTheDocument();
    });

    it('includes displayQuestionIndex in key for question_closed scene', () => {
      setScene('question_closed', { displayQuestionIndex: 2 });
      render(<SceneRouter isConnected={true} />);

      expect(screen.getByTestId('QuestionClosedScene')).toBeInTheDocument();
    });

    it('includes displayQuestionIndex in key for question_anticipation scene', () => {
      setScene('question_anticipation', { displayQuestionIndex: 1 });
      render(<SceneRouter isConnected={true} />);

      expect(screen.getByTestId('QuestionAnticipationScene')).toBeInTheDocument();
    });

    it('includes displayQuestionIndex in key for recap_qa scene', () => {
      setScene('recap_qa', { displayQuestionIndex: 4 });
      render(<SceneRouter isConnected={true} />);

      expect(screen.getByTestId('RecapQAScene')).toBeInTheDocument();
    });

    it('includes currentRound in key for round_intro scene', () => {
      setScene('round_intro', { currentRound: 2 });
      render(<SceneRouter isConnected={true} />);

      expect(screen.getByTestId('RoundIntroScene')).toBeInTheDocument();
    });

    it('includes currentRound in key for round_summary scene', () => {
      setScene('round_summary', { currentRound: 1 });
      render(<SceneRouter isConnected={true} />);

      expect(screen.getByTestId('RoundSummaryScene')).toBeInTheDocument();
    });

    it('uses scene name as key for scenes without question/round context', () => {
      setScene('paused');
      render(<SceneRouter isConnected={true} />);

      expect(screen.getByTestId('PausedScene')).toBeInTheDocument();
    });

    it('handles null displayQuestionIndex gracefully for question_display', () => {
      setScene('question_display', { displayQuestionIndex: null });
      render(<SceneRouter isConnected={true} />);

      // Should still render correctly with "none" suffix in key
      expect(screen.getByTestId('QuestionDisplayScene')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // QuestionDisplayScene receives answersEnabled from timer state
  // -------------------------------------------------------------------------
  describe('QuestionDisplayScene props', () => {
    it('passes answersEnabled=true when timer is running', () => {
      setScene('question_display', { timer: { isRunning: true } });
      render(<SceneRouter isConnected={true} />);

      const qd = screen.getByTestId('QuestionDisplayScene');
      expect(qd).toHaveAttribute('data-answers-enabled', 'true');
    });

    it('passes answersEnabled=false when timer is not running', () => {
      setScene('question_display', { timer: { isRunning: false } });
      render(<SceneRouter isConnected={true} />);

      const qd = screen.getByTestId('QuestionDisplayScene');
      expect(qd).toHaveAttribute('data-answers-enabled', 'false');
    });
  });
});
