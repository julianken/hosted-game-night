import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoundEditor } from '../RoundEditor';
import type { CategoryFormData } from '../QuestionSetEditorModal.utils';

// Helper to create a mock round/category
const createMockRound = (
  name: string,
  questionCount: number = 0
): CategoryFormData => ({
  id: `round-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  questions: Array.from({ length: questionCount }, (_, i) => ({
    question: `Question ${i + 1}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: 0,
  })),
});

describe('RoundEditor', () => {
  const defaultProps = {
    roundIndex: 0,
    round: createMockRound('Science', 0),
    onUpdateRound: vi.fn(),
    onRemoveRound: vi.fn(),
    canRemove: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render round header with correct title', () => {
      render(<RoundEditor {...defaultProps} />);

      expect(screen.getByText(/Round 1: Science/)).toBeInTheDocument();
    });

    it('should render correct round number for different indices', () => {
      render(<RoundEditor {...defaultProps} roundIndex={2} />);

      expect(screen.getByText(/Round 3: Science/)).toBeInTheDocument();
    });

    it('should show question count badge', () => {
      const round = createMockRound('History', 5);
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show empty state when no questions', () => {
      render(<RoundEditor {...defaultProps} />);

      expect(
        screen.getByText('No questions yet. Add your first question.')
      ).toBeInTheDocument();
    });

    it('should render questions when present', () => {
      const round = createMockRound('Math', 3);
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getAllByText(/Question 1/)).toHaveLength(2); // Label + content
      expect(screen.getAllByText(/Question 2/)).toHaveLength(2);
      expect(screen.getAllByText(/Question 3/)).toHaveLength(2);
    });

    it('should show question options', () => {
      const round = createMockRound('Geography', 1);
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getByText(/Option A/)).toBeInTheDocument();
      expect(screen.getByText(/Option B/)).toBeInTheDocument();
      expect(screen.getByText(/Option C/)).toBeInTheDocument();
      expect(screen.getByText(/Option D/)).toBeInTheDocument();
    });

    it('should highlight correct answer', () => {
      const round: CategoryFormData = {
        id: 'test-round',
        name: 'Test',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctIndex: 1,
          },
        ],
      };
      render(<RoundEditor {...defaultProps} round={round} />);

      const optionB = screen.getByText(/B\./);
      expect(optionB).toHaveClass('font-semibold');
      expect(optionB).toHaveClass('text-green-600');
    });
  });

  describe('collapse/expand functionality', () => {
    it('should start expanded by default', () => {
      render(<RoundEditor {...defaultProps} />);

      expect(screen.getByText('Add Question')).toBeInTheDocument();
    });

    it('should collapse when header is clicked', () => {
      render(<RoundEditor {...defaultProps} />);

      const header = screen.getByRole('button', { name: /Science.*Collapse round/ });
      fireEvent.click(header);

      expect(screen.queryByText('Add Question')).not.toBeInTheDocument();
    });

    it('should expand when clicked again', () => {
      render(<RoundEditor {...defaultProps} />);

      const header = screen.getByRole('button', { name: /Science.*Collapse round/ });

      // Collapse
      fireEvent.click(header);
      expect(screen.queryByText('Add Question')).not.toBeInTheDocument();

      // Expand
      fireEvent.click(header);
      expect(screen.getByText('Add Question')).toBeInTheDocument();
    });

    it('should support controlled collapse state', () => {
      const onToggleCollapse = vi.fn();
      render(
        <RoundEditor
          {...defaultProps}
          isCollapsed={true}
          onToggleCollapse={onToggleCollapse}
        />
      );

      expect(screen.queryByText('Add Question')).not.toBeInTheDocument();

      const header = screen.getByRole('button', { name: /Science.*Expand round/ });
      fireEvent.click(header);

      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('should update aria-expanded attribute', () => {
      render(<RoundEditor {...defaultProps} />);

      const header = screen.getByRole('button', { name: /Science.*Collapse round/ });

      // Initially expanded
      expect(header).toHaveAttribute('aria-expanded', 'true');

      // Collapse
      fireEvent.click(header);

      // After collapse, need to re-query with updated label
      const collapsedHeader = screen.getByRole('button', { name: /Science.*Expand round/ });
      expect(collapsedHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('keyboard accessibility', () => {
    it('should toggle collapse with Enter key', () => {
      render(<RoundEditor {...defaultProps} />);

      const header = screen.getByRole('button', { name: /Science.*Collapse round/ });

      fireEvent.keyDown(header, { key: 'Enter' });
      expect(screen.queryByText('Add Question')).not.toBeInTheDocument();

      const expandedHeader = screen.getByRole('button', { name: /Science.*Expand round/ });
      fireEvent.keyDown(expandedHeader, { key: 'Enter' });
      expect(screen.getByText('Add Question')).toBeInTheDocument();
    });

    it('should toggle collapse with Space key', () => {
      render(<RoundEditor {...defaultProps} />);

      const header = screen.getByRole('button', { name: /Science.*Collapse round/ });

      fireEvent.keyDown(header, { key: ' ' });
      expect(screen.queryByText('Add Question')).not.toBeInTheDocument();
    });

    it('should have tabIndex on header', () => {
      render(<RoundEditor {...defaultProps} />);

      const header = screen.getByRole('button', { name: /Science.*Collapse round/ });
      expect(header).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA labels', () => {
      const round = createMockRound('Art', 3);
      render(<RoundEditor {...defaultProps} round={round} />);

      const header = screen.getByRole('button', {
        name: /Art, 3 questions\. Collapse round/,
      });
      expect(header).toBeInTheDocument();
    });
  });

  describe('add question functionality', () => {
    it('should render Add Question button', () => {
      render(<RoundEditor {...defaultProps} />);

      expect(screen.getByText('Add Question')).toBeInTheDocument();
    });

    it('should call onUpdateRound when Add Question is clicked', () => {
      const onUpdateRound = vi.fn();
      render(<RoundEditor {...defaultProps} onUpdateRound={onUpdateRound} />);

      fireEvent.click(screen.getByText('Add Question'));

      expect(onUpdateRound).toHaveBeenCalledTimes(1);
      expect(onUpdateRound).toHaveBeenCalledWith({
        ...defaultProps.round,
        questions: [
          {
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
          },
        ],
      });
    });

    it('should add question to existing questions', () => {
      const round = createMockRound('Sports', 2);
      const onUpdateRound = vi.fn();
      render(
        <RoundEditor {...defaultProps} round={round} onUpdateRound={onUpdateRound} />
      );

      fireEvent.click(screen.getByText('Add Question'));

      expect(onUpdateRound).toHaveBeenCalledWith({
        ...round,
        questions: [
          ...round.questions,
          {
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
          },
        ],
      });
    });

    it('should have proper aria-label on Add Question button', () => {
      render(<RoundEditor {...defaultProps} />);

      const button = screen.getByLabelText('Add question to Science');
      expect(button).toBeInTheDocument();
    });

    it('should have minimum touch target size', () => {
      render(<RoundEditor {...defaultProps} />);

      const button = screen.getByText('Add Question');
      expect(button).toHaveClass('min-h-[var(--size-touch)]');
    });
  });

  describe('remove round functionality', () => {
    it('should render remove button', () => {
      render(<RoundEditor {...defaultProps} />);

      const removeButton = screen.getByLabelText('Remove Science');
      expect(removeButton).toBeInTheDocument();
    });

    it('should disable remove button when canRemove is false', () => {
      render(<RoundEditor {...defaultProps} canRemove={false} />);

      const removeButton = screen.getByLabelText('Cannot remove last round');
      expect(removeButton).toBeDisabled();
    });

    it('should remove immediately when round has no content', () => {
      const onRemoveRound = vi.fn();
      render(<RoundEditor {...defaultProps} onRemoveRound={onRemoveRound} />);

      const removeButton = screen.getByLabelText('Remove Science');
      fireEvent.click(removeButton);

      expect(onRemoveRound).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog when round has questions', () => {
      const round = createMockRound('Literature', 3);
      render(<RoundEditor {...defaultProps} round={round} />);

      const removeButton = screen.getByLabelText('Remove Literature');
      fireEvent.click(removeButton);

      expect(screen.getByText('Remove Round?')).toBeInTheDocument();
      expect(
        screen.getByText(/This round contains 3 questions/)
      ).toBeInTheDocument();
    });

    it('should show confirmation dialog when round has content', () => {
      const round: CategoryFormData = {
        id: 'test-round',
        name: 'Test',
        questions: [
          {
            question: 'Has content',
            options: ['', '', '', ''],
            correctIndex: 0,
          },
        ],
      };
      render(<RoundEditor {...defaultProps} round={round} />);

      const removeButton = screen.getByLabelText('Remove Test');
      fireEvent.click(removeButton);

      expect(screen.getByText('Remove Round?')).toBeInTheDocument();
    });

    it('should call onRemoveRound when confirmed', () => {
      const round = createMockRound('Music', 2);
      const onRemoveRound = vi.fn();
      render(
        <RoundEditor {...defaultProps} round={round} onRemoveRound={onRemoveRound} />
      );

      const removeButton = screen.getByLabelText('Remove Music');
      fireEvent.click(removeButton);

      const confirmButton = screen.getByText('Remove Round');
      fireEvent.click(confirmButton);

      expect(onRemoveRound).toHaveBeenCalledTimes(1);
    });

    it('should close dialog when cancelled', () => {
      const round = createMockRound('Film', 1);
      const onRemoveRound = vi.fn();
      render(
        <RoundEditor {...defaultProps} round={round} onRemoveRound={onRemoveRound} />
      );

      const removeButton = screen.getByLabelText('Remove Film');
      fireEvent.click(removeButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Remove Round?')).not.toBeInTheDocument();
      expect(onRemoveRound).not.toHaveBeenCalled();
    });

    it('should have proper dialog role and aria attributes', () => {
      const round = createMockRound('Food', 1);
      render(<RoundEditor {...defaultProps} round={round} />);

      const removeButton = screen.getByLabelText('Remove Food');
      fireEvent.click(removeButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'remove-round-dialog-title');
    });

    it('should not propagate click when remove button is clicked', () => {
      const round = createMockRound('Politics', 0);
      render(<RoundEditor {...defaultProps} round={round} />);

      // Start expanded
      expect(screen.getByText('Add Question')).toBeInTheDocument();

      const removeButton = screen.getByLabelText('Remove Politics');
      fireEvent.click(removeButton);

      // Should still be expanded (click didn't propagate to header)
      expect(screen.getByText('Add Question')).toBeInTheDocument();
    });
  });

  describe('visual distinction and styling', () => {
    it('should have border and rounded corners', () => {
      const { container } = render(<RoundEditor {...defaultProps} />);

      const roundContainer = container.querySelector('.border.border-border.rounded-lg');
      expect(roundContainer).toBeInTheDocument();
    });

    it('should have proper spacing between rounds', () => {
      const { container } = render(<RoundEditor {...defaultProps} />);

      const roundContainer = container.querySelector('.mb-4');
      expect(roundContainer).toBeInTheDocument();
    });

    it('should have minimum touch target size on header', () => {
      render(<RoundEditor {...defaultProps} />);

      const header = screen.getByRole('button', { name: /Science.*Collapse round/ });
      expect(header).toHaveClass('min-h-[var(--size-touch)]');
    });

    it('should have minimum touch target size on remove button', () => {
      render(<RoundEditor {...defaultProps} />);

      const removeButton = screen.getByLabelText('Remove Science');
      expect(removeButton).toHaveClass('min-h-[var(--size-touch)]');
      expect(removeButton).toHaveClass('min-w-[var(--size-touch)]');
    });
  });

  describe('question display', () => {
    it('should show placeholder for empty question text', () => {
      const round: CategoryFormData = {
        id: 'test-round',
        name: 'Test',
        questions: [
          {
            question: '',
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
          },
        ],
      };
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getByText('No question text')).toBeInTheDocument();
    });

    it('should show placeholder for empty options', () => {
      const round: CategoryFormData = {
        id: 'test-round',
        name: 'Test',
        questions: [
          {
            question: 'Question text',
            options: ['Full option', '', 'Another option', ''],
            correctIndex: 0,
          },
        ],
      };
      render(<RoundEditor {...defaultProps} round={round} />);

      const emptyOptions = screen.getAllByText('(empty)');
      expect(emptyOptions).toHaveLength(2);
    });

    it('should use correct letter labels for options', () => {
      const round = createMockRound('Test', 1);
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getByText(/A\./)).toBeInTheDocument();
      expect(screen.getByText(/B\./)).toBeInTheDocument();
      expect(screen.getByText(/C\./)).toBeInTheDocument();
      expect(screen.getByText(/D\./)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle round with zero questions', () => {
      render(<RoundEditor {...defaultProps} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(
        screen.getByText('No questions yet. Add your first question.')
      ).toBeInTheDocument();
    });

    it('should handle round with single question', () => {
      const round = createMockRound('Single', 1);
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle round with many questions', () => {
      const round = createMockRound('Many', 50);
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should handle very long round names', () => {
      const longName = 'This is a very long round name that might wrap to multiple lines in the UI';
      const round = createMockRound(longName, 1);
      render(<RoundEditor {...defaultProps} round={round} />);

      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument();
    });
  });
});
