/**
 * Tests for TemplateCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateCard } from '../TemplateCard';
import type { Template } from '../../../app/api/templates/route';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('TemplateCard', () => {
  const mockBingoTemplate: Template = {
    game: 'bingo',
    id: 'bingo-1',
    user_id: 'user-1',
    name: 'Standard Bingo',
    pattern_id: 'standard',
    voice_pack: 'classic',
    auto_call_enabled: false,
    auto_call_interval: 5000,
    is_default: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  };

  const mockTriviaTemplate: Template = {
    game: 'trivia',
    id: 'trivia-1',
    user_id: 'user-1',
    name: 'General Knowledge',
    questions: [
      {
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctIndex: 1,
      },
      {
        question: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin'],
        correctIndex: 1,
      },
    ],
    rounds_count: 3,
    questions_per_round: 10,
    timer_duration: 30,
    is_default: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  };

  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnDelete.mockClear();
    mockPush.mockClear();
  });

  it('should render Bingo template with correct details', () => {
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Standard Bingo')).toBeInTheDocument();
    expect(screen.getByText('Bingo')).toBeInTheDocument();
    expect(screen.getByText(/Pattern: Standard/)).toBeInTheDocument();
  });

  it('should render Trivia template with correct details', () => {
    render(
      <TemplateCard template={mockTriviaTemplate} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('General Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Trivia')).toBeInTheDocument();
    expect(screen.getByText('2 questions')).toBeInTheDocument();
  });

  it('should display default marker for default templates', () => {
    const defaultTemplate: Template = {
      ...mockBingoTemplate,
      is_default: true,
    };

    render(<TemplateCard template={defaultTemplate} onDelete={mockOnDelete} />);

    expect(screen.getByText(/Default/)).toBeInTheDocument();
  });

  it('should not display default marker for non-default templates', () => {
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    expect(screen.queryByText(/Default/)).not.toBeInTheDocument();
  });

  it('should show confirmation dialog when delete is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteButton);

    expect(screen.getByText('Delete this template?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Confirm Delete/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('should call onDelete when confirmed', async () => {
    const user = userEvent.setup();
    mockOnDelete.mockResolvedValueOnce(undefined);

    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteButton);

    // Confirm delete
    const confirmButton = screen.getByRole('button', {
      name: /Confirm Delete/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('bingo-1', 'bingo');
    });
  });

  it('should cancel delete when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteButton);

    // Cancel delete
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByText('Delete this template?')).not.toBeInTheDocument();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('should disable buttons while deleting', async () => {
    const user = userEvent.setup();
    mockOnDelete.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteButton);

    // Confirm delete
    const confirmButton = screen.getByRole('button', {
      name: /Confirm Delete/i,
    });
    await user.click(confirmButton);

    // Buttons should be disabled
    expect(
      screen.getByRole('button', { name: /Deleting/i })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
  });

  it('should format pattern_id with hyphens correctly for Bingo', () => {
    const bingoTemplate: Template = {
      ...mockBingoTemplate,
      pattern_id: 'four-corners',
    };

    render(<TemplateCard template={bingoTemplate} onDelete={mockOnDelete} />);

    expect(screen.getByText('Pattern: Four Corners')).toBeInTheDocument();
  });

  it('should handle single question correctly for Trivia', () => {
    const triviaTemplate: Template = {
      ...mockTriviaTemplate,
      questions: [
        {
          question: 'What is 2+2?',
          options: ['3', '4', '5'],
          correctIndex: 1,
        },
      ],
    };

    render(<TemplateCard template={triviaTemplate} onDelete={mockOnDelete} />);

    expect(screen.getByText('1 question')).toBeInTheDocument();
  });

  it('should handle empty questions array for Trivia', () => {
    const triviaTemplate: Template = {
      ...mockTriviaTemplate,
      questions: [],
    };

    render(<TemplateCard template={triviaTemplate} onDelete={mockOnDelete} />);

    expect(screen.getByText('0 questions')).toBeInTheDocument();
  });

  it('should display Bingo badge with correct styling', () => {
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    const badge = screen.getByText('Bingo');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
  });

  it('should display Trivia badge with correct styling', () => {
    render(
      <TemplateCard template={mockTriviaTemplate} onDelete={mockOnDelete} />
    );

    const badge = screen.getByText('Trivia');
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-800', 'border-purple-200');
  });

  it('should meet senior-friendly design requirements', () => {
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    // Check for large text
    const title = screen.getByText('Standard Bingo');
    expect(title).toHaveClass('text-xl');

    // Check for large button (min-h-[44px] = 44px touch target)
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    expect(deleteButton).toHaveClass('min-h-[44px]');
  });

  it('should handle delete errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnDelete.mockRejectedValueOnce(new Error('Network error'));

    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    // Click delete
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteButton);

    // Confirm delete
    const confirmButton = screen.getByRole('button', {
      name: /Confirm Delete/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to delete template:',
        expect.any(Error)
      );
    });

    // Dialog should close after error
    await waitFor(() => {
      expect(
        screen.queryByText('Delete this template?')
      ).not.toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should navigate to detail page when View Details is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    const viewDetailsButton = screen.getByRole('button', {
      name: /View Details/i,
    });
    await user.click(viewDetailsButton);

    expect(mockPush).toHaveBeenCalledWith(
      '/dashboard/templates/bingo-1?game=bingo'
    );
  });

  it('should navigate to Trivia detail page with correct game param', async () => {
    const user = userEvent.setup();
    render(
      <TemplateCard template={mockTriviaTemplate} onDelete={mockOnDelete} />
    );

    const viewDetailsButton = screen.getByRole('button', {
      name: /View Details/i,
    });
    await user.click(viewDetailsButton);

    expect(mockPush).toHaveBeenCalledWith(
      '/dashboard/templates/trivia-1?game=trivia'
    );
  });

  it('should have View Details button with correct styling', () => {
    render(
      <TemplateCard template={mockBingoTemplate} onDelete={mockOnDelete} />
    );

    const viewDetailsButton = screen.getByRole('button', {
      name: /View Details/i,
    });
    expect(viewDetailsButton).toHaveClass(
      'min-h-[44px]',
      'bg-blue-50',
      'text-blue-700'
    );
  });
});
