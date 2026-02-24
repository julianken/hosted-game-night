import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatternSelector, PatternPreview } from '../PatternSelector';
import { BingoPattern } from '@/types';
// Import to ensure patterns are registered
import '@/lib/game/patterns';

describe('PatternSelector', () => {
  const mockPattern: BingoPattern = {
    id: 'row-top',
    name: 'Top Row',
    category: 'lines',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ],
    description: 'Complete the top row',
  };

  const defaultProps = {
    selectedPattern: null,
    onSelect: vi.fn(),
  };

  it('renders with placeholder when no pattern selected', () => {
    render(<PatternSelector {...defaultProps} />);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('shows selected pattern', () => {
    render(<PatternSelector {...defaultProps} selectedPattern={mockPattern} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('row-top');
  });

  it('shows pattern options grouped by category', () => {
    render(<PatternSelector {...defaultProps} />);
    // Check for optgroup labels
    expect(screen.getByRole('group', { name: 'Lines' })).toBeInTheDocument();
  });

  it('calls onSelect when pattern chosen', () => {
    const handleSelect = vi.fn();
    render(<PatternSelector {...defaultProps} onSelect={handleSelect} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'row-top' } });

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect.mock.calls[0][0].id).toBe('row-top');
  });

  it('disables when disabled prop is true', () => {
    render(<PatternSelector {...defaultProps} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('shows pattern description when selected', () => {
    const patternWithDesc: BingoPattern = {
      ...mockPattern,
      description: 'Test description',
    };
    render(<PatternSelector {...defaultProps} selectedPattern={patternWithDesc} />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('shows Winning Pattern label', () => {
    render(<PatternSelector {...defaultProps} />);
    expect(screen.getByText('Winning Pattern')).toBeInTheDocument();
  });
});

describe('PatternPreview', () => {
  const mockPattern: BingoPattern = {
    id: 'test-pattern',
    name: 'Test Pattern',
    category: 'shapes',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 4 },
      { row: 2, col: 2 },
      { row: 4, col: 0 },
      { row: 4, col: 4 },
    ],
  };

  it('shows empty state when no pattern', () => {
    const { container } = render(<PatternPreview pattern={null} />);
    // PatternPreview returns null when no pattern is provided
    expect(container.innerHTML).toBe('');
  });

  it('shows Pattern Preview heading', () => {
    render(<PatternPreview pattern={mockPattern} />);
    expect(screen.getByText('Pattern Preview')).toBeInTheDocument();
  });

  it('displays pattern cells correctly', () => {
    render(<PatternPreview pattern={mockPattern} />);
    // The grid should render 25 cells (5x5)
    // Some will be marked as required (bg-primary), others not
    const cells = document.querySelectorAll('[title]');
    expect(cells.length).toBe(25);
  });

  it('marks required cells', () => {
    render(<PatternPreview pattern={mockPattern} />);
    const requiredCells = document.querySelectorAll('[title="Required"]');
    expect(requiredCells.length).toBe(mockPattern.cells.length);
  });

  it('marks non-required cells', () => {
    render(<PatternPreview pattern={mockPattern} />);
    const notRequiredCells = document.querySelectorAll('[title="Not required"]');
    expect(notRequiredCells.length).toBe(25 - mockPattern.cells.length);
  });

  it('applies bg-primary to required cells', () => {
    render(<PatternPreview pattern={mockPattern} />);
    const requiredCells = document.querySelectorAll('[title="Required"]');
    requiredCells.forEach((cell) => {
      expect(cell.className).toContain('bg-primary');
    });
  });
});
