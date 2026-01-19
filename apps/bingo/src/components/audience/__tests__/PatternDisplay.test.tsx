import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatternDisplay } from '../PatternDisplay';
import type { BingoPattern } from '@/types';

describe('PatternDisplay', () => {
  const mockPattern: BingoPattern = {
    id: 'horizontal-line-1',
    name: 'Horizontal Line',
    category: 'lines',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ],
    description: 'Complete the top horizontal line',
  };

  const mockPatternWithoutDescription: BingoPattern = {
    id: 'corners',
    name: 'Four Corners',
    category: 'corners',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 4 },
      { row: 4, col: 0 },
      { row: 4, col: 4 },
    ],
  };

  describe('renders 5x5 grid with headers', () => {
    it('displays all five column headers (B, I, N, G, O)', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('I')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('O')).toBeInTheDocument();
    });

    it('renders 25 cells (5x5 grid)', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      const requiredCells = screen.getAllByLabelText('Required for pattern');
      const notRequiredCells = screen.getAllByLabelText('Not required');

      expect(requiredCells.length + notRequiredCells.length).toBe(25);
    });

    it('displays FREE text in the center cell', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      expect(screen.getByText('FREE')).toBeInTheDocument();
    });
  });

  describe('marks required cells from pattern', () => {
    it('marks cells that are part of the pattern', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      // Horizontal line pattern has 5 cells in row 0
      const requiredCells = screen.getAllByLabelText('Required for pattern');
      expect(requiredCells.length).toBe(5);
    });

    it('leaves non-pattern cells unmarked', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      // 25 total cells - 5 pattern cells = 20 unmarked
      const notRequiredCells = screen.getAllByLabelText('Not required');
      expect(notRequiredCells.length).toBe(20);
    });

    it('correctly marks corner pattern cells', () => {
      render(<PatternDisplay pattern={mockPatternWithoutDescription} />);

      // Four corners pattern has 4 cells
      const requiredCells = screen.getAllByLabelText('Required for pattern');
      expect(requiredCells.length).toBe(4);
    });
  });

  describe('shows pattern name and description', () => {
    it('displays the Winning Pattern heading', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      expect(screen.getByText('Winning Pattern')).toBeInTheDocument();
    });

    it('displays the pattern name', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      expect(screen.getByText('Horizontal Line')).toBeInTheDocument();
    });

    it('displays the pattern description when provided', () => {
      render(<PatternDisplay pattern={mockPattern} />);

      expect(screen.getByText('Complete the top horizontal line')).toBeInTheDocument();
    });

    it('does not display description when not provided', () => {
      render(<PatternDisplay pattern={mockPatternWithoutDescription} />);

      expect(screen.getByText('Four Corners')).toBeInTheDocument();
      expect(screen.queryByText('Complete the top horizontal line')).not.toBeInTheDocument();
    });
  });

  describe('handles null pattern', () => {
    it('displays "No pattern selected" message when pattern is null', () => {
      render(<PatternDisplay pattern={null} />);

      expect(screen.getByText('No pattern selected')).toBeInTheDocument();
    });

    it('still displays the Winning Pattern heading when pattern is null', () => {
      render(<PatternDisplay pattern={null} />);

      expect(screen.getByText('Winning Pattern')).toBeInTheDocument();
    });

    it('does not render the grid when pattern is null', () => {
      render(<PatternDisplay pattern={null} />);

      expect(screen.queryByLabelText('Required for pattern')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Not required')).not.toBeInTheDocument();
    });

    it('does not render column headers when pattern is null', () => {
      render(<PatternDisplay pattern={null} />);

      // B, I, N, G, O headers should not be present when no pattern
      expect(screen.queryByText('B')).not.toBeInTheDocument();
      expect(screen.queryByText('I')).not.toBeInTheDocument();
      expect(screen.queryByText('N')).not.toBeInTheDocument();
      expect(screen.queryByText('G')).not.toBeInTheDocument();
      expect(screen.queryByText('O')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles pattern with cells at grid boundaries', () => {
      const edgePattern: BingoPattern = {
        id: 'edge-test',
        name: 'Edge Test',
        category: 'shapes',
        cells: [
          { row: 0, col: 0 }, // top-left
          { row: 0, col: 4 }, // top-right
          { row: 4, col: 0 }, // bottom-left
          { row: 4, col: 4 }, // bottom-right
        ],
      };

      render(<PatternDisplay pattern={edgePattern} />);

      const requiredCells = screen.getAllByLabelText('Required for pattern');
      expect(requiredCells.length).toBe(4);
    });

    it('handles pattern with center cell (free space)', () => {
      const centerPattern: BingoPattern = {
        id: 'center-test',
        name: 'Center Test',
        category: 'shapes',
        cells: [
          { row: 2, col: 2 }, // center (free space)
        ],
      };

      render(<PatternDisplay pattern={centerPattern} />);

      const requiredCells = screen.getAllByLabelText('Required for pattern');
      expect(requiredCells.length).toBe(1);
      // The FREE text should still be visible in the center cell
      expect(screen.getByText('FREE')).toBeInTheDocument();
    });

    it('handles empty cells array', () => {
      const emptyPattern: BingoPattern = {
        id: 'empty-test',
        name: 'Empty Pattern',
        category: 'shapes',
        cells: [],
      };

      render(<PatternDisplay pattern={emptyPattern} />);

      // All cells should be unmarked
      const notRequiredCells = screen.getAllByLabelText('Not required');
      expect(notRequiredCells.length).toBe(25);
    });
  });
});
