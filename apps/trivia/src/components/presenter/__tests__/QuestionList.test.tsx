import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionList } from '../QuestionList';
import type { Question } from '@/types';

// Helper to create mock questions
const createMockQuestion = (
  id: string,
  text: string,
  roundIndex: number,
  type: 'multiple_choice' | 'true_false' = 'multiple_choice'
): Question => ({
  id,
  text,
  type,
  correctAnswers: type === 'multiple_choice' ? ['A'] : ['True'],
  options: type === 'multiple_choice' ? ['A', 'B', 'C', 'D'] : ['True', 'False'],
  optionTexts:
    type === 'multiple_choice'
      ? ['Option A', 'Option B', 'Option C', 'Option D']
      : ['True', 'False'],
  category: 'history',
  roundIndex,
});

// Create mock questions for 3 rounds with 2 questions each
const mockQuestions: Question[] = [
  createMockQuestion('q1', 'Round 1 Question 1', 0),
  createMockQuestion('q2', 'Round 1 Question 2', 0, 'true_false'),
  createMockQuestion('q3', 'Round 2 Question 1', 1),
  createMockQuestion('q4', 'Round 2 Question 2', 1),
  createMockQuestion('q5', 'Round 3 Question 1', 2),
  createMockQuestion('q6', 'Round 3 Question 2', 2),
];

describe('QuestionList', () => {
  const defaultProps = {
    questions: mockQuestions,
    selectedIndex: 0,
    displayIndex: null,
    currentRound: 0,
    totalRounds: 3,
    onSelect: vi.fn(),
    onSetDisplay: vi.fn(),
  };

  describe('rendering', () => {
    it('should render all questions for all rounds', () => {
      render(<QuestionList {...defaultProps} />);

      expect(screen.getByText('Round 1 Question 1')).toBeInTheDocument();
      expect(screen.getByText('Round 1 Question 2')).toBeInTheDocument();
      expect(screen.getByText('Round 2 Question 1')).toBeInTheDocument();
      expect(screen.getByText('Round 2 Question 2')).toBeInTheDocument();
      expect(screen.getByText('Round 3 Question 1')).toBeInTheDocument();
      expect(screen.getByText('Round 3 Question 2')).toBeInTheDocument();
    });

    it('should display total question count', () => {
      render(<QuestionList {...defaultProps} />);

      expect(screen.getByText('6 total')).toBeInTheDocument();
    });

    it('should render Questions header', () => {
      render(<QuestionList {...defaultProps} />);

      expect(screen.getByText('Questions')).toBeInTheDocument();
    });
  });

  describe('round grouping', () => {
    it('should display round headers', () => {
      render(<QuestionList {...defaultProps} />);

      expect(screen.getByText('Round 1')).toBeInTheDocument();
      expect(screen.getByText('Round 2')).toBeInTheDocument();
      expect(screen.getByText('Round 3')).toBeInTheDocument();
    });

    it('should show question counts per round', () => {
      render(<QuestionList {...defaultProps} />);

      // All rounds have 2 questions
      const questionCounts = screen.getAllByText('2 questions');
      expect(questionCounts).toHaveLength(3);
    });

    it('should mark completed rounds', () => {
      render(<QuestionList {...defaultProps} currentRound={2} />);

      // Round 1 and 2 are past rounds (currentRound is 2 = Round 3)
      // Each past round shows "(completed)" in the count
      const completedTexts = screen.getAllByText(/\(completed\)/);
      expect(completedTexts).toHaveLength(2);
    });
  });

  describe('question selection', () => {
    it('should highlight selected question', () => {
      const { container } = render(
        <QuestionList {...defaultProps} selectedIndex={0} />
      );

      // The first question should have the selected styling (blue border)
      const selectedQuestion = container.querySelector('.border-blue-500');
      expect(selectedQuestion).toBeInTheDocument();
    });

    it('should call onSelect when question is clicked', () => {
      const onSelect = vi.fn();
      render(<QuestionList {...defaultProps} onSelect={onSelect} />);

      // Click on the third question (index 2)
      const question = screen.getByText('Round 2 Question 1');
      fireEvent.click(question.closest('[class*="cursor-pointer"]')!);

      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('should pass correct global index when selecting questions in different rounds', () => {
      const onSelect = vi.fn();
      render(<QuestionList {...defaultProps} onSelect={onSelect} />);

      // Click on the first question in round 3 (index 4)
      const question = screen.getByText('Round 3 Question 1');
      fireEvent.click(question.closest('[class*="cursor-pointer"]')!);

      expect(onSelect).toHaveBeenCalledWith(4);
    });

    it('should update highlight when selectedIndex changes', () => {
      const { rerender, container } = render(
        <QuestionList {...defaultProps} selectedIndex={0} />
      );

      // Initially first question is selected
      let selectedQuestions = container.querySelectorAll('.border-blue-500');
      expect(selectedQuestions).toHaveLength(1);

      // Change selection
      rerender(<QuestionList {...defaultProps} selectedIndex={3} />);

      selectedQuestions = container.querySelectorAll('.border-blue-500');
      expect(selectedQuestions).toHaveLength(1);
    });
  });

  describe('question type indicators', () => {
    it('should display MC for multiple choice questions', () => {
      render(<QuestionList {...defaultProps} />);

      const mcIndicators = screen.getAllByText(/MC/);
      expect(mcIndicators.length).toBeGreaterThan(0);
    });

    it('should display T/F for true/false questions', () => {
      render(<QuestionList {...defaultProps} />);

      const tfIndicators = screen.getAllByText(/T\/F/);
      expect(tfIndicators.length).toBeGreaterThan(0);
    });

    it('should display category for questions', () => {
      render(<QuestionList {...defaultProps} />);

      // All mock questions have 'history' category
      const categoryIndicators = screen.getAllByText(/history/);
      expect(categoryIndicators).toHaveLength(6);
    });
  });

  describe('question numbering', () => {
    it('should number questions within each round starting from 1', () => {
      render(<QuestionList {...defaultProps} />);

      // Each round should have questions numbered 1, 2
      const numberOnes = screen.getAllByText('1');
      const numberTwos = screen.getAllByText('2');

      // There are 3 rounds, each with 2 questions, so 3 "1"s and 3 "2"s
      expect(numberOnes.length).toBeGreaterThanOrEqual(3);
      expect(numberTwos.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('current round highlighting', () => {
    it('should highlight current round header', () => {
      const { container } = render(
        <QuestionList {...defaultProps} currentRound={1} />
      );

      // Round 2 should be highlighted as current (blue styling)
      const round2Header = screen.getByText('Round 2').closest('div');
      expect(round2Header).toHaveClass('bg-blue-500/20');
    });

    it('should show past rounds with different styling', () => {
      const { container } = render(
        <QuestionList {...defaultProps} currentRound={2} />
      );

      // Round 1 is past
      const round1Header = screen.getByText('Round 1').closest('div');
      expect(round1Header).toHaveClass('bg-green-500/10');
    });

    it('should show future rounds with muted styling', () => {
      const { container } = render(
        <QuestionList {...defaultProps} currentRound={0} />
      );

      // Round 3 is future
      const round3Header = screen.getByText('Round 3').closest('div');
      expect(round3Header).toHaveClass('bg-muted/50');
    });
  });

  describe('empty state', () => {
    it('should handle empty questions array', () => {
      render(<QuestionList {...defaultProps} questions={[]} />);

      expect(screen.getByText('0 total')).toBeInTheDocument();
    });
  });
});
