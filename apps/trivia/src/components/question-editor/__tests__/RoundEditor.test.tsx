import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoundEditor } from '../RoundEditor';
import type { CategoryFormData } from '../QuestionSetEditorModal.utils';

describe('RoundEditor', () => {
  const mockRound: CategoryFormData = {
    id: 'science',
    name: 'Science',
    questions: [],
  };

  const defaultProps = {
    roundIndex: 0,
    round: mockRound,
    onUpdateRound: vi.fn(),
    onRemoveRound: vi.fn(),
    onAddQuestion: vi.fn(),
    canRemove: true,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
  };

  it('renders round header with correct round number', () => {
    render(<RoundEditor {...defaultProps} />);
    expect(screen.getByText('Round 1')).toBeInTheDocument();
  });

  it('displays question count badge', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
        { id: '2', question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    render(<RoundEditor {...defaultProps} round={roundWithQuestions} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when no questions exist', () => {
    render(<RoundEditor {...defaultProps} />);
    expect(screen.getByText('No questions yet. Add your first question.')).toBeInTheDocument();
  });

  it('does not show empty state when questions exist', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    render(<RoundEditor {...defaultProps} round={roundWithQuestions} />);
    expect(screen.queryByText('No questions yet. Add your first question.')).not.toBeInTheDocument();
  });

  it('calls onToggleCollapse when header is clicked', () => {
    const onToggleCollapse = vi.fn();
    render(<RoundEditor {...defaultProps} onToggleCollapse={onToggleCollapse} />);

    const toggleButton = screen.getByRole('button', { name: /Round 1.*Press to collapse/i });
    fireEvent.click(toggleButton);

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('toggles collapse state with keyboard (Space)', () => {
    const onToggleCollapse = vi.fn();
    render(<RoundEditor {...defaultProps} onToggleCollapse={onToggleCollapse} />);

    const toggleButton = screen.getByRole('button', { name: /Round 1.*Press to collapse/i });
    fireEvent.keyDown(toggleButton, { key: ' ' });

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('toggles collapse state with keyboard (Enter)', () => {
    const onToggleCollapse = vi.fn();
    render(<RoundEditor {...defaultProps} onToggleCollapse={onToggleCollapse} />);

    const toggleButton = screen.getByRole('button', { name: /Round 1.*Press to collapse/i });
    fireEvent.keyDown(toggleButton, { key: 'Enter' });

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('hides content when collapsed', () => {
    render(<RoundEditor {...defaultProps} isCollapsed={true} />);

    // Add Question button should not be visible
    expect(screen.queryByText('+ Add Question')).not.toBeInTheDocument();
  });

  it('shows content when expanded', () => {
    render(<RoundEditor {...defaultProps} isCollapsed={false} />);

    // Add Question button should be visible
    expect(screen.getByText('+ Add Question')).toBeInTheDocument();
  });

  it('calls onAddQuestion when Add Question button is clicked', () => {
    const onAddQuestion = vi.fn();
    render(<RoundEditor {...defaultProps} onAddQuestion={onAddQuestion} />);

    const addButton = screen.getByText('+ Add Question');
    fireEvent.click(addButton);

    expect(onAddQuestion).toHaveBeenCalledTimes(1);
  });

  it('calls onRemoveRound immediately when round has no questions', () => {
    const onRemoveRound = vi.fn();
    render(<RoundEditor {...defaultProps} onRemoveRound={onRemoveRound} />);

    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton);

    expect(onRemoveRound).toHaveBeenCalledTimes(1);
  });

  it('shows confirmation dialog when removing round with questions', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    const onRemoveRound = vi.fn();
    render(<RoundEditor {...defaultProps} round={roundWithQuestions} onRemoveRound={onRemoveRound} />);

    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton);

    // Should show confirmation dialog
    expect(screen.getByText('Remove Round 1?')).toBeInTheDocument();
    expect(screen.getByText(/This round contains 1 question/)).toBeInTheDocument();

    // Should not have called onRemoveRound yet
    expect(onRemoveRound).not.toHaveBeenCalled();
  });

  it('removes round after confirming dialog', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
        { id: '2', question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    const onRemoveRound = vi.fn();
    render(<RoundEditor {...defaultProps} round={roundWithQuestions} onRemoveRound={onRemoveRound} />);

    // Click remove button
    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton);

    // Confirm removal
    const confirmButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(confirmButton);

    expect(onRemoveRound).toHaveBeenCalledTimes(1);
  });

  it('cancels removal when clicking Cancel in dialog', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    const onRemoveRound = vi.fn();
    render(<RoundEditor {...defaultProps} round={roundWithQuestions} onRemoveRound={onRemoveRound} />);

    // Click remove button
    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton);

    // Cancel removal
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onRemoveRound).not.toHaveBeenCalled();
    // Dialog should be closed
    expect(screen.queryByText('Remove Round 1?')).not.toBeInTheDocument();
  });

  it('disables remove button when canRemove is false', () => {
    render(<RoundEditor {...defaultProps} canRemove={false} />);

    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    expect(removeButton).toBeDisabled();
  });

  it('disables all controls when disabled prop is true', () => {
    render(<RoundEditor {...defaultProps} disabled={true} />);

    const toggleButton = screen.getByRole('button', { name: /Round 1.*Press to collapse/i });
    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    const addButton = screen.getByRole('button', { name: 'Add question to Round 1' });

    expect(toggleButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
    expect(addButton).toBeDisabled();
  });

  it('has correct ARIA attributes for accessibility', () => {
    render(<RoundEditor {...defaultProps} />);

    // Region should have aria-label
    const region = screen.getByRole('region', { name: 'Round 1' });
    expect(region).toBeInTheDocument();

    // Toggle button should have aria-expanded
    const toggleButton = screen.getByRole('button', { name: /Round 1.*Press to collapse/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('updates aria-expanded when collapsed', () => {
    render(<RoundEditor {...defaultProps} isCollapsed={true} />);

    const toggleButton = screen.getByRole('button', { name: /Round 1.*Press to expand/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('has minimum 56px touch target for header', () => {
    render(<RoundEditor {...defaultProps} />);

    const toggleButton = screen.getByRole('button', { name: /Round 1.*Press to collapse/i });

    // Check min-height is set (actual rendering would verify 56px)
    expect(toggleButton.className).toContain('min-h-[56px]');
  });

  it('renders children when expanded and has questions', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    render(
      <RoundEditor {...defaultProps} round={roundWithQuestions}>
        <div data-testid="question-child">Question Component</div>
      </RoundEditor>
    );

    expect(screen.getByTestId('question-child')).toBeInTheDocument();
  });

  it('displays correct plural/singular text in confirmation dialog', () => {
    const roundWithOneQuestion: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    const { rerender } = render(<RoundEditor {...defaultProps} round={roundWithOneQuestion} />);

    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton);

    expect(screen.getByText(/This round contains 1 question\./)).toBeInTheDocument();

    // Close dialog
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Test plural
    const roundWithMultipleQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
        { id: '2', question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    rerender(<RoundEditor {...defaultProps} round={roundWithMultipleQuestions} />);

    const removeButton2 = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton2);

    expect(screen.getByText(/This round contains 2 questions\./)).toBeInTheDocument();
  });

  it('closes confirmation dialog when Escape key is pressed', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    const onRemoveRound = vi.fn();
    render(<RoundEditor {...defaultProps} round={roundWithQuestions} onRemoveRound={onRemoveRound} />);

    // Click remove button to show dialog
    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton);

    // Verify dialog is shown
    expect(screen.getByText('Remove Round 1?')).toBeInTheDocument();

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    // Dialog should be closed
    expect(screen.queryByText('Remove Round 1?')).not.toBeInTheDocument();

    // Should not have called onRemoveRound
    expect(onRemoveRound).not.toHaveBeenCalled();
  });

  it('prevents body scroll when confirmation dialog is open', () => {
    const roundWithQuestions: CategoryFormData = {
      ...mockRound,
      questions: [
        { id: '1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, type: 'multiple_choice' as const, category: 'general_knowledge' as const, explanation: '' },
      ],
    };

    render(<RoundEditor {...defaultProps} round={roundWithQuestions} />);

    // Initially, body should not have overflow hidden
    expect(document.body.style.overflow).toBe('');

    // Click remove button to show dialog
    const removeButton = screen.getByRole('button', { name: 'Remove Round 1' });
    fireEvent.click(removeButton);

    // Body should now have overflow hidden
    expect(document.body.style.overflow).toBe('hidden');

    // Press Escape key to close dialog
    fireEvent.keyDown(document, { key: 'Escape' });

    // Body overflow should be restored
    expect(document.body.style.overflow).toBe('');
  });
});
