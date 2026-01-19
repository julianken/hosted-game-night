import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudienceQuestionDisplay } from '../AudienceQuestionDisplay';
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
  text: 'The Earth orbits the Sun.',
  type: 'true_false',
  correctAnswers: ['True'],
  options: ['True', 'False'],
  optionTexts: ['True', 'False'],
  category: 'history',
  roundIndex: 0,
};

describe('AudienceQuestionDisplay', () => {
  const defaultProps = {
    question: mockMultipleChoiceQuestion,
    questionNumber: 1,
    totalQuestions: 5,
    roundNumber: 1,
  };

  describe('question text rendering', () => {
    it('should render question text large and visible', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      const questionText = screen.getByText('What is the capital of France?');
      expect(questionText).toBeInTheDocument();
      expect(questionText).toHaveClass('text-4xl');
    });

    it('should render question text with bold styling', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      const questionText = screen.getByText('What is the capital of France?');
      expect(questionText).toHaveClass('font-bold');
    });
  });

  describe('round and question indicator', () => {
    it('should show round number', () => {
      render(<AudienceQuestionDisplay {...defaultProps} roundNumber={2} />);

      expect(screen.getByText(/Round 2/)).toBeInTheDocument();
    });

    it('should show question number and total', () => {
      render(
        <AudienceQuestionDisplay
          {...defaultProps}
          questionNumber={3}
          totalQuestions={10}
        />
      );

      expect(screen.getByText(/Question 3 of 10/)).toBeInTheDocument();
    });

    it('should format round and question info correctly', () => {
      render(
        <AudienceQuestionDisplay
          {...defaultProps}
          roundNumber={1}
          questionNumber={1}
          totalQuestions={5}
        />
      );

      expect(
        screen.getByText('Round 1 \u2022 Question 1 of 5')
      ).toBeInTheDocument();
    });
  });

  describe('category display', () => {
    it('should show the question category', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      expect(screen.getByText('history')).toBeInTheDocument();
    });

    it('should show category in a badge', () => {
      const { container } = render(<AudienceQuestionDisplay {...defaultProps} />);

      const badge = screen.getByText('history').closest('div');
      expect(badge).toHaveClass('rounded-full');
    });
  });

  describe('multiple choice options', () => {
    it('should display all four options', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('Madrid')).toBeInTheDocument();
    });

    it('should display option letters A, B, C, D', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('should color-code option badges', () => {
      const { container } = render(<AudienceQuestionDisplay {...defaultProps} />);

      // Check for color classes on option badges
      expect(container.querySelector('.bg-blue-600')).toBeInTheDocument(); // A
      expect(container.querySelector('.bg-red-600')).toBeInTheDocument(); // B
      expect(container.querySelector('.bg-green-600')).toBeInTheDocument(); // C
      expect(container.querySelector('.bg-orange-500')).toBeInTheDocument(); // D
    });

    it('should have large readable option text', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      const optionText = screen.getByText('Paris');
      expect(optionText).toHaveClass('text-2xl');
    });
  });

  describe('true/false questions', () => {
    it('should display TRUE and FALSE options', () => {
      render(
        <AudienceQuestionDisplay {...defaultProps} question={mockTrueFalseQuestion} />
      );

      expect(screen.getByText('TRUE')).toBeInTheDocument();
      expect(screen.getByText('FALSE')).toBeInTheDocument();
    });

    it('should style TRUE option with green', () => {
      const { container } = render(
        <AudienceQuestionDisplay {...defaultProps} question={mockTrueFalseQuestion} />
      );

      const trueOption = screen.getByText('TRUE').closest('div');
      expect(trueOption).toHaveClass('border-green-600');
    });

    it('should style FALSE option with red', () => {
      const { container } = render(
        <AudienceQuestionDisplay {...defaultProps} question={mockTrueFalseQuestion} />
      );

      const falseOption = screen.getByText('FALSE').closest('div');
      expect(falseOption).toHaveClass('border-red-600');
    });

    it('should have large text for T/F options', () => {
      render(
        <AudienceQuestionDisplay {...defaultProps} question={mockTrueFalseQuestion} />
      );

      const trueText = screen.getByText('TRUE');
      expect(trueText).toHaveClass('text-4xl');
    });
  });

  describe('large text for readability', () => {
    it('should have appropriately sized question text', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      const questionText = screen.getByText('What is the capital of France?');
      // Should have responsive text sizing
      expect(questionText.className).toMatch(/text-4xl|text-5xl|text-6xl/);
    });

    it('should have appropriately sized round indicator', () => {
      render(<AudienceQuestionDisplay {...defaultProps} />);

      const roundIndicator = screen.getByText(/Round 1/).closest('p');
      expect(roundIndicator).toHaveClass('text-2xl');
    });
  });

  describe('layout and styling', () => {
    it('should be centered', () => {
      const { container } = render(<AudienceQuestionDisplay {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
    });

    it('should have minimum height', () => {
      const { container } = render(<AudienceQuestionDisplay {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-[60vh]');
    });

    it('should have fade-in animation', () => {
      const { container } = render(<AudienceQuestionDisplay {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('animate-in');
      expect(wrapper).toHaveClass('fade-in');
    });
  });

  describe('options grid layout', () => {
    it('should use grid layout for multiple choice options', () => {
      const { container } = render(<AudienceQuestionDisplay {...defaultProps} />);

      const optionsGrid = container.querySelector('.grid');
      expect(optionsGrid).toBeInTheDocument();
    });

    it('should use two-column layout for options on larger screens', () => {
      const { container } = render(<AudienceQuestionDisplay {...defaultProps} />);

      const optionsGrid = container.querySelector('.md\\:grid-cols-2');
      expect(optionsGrid).toBeInTheDocument();
    });
  });

  describe('different question numbers', () => {
    it('should handle first question correctly', () => {
      render(
        <AudienceQuestionDisplay
          {...defaultProps}
          questionNumber={1}
          totalQuestions={5}
        />
      );

      expect(screen.getByText(/Question 1 of 5/)).toBeInTheDocument();
    });

    it('should handle last question correctly', () => {
      render(
        <AudienceQuestionDisplay
          {...defaultProps}
          questionNumber={5}
          totalQuestions={5}
        />
      );

      expect(screen.getByText(/Question 5 of 5/)).toBeInTheDocument();
    });
  });

  describe('different rounds', () => {
    it('should display correct round number', () => {
      render(
        <AudienceQuestionDisplay {...defaultProps} roundNumber={3} />
      );

      expect(screen.getByText(/Round 3/)).toBeInTheDocument();
    });
  });

  describe('different categories', () => {
    it('should display music category', () => {
      const musicQuestion: Question = {
        ...mockMultipleChoiceQuestion,
        category: 'music',
      };

      render(
        <AudienceQuestionDisplay {...defaultProps} question={musicQuestion} />
      );

      expect(screen.getByText('music')).toBeInTheDocument();
    });

    it('should display movies category', () => {
      const moviesQuestion: Question = {
        ...mockMultipleChoiceQuestion,
        category: 'movies',
      };

      render(
        <AudienceQuestionDisplay {...defaultProps} question={moviesQuestion} />
      );

      expect(screen.getByText('movies')).toBeInTheDocument();
    });
  });
});
