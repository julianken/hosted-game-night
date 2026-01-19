import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PauseOverlay } from '../PauseOverlay';

describe('PauseOverlay', () => {
  describe('normal pause mode', () => {
    it('should render "Game Paused" message', () => {
      render(<PauseOverlay />);

      expect(screen.getByText('Game Paused')).toBeInTheDocument();
      expect(
        screen.getByText('Waiting for the host to resume...')
      ).toBeInTheDocument();
    });

    it('should render pause icon', () => {
      render(<PauseOverlay />);

      const pauseIcon = screen.getByRole('alert');
      expect(pauseIcon).toHaveAttribute('aria-label', 'Game paused');
    });

    it('should have accessible alert role', () => {
      render(<PauseOverlay />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('emergency pause mode', () => {
    it('should render blank screen when emergencyBlank is true', () => {
      render(<PauseOverlay emergencyBlank={true} />);

      // Should not show the normal pause message
      expect(screen.queryByText('Game Paused')).not.toBeInTheDocument();

      // Should have an alert for screen readers
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute(
        'aria-label',
        'Display blanked for emergency'
      );
    });

    it('should have background-only styling in emergency mode', () => {
      const { container } = render(<PauseOverlay emergencyBlank={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('bg-background');
      expect(overlay).not.toHaveClass('backdrop-blur-sm');
    });
  });

  describe('timer display', () => {
    it('should show frozen timer when timer was running', () => {
      const timer = {
        duration: 30,
        remaining: 15,
        isRunning: false,
      };

      render(<PauseOverlay timer={timer} />);

      expect(screen.getByText('Timer frozen at')).toBeInTheDocument();
      expect(screen.getByText('0:15')).toBeInTheDocument();
    });

    it('should show timer in MM:SS format', () => {
      const timer = {
        duration: 120,
        remaining: 65,
        isRunning: false,
      };

      render(<PauseOverlay timer={timer} />);

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should not show timer when at full duration', () => {
      const timer = {
        duration: 30,
        remaining: 30,
        isRunning: false,
      };

      render(<PauseOverlay timer={timer} />);

      expect(screen.queryByText('Timer frozen at')).not.toBeInTheDocument();
    });

    it('should not show timer in emergency mode', () => {
      const timer = {
        duration: 30,
        remaining: 15,
        isRunning: false,
      };

      render(<PauseOverlay emergencyBlank={true} timer={timer} />);

      expect(screen.queryByText('Timer frozen at')).not.toBeInTheDocument();
      expect(screen.queryByText('0:15')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have aria-live="polite" for normal pause', () => {
      render(<PauseOverlay />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-live="assertive" for emergency pause', () => {
      render(<PauseOverlay emergencyBlank={true} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('styling', () => {
    it('should be full-screen overlay', () => {
      const { container } = render(<PauseOverlay />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('should have pulsing indicator', () => {
      render(<PauseOverlay />);

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });
  });
});
