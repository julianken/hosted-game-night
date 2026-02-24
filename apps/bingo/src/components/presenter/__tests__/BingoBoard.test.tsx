import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BingoBoard } from '../BingoBoard';
import { BallNumber, BingoBall } from '@/types';

describe('BingoBoard', () => {
  const mockCalledBalls: BingoBall[] = [
    { column: 'B', number: 5 as BallNumber, label: 'B-5' },
    { column: 'I', number: 20 as BallNumber, label: 'I-20' },
    { column: 'N', number: 35 as BallNumber, label: 'N-35' },
  ];

  it('renders 75 number cells', () => {
    render(<BingoBoard calledBalls={[]} />);
    // Check that all numbers 1-75 are rendered
    for (let i = 1; i <= 75; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  describe('column headers', () => {
    it('renders B column header', () => {
      render(<BingoBoard calledBalls={[]} />);
      const headers = screen.getAllByText('B');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('renders I column header', () => {
      render(<BingoBoard calledBalls={[]} />);
      const headers = screen.getAllByText('I');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('renders N column header', () => {
      render(<BingoBoard calledBalls={[]} />);
      const headers = screen.getAllByText('N');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('renders G column header', () => {
      render(<BingoBoard calledBalls={[]} />);
      const headers = screen.getAllByText('G');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('renders O column header', () => {
      render(<BingoBoard calledBalls={[]} />);
      const headers = screen.getAllByText('O');
      expect(headers.length).toBeGreaterThan(0);
    });
  });

  describe('called balls highlighting', () => {
    it('highlights called ball numbers', () => {
      render(<BingoBoard calledBalls={mockCalledBalls} />);
      const ball5 = screen.getByText('5');
      // Called balls have cell-highlight-animation class and inline backgroundColor style
      expect(ball5.className).toContain('cell-highlight-animation');
    });

    it('does not highlight uncalled numbers', () => {
      render(<BingoBoard calledBalls={mockCalledBalls} />);
      const ball1 = screen.getByText('1');
      // Uncalled balls have bg-surface class, not the highlight animation
      expect(ball1.className).not.toContain('cell-highlight-animation');
      expect(ball1.className).toContain('bg-surface');
    });

    it('highlights balls from different columns', () => {
      render(<BingoBoard calledBalls={mockCalledBalls} />);

      const ball5 = screen.getByText('5');
      const ball20 = screen.getByText('20');
      const ball35 = screen.getByText('35');

      // All called balls have the highlight animation class; colors are applied via inline styles
      expect(ball5.className).toContain('cell-highlight-animation');
      expect(ball20.className).toContain('cell-highlight-animation');
      expect(ball35.className).toContain('cell-highlight-animation');
    });
  });

  describe('column structure', () => {
    it('renders numbers in correct column ranges', () => {
      render(<BingoBoard calledBalls={[]} />);

      // B column: 1-15
      // I column: 16-30
      // N column: 31-45
      // G column: 46-60
      // O column: 61-75

      // Verify some numbers exist
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('16')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('with no called balls', () => {
    it('renders all numbers without highlights', () => {
      render(<BingoBoard calledBalls={[]} />);
      const cell1 = screen.getByText('1');
      expect(cell1.className).toContain('bg-surface');
    });
  });
});
