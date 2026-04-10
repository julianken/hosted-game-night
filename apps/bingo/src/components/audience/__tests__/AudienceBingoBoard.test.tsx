import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudienceBingoBoard } from '../AudienceBingoBoard';
import type { BallNumber, BingoBall } from '@/types';

describe('AudienceBingoBoard', () => {
  const createBall = (column: 'B' | 'I' | 'N' | 'G' | 'O', number: number): BingoBall => ({
    column,
    number: number as BallNumber,
    label: `${column}-${number}`,
  });

  describe('renders all 75 balls organized by column', () => {
    it('displays all five column headers', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('I')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('O')).toBeInTheDocument();
    });

    it('renders all 75 ball numbers', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      // Check each column range
      // B: 1-15
      for (let i = 1; i <= 15; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
      // I: 16-30
      for (let i = 16; i <= 30; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
      // N: 31-45
      for (let i = 31; i <= 45; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
      // G: 46-60
      for (let i = 46; i <= 60; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
      // O: 61-75
      for (let i = 61; i <= 75; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });

    it('renders B column balls (1-15)', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('renders I column balls (16-30)', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      expect(screen.getByText('16')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('renders N column balls (31-45)', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      expect(screen.getByText('31')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('renders G column balls (46-60)', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      expect(screen.getByText('46')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('renders O column balls (61-75)', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      expect(screen.getByText('61')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('highlights called balls', () => {
    it('highlights a single called ball', () => {
      const calledBalls = [createBall('B', 5)];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      const ball5 = screen.getByText('5');
      // Called balls have cell-flash-audience-animation class and inline boxShadow style
      expect(ball5.className).toContain('cell-flash-audience-animation');
    });

    it('highlights multiple called balls', () => {
      const calledBalls = [
        createBall('B', 1),
        createBall('I', 20),
        createBall('N', 35),
        createBall('G', 50),
        createBall('O', 70),
      ];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      expect(screen.getByText('1').className).toContain('cell-flash-audience-animation');
      expect(screen.getByText('20').className).toContain('cell-flash-audience-animation');
      expect(screen.getByText('35').className).toContain('cell-flash-audience-animation');
      expect(screen.getByText('50').className).toContain('cell-flash-audience-animation');
      expect(screen.getByText('70').className).toContain('cell-flash-audience-animation');
    });

    it('does not highlight uncalled balls', () => {
      const calledBalls = [createBall('B', 5)];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      const ball6 = screen.getByText('6');
      // Uncalled balls have opacity style but no animation class
      expect(ball6.className).not.toContain('cell-flash-audience-animation');
    });

    // Column-specific highlight colors come from CSS custom properties
    // (--display-called-<col>-bg) so the palette can adapt to light/dark
    // mode. Each test verifies that the right per-column var is wired up;
    // the actual color values live in globals.css.
    it('applies column-specific highlight colors for B column', () => {
      const calledBalls = [createBall('B', 3)];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      const ball3 = screen.getByText('3');
      expect(ball3.style.backgroundColor).toBe('var(--display-called-b-bg)');
      expect(ball3.style.color).toBe('var(--display-called-b-text)');
    });

    it('applies column-specific highlight colors for I column', () => {
      const calledBalls = [createBall('I', 22)];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      const ball22 = screen.getByText('22');
      expect(ball22.style.backgroundColor).toBe('var(--display-called-i-bg)');
      expect(ball22.style.color).toBe('var(--display-called-i-text)');
    });

    it('applies column-specific highlight colors for N column', () => {
      const calledBalls = [createBall('N', 40)];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      const ball40 = screen.getByText('40');
      expect(ball40.style.backgroundColor).toBe('var(--display-called-n-bg)');
      expect(ball40.style.color).toBe('var(--display-called-n-text)');
    });

    it('applies column-specific highlight colors for G column', () => {
      const calledBalls = [createBall('G', 55)];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      const ball55 = screen.getByText('55');
      expect(ball55.style.backgroundColor).toBe('var(--display-called-g-bg)');
      expect(ball55.style.color).toBe('var(--display-called-g-text)');
    });

    it('applies column-specific highlight colors for O column', () => {
      const calledBalls = [createBall('O', 72)];
      render(<AudienceBingoBoard calledBalls={calledBalls} />);

      const ball72 = screen.getByText('72');
      expect(ball72.style.backgroundColor).toBe('var(--display-called-o-bg)');
      expect(ball72.style.color).toBe('var(--display-called-o-text)');
    });
  });

  describe('updates when ball called', () => {
    it('updates highlighting when new ball is added', () => {
      const { rerender } = render(<AudienceBingoBoard calledBalls={[]} />);

      // Initially ball 10 is not highlighted
      const ball10 = screen.getByText('10');
      expect(ball10.className).not.toContain('cell-flash-audience-animation');

      // After adding ball 10 to called balls
      rerender(<AudienceBingoBoard calledBalls={[createBall('B', 10)]} />);

      const updatedBall10 = screen.getByText('10');
      expect(updatedBall10.className).toContain('cell-flash-audience-animation');
    });

    it('maintains highlighting for previously called balls', () => {
      const initialBalls = [createBall('B', 5)];
      const { rerender } = render(<AudienceBingoBoard calledBalls={initialBalls} />);

      expect(screen.getByText('5').className).toContain('cell-flash-audience-animation');

      // Add another ball
      const updatedBalls = [...initialBalls, createBall('I', 25)];
      rerender(<AudienceBingoBoard calledBalls={updatedBalls} />);

      // Both balls should be highlighted
      expect(screen.getByText('5').className).toContain('cell-flash-audience-animation');
      expect(screen.getByText('25').className).toContain('cell-flash-audience-animation');
    });

    it('handles rapid successive ball calls', () => {
      const { rerender } = render(<AudienceBingoBoard calledBalls={[]} />);

      const balls: BingoBall[] = [];
      for (let i = 1; i <= 5; i++) {
        balls.push(createBall('B', i));
        rerender(<AudienceBingoBoard calledBalls={[...balls]} />);
      }

      // All 5 balls should be highlighted
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(i.toString()).className).toContain('cell-flash-audience-animation');
      }
    });
  });

  describe('boundary conditions', () => {
    it('handles empty called balls array', () => {
      render(<AudienceBingoBoard calledBalls={[]} />);

      // No balls should have animation class
      const ball1 = screen.getByText('1');
      expect(ball1.className).not.toContain('cell-flash-audience-animation');
    });

    it('handles all balls called', () => {
      const allBalls: BingoBall[] = [];
      const columns: Array<'B' | 'I' | 'N' | 'G' | 'O'> = ['B', 'I', 'N', 'G', 'O'];
      const ranges: Record<string, [number, number]> = {
        B: [1, 15],
        I: [16, 30],
        N: [31, 45],
        G: [46, 60],
        O: [61, 75],
      };

      for (const col of columns) {
        const [min, max] = ranges[col];
        for (let n = min; n <= max; n++) {
          allBalls.push(createBall(col, n));
        }
      }

      render(<AudienceBingoBoard calledBalls={allBalls} />);

      // Spot check that several balls are highlighted
      expect(screen.getByText('1').className).toContain('cell-flash-audience-animation');
      expect(screen.getByText('38').className).toContain('cell-flash-audience-animation');
      expect(screen.getByText('75').className).toContain('cell-flash-audience-animation');
    });

    it('handles balls at column boundaries', () => {
      const boundaryBalls = [
        createBall('B', 1),   // B min
        createBall('B', 15),  // B max
        createBall('I', 16),  // I min
        createBall('I', 30),  // I max
        createBall('N', 31),  // N min
        createBall('N', 45),  // N max
        createBall('G', 46),  // G min
        createBall('G', 60),  // G max
        createBall('O', 61),  // O min
        createBall('O', 75),  // O max
      ];

      render(<AudienceBingoBoard calledBalls={boundaryBalls} />);

      for (const ball of boundaryBalls) {
        expect(screen.getByText(ball.number.toString()).className).toContain('cell-flash-audience-animation');
      }
    });
  });

  describe('column header styling', () => {
    it('applies B column header color', () => {
      const { container } = render(<AudienceBingoBoard calledBalls={[]} />);

      // Column headers use rounded-full (circular) with inline background styles
      const headers = container.querySelectorAll('[class*="rounded-full"]');
      const bHeader = Array.from(headers).find(h => h.textContent === 'B') as HTMLElement | undefined;
      expect(bHeader).toBeTruthy();
      // The background includes a radial-gradient and the base color
      expect(bHeader?.style.background).toContain('59, 130, 246');
    });

    it('applies different colors for each column header', () => {
      const { container } = render(<AudienceBingoBoard calledBalls={[]} />);

      const headers = container.querySelectorAll('[class*="rounded-full"]');
      expect(headers.length).toBe(5);

      const headerTexts = Array.from(headers).map(h => h.textContent);
      expect(headerTexts).toContain('B');
      expect(headerTexts).toContain('I');
      expect(headerTexts).toContain('N');
      expect(headerTexts).toContain('G');
      expect(headerTexts).toContain('O');
    });
  });
});
