import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LargeCurrentBall } from '../LargeCurrentBall';
import type { BingoBall } from '@/types';

describe('LargeCurrentBall', () => {
  const createBall = (column: 'B' | 'I' | 'N' | 'G' | 'O', number: number): BingoBall => ({
    column,
    number,
    label: `${column}-${number}`,
  });

  describe('shows ball letter and number', () => {
    it('displays the ball column letter', () => {
      const ball = createBall('B', 5);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('displays the ball number', () => {
      const ball = createBall('B', 5);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays the full ball label in aria-label', () => {
      const ball = createBall('G', 47);
      render(<LargeCurrentBall ball={ball} />);

      const ballElement = screen.getByRole('img');
      expect(ballElement).toHaveAttribute('aria-label', 'Ball G-47');
    });

    it('has aria-live polite for screen reader announcements', () => {
      const ball = createBall('O', 65);
      render(<LargeCurrentBall ball={ball} />);

      const ballElement = screen.getByRole('img');
      expect(ballElement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('color coded by column', () => {
    it('applies B column styling (blue)', () => {
      const ball = createBall('B', 1);
      render(<LargeCurrentBall ball={ball} />);

      const ballElement = screen.getByRole('img');
      expect(ballElement.className).toContain('bg-ball-b');
    });

    it('applies I column styling (red)', () => {
      const ball = createBall('I', 16);
      render(<LargeCurrentBall ball={ball} />);

      const ballElement = screen.getByRole('img');
      expect(ballElement.className).toContain('bg-ball-i');
    });

    it('applies N column styling (white/neutral)', () => {
      const ball = createBall('N', 31);
      render(<LargeCurrentBall ball={ball} />);

      const ballElement = screen.getByRole('img');
      expect(ballElement.className).toContain('bg-ball-n');
    });

    it('applies G column styling (green)', () => {
      const ball = createBall('G', 46);
      render(<LargeCurrentBall ball={ball} />);

      const ballElement = screen.getByRole('img');
      expect(ballElement.className).toContain('bg-ball-g');
    });

    it('applies O column styling (orange)', () => {
      const ball = createBall('O', 61);
      render(<LargeCurrentBall ball={ball} />);

      const ballElement = screen.getByRole('img');
      expect(ballElement.className).toContain('bg-ball-o');
    });
  });

  describe('shows placeholder when no ball', () => {
    it('shows question mark when ball is null', () => {
      render(<LargeCurrentBall ball={null} />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('has waiting aria-label when ball is null', () => {
      render(<LargeCurrentBall ball={null} />);

      const placeholder = screen.getByLabelText('Waiting for first ball');
      expect(placeholder).toBeInTheDocument();
    });

    it('does not render ball content when ball is null', () => {
      render(<LargeCurrentBall ball={null} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('applies dashed border styling for placeholder', () => {
      render(<LargeCurrentBall ball={null} />);

      const placeholder = screen.getByLabelText('Waiting for first ball');
      expect(placeholder.className).toContain('border-dashed');
    });
  });

  describe('ball number ranges', () => {
    it('renders B column ball at minimum (B-1)', () => {
      const ball = createBall('B', 1);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders B column ball at maximum (B-15)', () => {
      const ball = createBall('B', 15);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('renders I column ball (I-16 to I-30)', () => {
      const ball = createBall('I', 25);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('I')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('renders N column ball (N-31 to N-45)', () => {
      const ball = createBall('N', 38);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('N')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
    });

    it('renders G column ball (G-46 to G-60)', () => {
      const ball = createBall('G', 52);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('52')).toBeInTheDocument();
    });

    it('renders O column ball at maximum (O-75)', () => {
      const ball = createBall('O', 75);
      render(<LargeCurrentBall ball={ball} />);

      expect(screen.getByText('O')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('transitions between states', () => {
    it('transitions from placeholder to ball', () => {
      const { rerender } = render(<LargeCurrentBall ball={null} />);

      expect(screen.getByText('?')).toBeInTheDocument();

      const ball = createBall('B', 7);
      rerender(<LargeCurrentBall ball={ball} />);

      expect(screen.queryByText('?')).not.toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('transitions between different balls', () => {
      const ball1 = createBall('B', 5);
      const { rerender } = render(<LargeCurrentBall ball={ball1} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Ball B-5');

      const ball2 = createBall('O', 68);
      rerender(<LargeCurrentBall ball={ball2} />);

      expect(screen.getByText('68')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Ball O-68');
    });
  });
});
