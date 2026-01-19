/**
 * Accessibility Tests using vitest-axe
 *
 * These tests run axe-core accessibility audits on key components
 * to catch WCAG violations automatically.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

// Presenter components
import { TeamScoreboard } from '@/components/presenter/TeamScoreboard';
import { TeamScoreInput } from '@/components/presenter/TeamScoreInput';
import { TeamManager } from '@/components/presenter/TeamManager';
import { QuestionDisplay } from '@/components/presenter/QuestionDisplay';
import { QuestionList } from '@/components/presenter/QuestionList';
import { RoundSummary } from '@/components/presenter/RoundSummary';
import { OpenDisplayButton } from '@/components/presenter/OpenDisplayButton';

// Audience components
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';
import { AudienceQuestionDisplay } from '@/components/audience/AudienceQuestionDisplay';
import { AudienceScoreboard } from '@/components/audience/AudienceScoreboard';
import { GameEndDisplay } from '@/components/audience/GameEndDisplay';

// Types
import type { Team, Question } from '@/types';

// Test data
const mockTeams: Team[] = [
  { id: '1', name: 'Table 1', score: 10, tableNumber: 1, roundScores: [5, 5] },
  { id: '2', name: 'Table 2', score: 8, tableNumber: 2, roundScores: [4, 4] },
  { id: '3', name: 'Table 3', score: 6, tableNumber: 3, roundScores: [3, 3] },
];

const mockQuestion: Question = {
  id: 'q1',
  text: 'What is the capital of France?',
  type: 'multiple_choice',
  correctAnswers: ['B'],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: ['London', 'Paris', 'Berlin', 'Madrid'],
  category: 'history',
  roundIndex: 0,
};

const mockTrueFalseQuestion: Question = {
  id: 'q2',
  text: 'The Earth is flat.',
  type: 'true_false',
  correctAnswers: ['False'],
  options: ['True', 'False'],
  optionTexts: ['True', 'False'],
  category: 'history',
  roundIndex: 0,
};

const mockQuestions: Question[] = [
  mockQuestion,
  { ...mockQuestion, id: 'q2', text: 'Who wrote Romeo and Juliet?', roundIndex: 0 },
  { ...mockQuestion, id: 'q3', text: 'What year did WWII end?', roundIndex: 1 },
  { ...mockQuestion, id: 'q4', text: 'Who painted the Mona Lisa?', roundIndex: 1 },
];

describe('Accessibility Tests', () => {
  describe('Presenter Components', () => {
    it('TeamScoreboard with no teams has no accessibility violations', async () => {
      const { container } = render(<TeamScoreboard teams={[]} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('TeamScoreboard with teams has no accessibility violations', async () => {
      const { container } = render(<TeamScoreboard teams={mockTeams} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('TeamScoreInput with no teams has no accessibility violations', async () => {
      const { container } = render(
        <TeamScoreInput
          teams={[]}
          currentRound={0}
          onAdjustScore={() => {}}
          onSetScore={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('TeamScoreInput with teams has no accessibility violations', async () => {
      const { container } = render(
        <TeamScoreInput
          teams={mockTeams}
          currentRound={0}
          onAdjustScore={() => {}}
          onSetScore={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('TeamManager in setup state with no teams has no accessibility violations', async () => {
      const { container } = render(
        <TeamManager
          teams={[]}
          status="setup"
          onAddTeam={() => {}}
          onRemoveTeam={() => {}}
          onRenameTeam={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('TeamManager in setup state with teams has no accessibility violations', async () => {
      const { container } = render(
        <TeamManager
          teams={mockTeams}
          status="setup"
          onAddTeam={() => {}}
          onRemoveTeam={() => {}}
          onRenameTeam={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('TeamManager in playing state has no accessibility violations', async () => {
      const { container } = render(
        <TeamManager
          teams={mockTeams}
          status="playing"
          onAddTeam={() => {}}
          onRemoveTeam={() => {}}
          onRenameTeam={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('QuestionDisplay with no question has no accessibility violations', async () => {
      const { container } = render(
        <QuestionDisplay
          question={null}
          peekAnswer={false}
          onTogglePeek={() => {}}
          onToggleDisplay={() => {}}
          progress="Question 1 of 5"
          isOnDisplay={false}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('QuestionDisplay with multiple choice question has no accessibility violations', async () => {
      const { container } = render(
        <QuestionDisplay
          question={mockQuestion}
          peekAnswer={false}
          onTogglePeek={() => {}}
          onToggleDisplay={() => {}}
          progress="Question 1 of 5"
          roundProgress="Round 1"
          isOnDisplay={false}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('QuestionDisplay with peek answer active has no accessibility violations', async () => {
      const { container } = render(
        <QuestionDisplay
          question={mockQuestion}
          peekAnswer={true}
          onTogglePeek={() => {}}
          onToggleDisplay={() => {}}
          progress="Question 1 of 5"
          isOnDisplay={true}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('QuestionList has no accessibility violations', async () => {
      const { container } = render(
        <QuestionList
          questions={mockQuestions}
          selectedIndex={0}
          displayIndex={null}
          currentRound={0}
          totalRounds={2}
          onSelect={() => {}}
          onSetDisplay={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('QuestionList with display active has no accessibility violations', async () => {
      const { container } = render(
        <QuestionList
          questions={mockQuestions}
          selectedIndex={1}
          displayIndex={1}
          currentRound={0}
          totalRounds={2}
          onSelect={() => {}}
          onSetDisplay={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('RoundSummary mid-game has no accessibility violations', async () => {
      const { container } = render(
        <RoundSummary
          currentRound={0}
          totalRounds={3}
          roundWinners={[mockTeams[0]]}
          teamsSortedByScore={mockTeams}
          isLastRound={false}
          onNextRound={() => {}}
          onClose={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('RoundSummary final round has no accessibility violations', async () => {
      const { container } = render(
        <RoundSummary
          currentRound={2}
          totalRounds={3}
          roundWinners={[mockTeams[0]]}
          teamsSortedByScore={mockTeams}
          isLastRound={true}
          onNextRound={() => {}}
          onClose={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('OpenDisplayButton has no accessibility violations', async () => {
      const { container } = render(<OpenDisplayButton sessionId="test-session" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Audience Components', () => {
    it('WaitingDisplay has no accessibility violations', async () => {
      const { container } = render(<WaitingDisplay message="Waiting for presenter..." />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('WaitingDisplay with custom message has no accessibility violations', async () => {
      const { container } = render(<WaitingDisplay message="Get ready for the next question!" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AudienceQuestionDisplay with multiple choice has no accessibility violations', async () => {
      const { container } = render(
        <AudienceQuestionDisplay
          question={mockQuestion}
          questionNumber={1}
          totalQuestions={5}
          roundNumber={1}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AudienceQuestionDisplay with true/false has no accessibility violations', async () => {
      const { container } = render(
        <AudienceQuestionDisplay
          question={mockTrueFalseQuestion}
          questionNumber={2}
          totalQuestions={5}
          roundNumber={1}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AudienceScoreboard with no teams has no accessibility violations', async () => {
      const { container } = render(
        <AudienceScoreboard
          teams={[]}
          currentRound={0}
          totalRounds={3}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AudienceScoreboard with teams has no accessibility violations', async () => {
      const { container } = render(
        <AudienceScoreboard
          teams={mockTeams}
          currentRound={0}
          totalRounds={3}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AudienceScoreboard on last round has no accessibility violations', async () => {
      const { container } = render(
        <AudienceScoreboard
          teams={mockTeams}
          currentRound={2}
          totalRounds={3}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('GameEndDisplay with no teams has no accessibility violations', async () => {
      const { container } = render(<GameEndDisplay teams={[]} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('GameEndDisplay with winner has no accessibility violations', async () => {
      const { container } = render(<GameEndDisplay teams={mockTeams} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('GameEndDisplay with many teams has no accessibility violations', async () => {
      const manyTeams: Team[] = [
        ...mockTeams,
        { id: '4', name: 'Table 4', score: 4, tableNumber: 4, roundScores: [2, 2] },
        { id: '5', name: 'Table 5', score: 2, tableNumber: 5, roundScores: [1, 1] },
      ];
      const { container } = render(<GameEndDisplay teams={manyTeams} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
