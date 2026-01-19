import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BallsCalledCounter } from '../BallsCalledCounter';

describe('BallsCalledCounter', () => {
  describe('shows count display', () => {
    it('displays the called count', () => {
      render(<BallsCalledCounter called={10} remaining={65} />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('displays the remaining count', () => {
      render(<BallsCalledCounter called={10} remaining={65} />);

      expect(screen.getByText('65')).toBeInTheDocument();
    });

    it('displays "Called" label', () => {
      render(<BallsCalledCounter called={10} remaining={65} />);

      expect(screen.getByText('Called')).toBeInTheDocument();
    });

    it('displays "Remaining" label', () => {
      render(<BallsCalledCounter called={10} remaining={65} />);

      expect(screen.getByText('Remaining')).toBeInTheDocument();
    });

    it('displays the divider between counts', () => {
      render(<BallsCalledCounter called={10} remaining={65} />);

      expect(screen.getByText('/')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('renders progressbar with correct aria attributes', () => {
      render(<BallsCalledCounter called={25} remaining={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '25');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '75');
    });

    it('has accessible label on progressbar', () => {
      render(<BallsCalledCounter called={25} remaining={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', '25 of 75 balls called');
    });

    it('updates progress width based on called count', () => {
      const { rerender } = render(<BallsCalledCounter called={0} remaining={75} />);

      let progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '0%' });

      rerender(<BallsCalledCounter called={75} remaining={0} />);
      progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '100%' });
    });

    it('calculates correct progress percentage', () => {
      render(<BallsCalledCounter called={15} remaining={60} />);

      const progressbar = screen.getByRole('progressbar');
      // 15/75 = 20%
      expect(progressbar).toHaveStyle({ width: '20%' });
    });
  });

  describe('updates when ball called', () => {
    it('updates called count on rerender', () => {
      const { rerender } = render(<BallsCalledCounter called={5} remaining={70} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('70')).toBeInTheDocument();

      rerender(<BallsCalledCounter called={6} remaining={69} />);

      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('69')).toBeInTheDocument();
    });

    it('updates progressbar aria-valuenow on rerender', () => {
      const { rerender } = render(<BallsCalledCounter called={10} remaining={65} />);

      let progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '10');
      expect(progressbar).toHaveAttribute('aria-label', '10 of 75 balls called');

      rerender(<BallsCalledCounter called={11} remaining={64} />);

      progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '11');
      expect(progressbar).toHaveAttribute('aria-label', '11 of 75 balls called');
    });
  });

  describe('boundary values', () => {
    it('displays zero called and 75 remaining at game start', () => {
      render(<BallsCalledCounter called={0} remaining={75} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      expect(progressbar).toHaveStyle({ width: '0%' });
    });

    it('displays 75 called and 0 remaining when all balls called', () => {
      render(<BallsCalledCounter called={75} remaining={0} />);

      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveStyle({ width: '100%' });
    });

    it('handles single ball called', () => {
      render(<BallsCalledCounter called={1} remaining={74} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('74')).toBeInTheDocument();

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', '1 of 75 balls called');
    });

    it('handles mid-game state', () => {
      render(<BallsCalledCounter called={37} remaining={38} />);

      expect(screen.getByText('37')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();

      const progressbar = screen.getByRole('progressbar');
      // 37/75 = 49.33...%
      expect(progressbar).toHaveAttribute('aria-valuenow', '37');
    });
  });
});
