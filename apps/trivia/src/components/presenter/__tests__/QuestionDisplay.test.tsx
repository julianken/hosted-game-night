import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionDisplay } from '../QuestionDisplay';
import type { Question } from '@/types';

// Mock multiple choice question
const mockMultipleChoiceQuestion: Question = {
  id: 'q1',
  text: 'What is the capital of France?',
  type: 'multiple_choice',
  correctAnswers: ['A'],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: ['Paris', 'London', 'Berlin', 'Madrid'],
  category: 'history',
  roundIndex: 0,
};

// Mock true/false question
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

describe('QuestionDisplay', () => {
  const defaultProps = {
    question: mockMultipleChoiceQuestion,
    peekAnswer: false,
    onTogglePeek: vi.fn(),
    onToggleDisplay: vi.fn(),
    progress: 'Question 1 of 5',
    roundProgress: 'Round 1 of 3',
    isOnDisplay: false,
  };

  describe('rendering', () => {
    it('should render question text', () => {
      render(<QuestionDisplay {...defaultProps} />);

      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    });

    it('should render all options for multiple choice question', () => {
      render(<QuestionDisplay {...defaultProps} />);

      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('Madrid')).toBeInTheDocument();
    });

    it('should render option letters for multiple choice', () => {
      render(<QuestionDisplay {...defaultProps} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('should render progress text', () => {
      render(<QuestionDisplay {...defaultProps} />);

      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    });

    it('should render round progress when provided', () => {
      render(<QuestionDisplay {...defaultProps} />);

      expect(screen.getByText('Round 1 of 3')).toBeInTheDocument();
    });

    it('should not render round progress when not provided', () => {
      render(<QuestionDisplay {...defaultProps} roundProgress={undefined} />);

      expect(screen.queryByText('Round 1 of 3')).not.toBeInTheDocument();
    });

    it('should show placeholder message when question is null', () => {
      render(<QuestionDisplay {...defaultProps} question={null} />);

      expect(
        screen.getByText('Select a question from the list to view it here.')
      ).toBeInTheDocument();
    });
  });

  describe('True/False questions', () => {
    it('should render True and False options', () => {
      render(
        <QuestionDisplay {...defaultProps} question={mockTrueFalseQuestion} />
      );

      expect(screen.getByText('True')).toBeInTheDocument();
      expect(screen.getByText('False')).toBeInTheDocument();
    });

    it('should render question text for True/False', () => {
      render(
        <QuestionDisplay {...defaultProps} question={mockTrueFalseQuestion} />
      );

      expect(screen.getByText('The Earth is flat.')).toBeInTheDocument();
    });
  });

  describe('peek answer functionality', () => {
    it('should show "Peek" button when not peeking', () => {
      render(<QuestionDisplay {...defaultProps} peekAnswer={false} />);

      expect(screen.getByText('Peek')).toBeInTheDocument();
    });

    it('should show correct answer when peeking', () => {
      render(<QuestionDisplay {...defaultProps} peekAnswer={true} />);

      // The peek button should show the correct answer (A) when peeking
      const peekButton = screen.getByTitle('Hide answer');
      expect(peekButton).toHaveTextContent('A');
    });

    it('should call onTogglePeek when peek button clicked', () => {
      const onTogglePeek = vi.fn();
      render(<QuestionDisplay {...defaultProps} onTogglePeek={onTogglePeek} />);

      // Find and click the peek button
      const peekButton = screen.getByTitle('Peek at answer (local only)');
      fireEvent.click(peekButton);

      expect(onTogglePeek).toHaveBeenCalledTimes(1);
    });

    it('should show correct answer for True/False when peeking', () => {
      render(
        <QuestionDisplay
          {...defaultProps}
          question={mockTrueFalseQuestion}
          peekAnswer={true}
        />
      );

      // The button should show "False" when peeking at the T/F question
      const peekButton = screen.getByTitle('Hide answer');
      expect(peekButton).toHaveTextContent('False');
    });
  });

  describe('display toggle functionality', () => {
    it('should show "Show" button when not on display', () => {
      render(<QuestionDisplay {...defaultProps} isOnDisplay={false} />);

      expect(screen.getByText('Show')).toBeInTheDocument();
    });

    it('should show "On Display" when on display', () => {
      render(<QuestionDisplay {...defaultProps} isOnDisplay={true} />);

      expect(screen.getByText('On Display')).toBeInTheDocument();
    });

    it('should call onToggleDisplay when display button clicked', () => {
      const onToggleDisplay = vi.fn();
      render(
        <QuestionDisplay {...defaultProps} onToggleDisplay={onToggleDisplay} />
      );

      const displayButton = screen.getByTitle('Show on display');
      fireEvent.click(displayButton);

      expect(onToggleDisplay).toHaveBeenCalledTimes(1);
    });

    it('should have correct title when on display', () => {
      render(<QuestionDisplay {...defaultProps} isOnDisplay={true} />);

      expect(screen.getByTitle('Hide from display')).toBeInTheDocument();
    });
  });

  describe('multiple correct answers', () => {
    it('should display multiple correct answers when peeking', () => {
      const questionWithMultipleCorrect: Question = {
        ...mockMultipleChoiceQuestion,
        correctAnswers: ['A', 'C'],
      };

      render(
        <QuestionDisplay
          {...defaultProps}
          question={questionWithMultipleCorrect}
          peekAnswer={true}
        />
      );

      // The button should show "A, C" when peeking
      const peekButton = screen.getByTitle('Hide answer');
      expect(peekButton).toHaveTextContent('A, C');
    });
  });
});
