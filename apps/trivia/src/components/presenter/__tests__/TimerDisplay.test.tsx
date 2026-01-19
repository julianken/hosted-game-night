import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { useGameStore } from '@/stores/game-store';
import { useSettingsStore } from '@/stores/settings-store';
import { createInitialState } from '@/lib/game/engine';

// Mock the stores
vi.mock('@/stores/game-store', async () => {
  const { create } = await import('zustand');

  // Create a mock timer state
  const initialTimerState = {
    timer: {
      duration: 30,
      remaining: 30,
      isRunning: false,
    },
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    resetTimer: vi.fn(),
    tickTimer: vi.fn(),
  };

  const useGameStore = create(() => initialTimerState);

  return {
    useGameStore,
    useTimerState: () => ({
      remaining: useGameStore.getState().timer.remaining,
      duration: useGameStore.getState().timer.duration,
      isRunning: useGameStore.getState().timer.isRunning,
    }),
    useTimerActions: () => ({
      startTimer: useGameStore.getState().startTimer,
      stopTimer: useGameStore.getState().stopTimer,
      resetTimer: useGameStore.getState().resetTimer,
      tickTimer: useGameStore.getState().tickTimer,
    }),
  };
});

vi.mock('@/stores/settings-store', async () => {
  const { create } = await import('zustand');

  const useSettingsStore = create(() => ({
    timerDuration: 30,
    timerAutoStart: false,
    timerVisible: true,
  }));

  return {
    useSettingsStore,
    useTimerSettings: () => ({
      timerDuration: useSettingsStore.getState().timerDuration,
      timerAutoStart: useSettingsStore.getState().timerAutoStart,
      timerVisible: useSettingsStore.getState().timerVisible,
    }),
  };
});

describe('TimerDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Reset store state
    useGameStore.setState({
      timer: {
        duration: 30,
        remaining: 30,
        isRunning: false,
      },
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      resetTimer: vi.fn(),
      tickTimer: vi.fn(),
    });

    useSettingsStore.setState({
      timerDuration: 30,
      timerAutoStart: false,
      timerVisible: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render timer header', () => {
      render(<TimerDisplay />);
      expect(screen.getByText('Timer')).toBeInTheDocument();
    });

    it('should render time remaining with large text', () => {
      render(<TimerDisplay />);

      const timerElement = screen.getByRole('timer');
      expect(timerElement).toBeInTheDocument();
      expect(timerElement).toHaveTextContent('30');
      expect(timerElement).toHaveClass('text-5xl');
    });

    it('should show "Stopped" status when timer is not running', () => {
      render(<TimerDisplay />);
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });

    it('should show "Running" status when timer is running', () => {
      useGameStore.setState({
        timer: {
          duration: 30,
          remaining: 25,
          isRunning: true,
        },
      });

      render(<TimerDisplay />);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<TimerDisplay />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render duration info', () => {
      render(<TimerDisplay />);
      expect(screen.getByText('Duration: 30s')).toBeInTheDocument();
    });
  });

  describe('controls', () => {
    it('should render Start button when timer is stopped', () => {
      render(<TimerDisplay />);
      expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument();
    });

    it('should render Stop button when timer is running', () => {
      useGameStore.setState({
        timer: {
          duration: 30,
          remaining: 25,
          isRunning: true,
        },
      });

      render(<TimerDisplay />);
      expect(screen.getByRole('button', { name: /stop timer/i })).toBeInTheDocument();
    });

    it('should render Reset button', () => {
      render(<TimerDisplay />);
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
    });

    it('should call startTimer when Start button is clicked', () => {
      const startTimer = vi.fn();
      useGameStore.setState({
        timer: { duration: 30, remaining: 30, isRunning: false },
        startTimer,
      });

      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole('button', { name: /start timer/i }));

      expect(startTimer).toHaveBeenCalled();
    });

    it('should call stopTimer when Stop button is clicked', () => {
      const stopTimer = vi.fn();
      useGameStore.setState({
        timer: { duration: 30, remaining: 25, isRunning: true },
        stopTimer,
      });

      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole('button', { name: /stop timer/i }));

      expect(stopTimer).toHaveBeenCalled();
    });

    it('should call resetTimer when Reset button is clicked', () => {
      const resetTimer = vi.fn();
      useGameStore.setState({
        timer: { duration: 30, remaining: 15, isRunning: false },
        resetTimer,
      });

      render(<TimerDisplay />);
      fireEvent.click(screen.getByRole('button', { name: /reset timer/i }));

      expect(resetTimer).toHaveBeenCalled();
    });

    it('should hide controls when showControls is false', () => {
      render(<TimerDisplay showControls={false} />);

      expect(screen.queryByRole('button', { name: /start timer/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reset timer/i })).not.toBeInTheDocument();
    });
  });

  describe('urgency colors', () => {
    it('should show green color when time is above 50%', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 20, isRunning: false },
      });

      render(<TimerDisplay />);

      const timerElement = screen.getByRole('timer');
      expect(timerElement.className).toContain('text-green');
    });

    it('should show amber color when time is between 25% and 50%', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 10, isRunning: false },
      });

      render(<TimerDisplay />);

      const timerElement = screen.getByRole('timer');
      expect(timerElement.className).toContain('text-amber');
    });

    it('should show red color when time is below 25%', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 5, isRunning: false },
      });

      render(<TimerDisplay />);

      const timerElement = screen.getByRole('timer');
      expect(timerElement.className).toContain('text-red');
    });
  });

  describe('time formatting', () => {
    it('should format time as just seconds when under 60', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 45, isRunning: false },
      });

      render(<TimerDisplay />);

      expect(screen.getByRole('timer')).toHaveTextContent('45');
    });

    it('should format time as MM:SS when 60 or more seconds', () => {
      useGameStore.setState({
        timer: { duration: 120, remaining: 90, isRunning: false },
      });

      render(<TimerDisplay />);

      expect(screen.getByRole('timer')).toHaveTextContent('1:30');
    });

    it('should show zero with proper formatting', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 0, isRunning: false },
      });

      render(<TimerDisplay />);

      expect(screen.getByRole('timer')).toHaveTextContent('0');
    });
  });

  describe('visibility', () => {
    it('should not render when timerVisible is false', () => {
      useSettingsStore.setState({ timerVisible: false });

      const { container } = render(<TimerDisplay />);

      expect(container.firstChild).toBeNull();
    });

    it('should render when timerVisible is true', () => {
      useSettingsStore.setState({ timerVisible: true });

      render(<TimerDisplay />);

      expect(screen.getByRole('region', { name: /question timer/i })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA region label', () => {
      render(<TimerDisplay />);
      expect(screen.getByRole('region', { name: /question timer/i })).toBeInTheDocument();
    });

    it('should have timer role on time display', () => {
      render(<TimerDisplay />);
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should have aria-live on timer for screen readers', () => {
      render(<TimerDisplay />);

      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have proper progressbar ARIA attributes', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 20, isRunning: false },
      });

      render(<TimerDisplay />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '20');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '30');
    });

    it('should have proper button labels', () => {
      render(<TimerDisplay />);

      expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
    });

    it('should have controls group role', () => {
      render(<TimerDisplay />);
      expect(screen.getByRole('group', { name: /timer controls/i })).toBeInTheDocument();
    });
  });

  describe('senior-friendly design', () => {
    it('should have large time display text (text-5xl)', () => {
      render(<TimerDisplay />);

      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveClass('text-5xl');
    });

    it('should have minimum 44px height buttons', () => {
      render(<TimerDisplay />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });

    it('should have bold font for time display', () => {
      render(<TimerDisplay />);

      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveClass('font-bold');
    });
  });

  describe('progress bar', () => {
    it('should show 100% progress when timer is full', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 30, isRunning: false },
      });

      const { container } = render(<TimerDisplay />);

      const progressFill = container.querySelector('[role="progressbar"] > div');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('should show 50% progress when timer is half full', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 15, isRunning: false },
      });

      const { container } = render(<TimerDisplay />);

      const progressFill = container.querySelector('[role="progressbar"] > div');
      expect(progressFill).toHaveStyle({ width: '50%' });
    });

    it('should show 0% progress when timer is empty', () => {
      useGameStore.setState({
        timer: { duration: 30, remaining: 0, isRunning: false },
      });

      const { container } = render(<TimerDisplay />);

      const progressFill = container.querySelector('[role="progressbar"] > div');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });
  });
});
