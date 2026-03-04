import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WizardStepReview } from '../WizardStepReview';
import type { GameSetupValidation } from '@/lib/game/selectors';
import type { Team, Question, QuestionId, TeamId } from '@/types';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const mockValidation = (
  overrides: Partial<GameSetupValidation> = {},
): GameSetupValidation => ({
  canStart: true,
  issues: [],
  blockCount: 0,
  warnCount: 0,
  ...overrides,
});

let teamCounter = 0;
const mockTeam = (id: string, name: string): Team => ({
  id: id as TeamId,
  name,
  score: 0,
  tableNumber: ++teamCounter,
  roundScores: [],
});

let questionCounter = 0;
const mockQuestion = (roundIndex: number): Question => ({
  id: `q-${++questionCounter}` as QuestionId,
  text: 'Test question',
  type: 'multiple_choice',
  correctAnswers: ['A'],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],
  category: 'general_knowledge',
  roundIndex,
});

const defaultProps = () => ({
  validation: mockValidation(),
  canStart: true,
  questions: [mockQuestion(0), mockQuestion(0), mockQuestion(1)],
  teams: [mockTeam('t1', 'Table 1'), mockTeam('t2', 'Table 2')],
  roundsCount: 2,
  questionsPerRound: 2,
  timerDuration: 30,
  onGoToStep: vi.fn(),
  onSaveTemplate: vi.fn(),
  onStartGame: vi.fn(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WizardStepReview', () => {
  it('renders red banner when blockCount > 0', () => {
    const props = defaultProps();
    props.validation = mockValidation({
      canStart: false,
      blockCount: 2,
      issues: [
        { id: 'V1', severity: 'block', message: 'No questions loaded' },
        { id: 'V4', severity: 'block', message: 'No teams added' },
      ],
    });
    render(<WizardStepReview {...props} />);
    expect(screen.getByText(/Cannot start/)).toBeInTheDocument();
    expect(screen.getByText(/2 issues to fix/)).toBeInTheDocument();
  });

  it('renders amber banner when warnCount > 0 but blockCount === 0', () => {
    const props = defaultProps();
    props.validation = mockValidation({
      warnCount: 1,
      issues: [
        { id: 'V7', severity: 'warn', message: 'Only one team' },
      ],
    });
    render(<WizardStepReview {...props} />);
    expect(screen.getByText(/Ready with 1 warning/)).toBeInTheDocument();
  });

  it('renders green banner when no issues', () => {
    const props = defaultProps();
    render(<WizardStepReview {...props} />);
    expect(screen.getByText('Ready to start!')).toBeInTheDocument();
  });

  it('disables Start Game button when !canStart', () => {
    const props = defaultProps();
    props.canStart = false;
    render(<WizardStepReview {...props} />);
    const button = screen.getByRole('button', { name: 'Start Game' });
    expect(button).toBeDisabled();
  });

  it('enables Start Game button when canStart', () => {
    const props = defaultProps();
    render(<WizardStepReview {...props} />);
    const button = screen.getByRole('button', { name: 'Start Game' });
    expect(button).toBeEnabled();
  });

  it('Edit Questions calls onGoToStep(0)', () => {
    const props = defaultProps();
    render(<WizardStepReview {...props} />);
    fireEvent.click(screen.getByTestId('review-edit-questions'));
    expect(props.onGoToStep).toHaveBeenCalledWith(0);
  });

  it('Edit Settings calls onGoToStep(1)', () => {
    const props = defaultProps();
    render(<WizardStepReview {...props} />);
    fireEvent.click(screen.getByTestId('review-edit-settings'));
    expect(props.onGoToStep).toHaveBeenCalledWith(1);
  });

  it('Edit Teams calls onGoToStep(2)', () => {
    const props = defaultProps();
    render(<WizardStepReview {...props} />);
    fireEvent.click(screen.getByTestId('review-edit-teams'));
    expect(props.onGoToStep).toHaveBeenCalledWith(2);
  });

  it('shows per-round question counts', () => {
    const props = defaultProps();
    render(<WizardStepReview {...props} />);
    expect(screen.getByText('Round 1: 2 questions')).toBeInTheDocument();
    expect(screen.getByText('Round 2: 1 question')).toBeInTheDocument();
  });

  it('shows team pills', () => {
    const props = defaultProps();
    render(<WizardStepReview {...props} />);
    expect(screen.getByText('Table 1')).toBeInTheDocument();
    expect(screen.getByText('Table 2')).toBeInTheDocument();
  });

  it('shows "No teams added" when teams is empty', () => {
    const props = defaultProps();
    props.teams = [];
    render(<WizardStepReview {...props} />);
    expect(screen.getByText('No teams added')).toBeInTheDocument();
  });
});
