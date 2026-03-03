import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useGameStore } from '@/stores/game-store';
import { resetGameStore } from '@/test/helpers/store';
import { SceneNavButtons } from '../SceneNavButtons';

beforeEach(() => {
  resetGameStore();
  vi.restoreAllMocks();
});

describe('SceneNavButtons', () => {
  it('always renders both back and forward buttons', () => {
    useGameStore.setState({ audienceScene: 'waiting', revealPhase: null });
    render(<SceneNavButtons />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument();
  });

  it('renders on every scene including question_display', () => {
    useGameStore.setState({ audienceScene: 'question_display', revealPhase: null });
    render(<SceneNavButtons />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument();
  });

  it('renders on emergency_blank', () => {
    useGameStore.setState({ audienceScene: 'emergency_blank', revealPhase: null });
    render(<SceneNavButtons />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument();
  });

  describe('forward button', () => {
    it('calls startGame on waiting scene', () => {
      useGameStore.setState({ audienceScene: 'waiting', revealPhase: null });
      const startGameMock = vi.fn();
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'waiting',
        startGame: startGameMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

      expect(startGameMock).toHaveBeenCalled();
    });

    it('calls advanceScene with SKIP on timed intro scenes', () => {
      useGameStore.setState({ audienceScene: 'game_intro', revealPhase: null });
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'game_intro',
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('skip');
    });

    it('stops timer and chains two CLOSE advances on question_display', () => {
      useGameStore.setState({ audienceScene: 'question_display', revealPhase: null });
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      const stopTimerMock = vi.fn();
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'question_display',
        advanceScene: advanceSceneMock,
        stopTimer: stopTimerMock,
        timer: { isRunning: true, remaining: 10, duration: 30 },
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

      expect(stopTimerMock).toHaveBeenCalled();
      expect(advanceSceneMock).toHaveBeenCalledTimes(2);
      expect(advanceSceneMock).toHaveBeenNthCalledWith(1, 'close');
      expect(advanceSceneMock).toHaveBeenNthCalledWith(2, 'close');
    });

    it('calls advanceScene with CLOSE on question_closed', () => {
      useGameStore.setState({ audienceScene: 'question_closed', revealPhase: null });
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'question_closed',
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('close');
    });

    it('calls advanceScene with ADVANCE on results scenes', () => {
      useGameStore.setState({ audienceScene: 'round_summary', revealPhase: null });
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        audienceScene: 'round_summary',
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('advance');
    });

    it('is disabled during reveal lock on answer_reveal', () => {
      useGameStore.setState({ audienceScene: 'answer_reveal', revealPhase: 'freeze' });
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled();
    });

    it('is enabled when revealPhase is null on answer_reveal', () => {
      useGameStore.setState({ audienceScene: 'answer_reveal', revealPhase: null });
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Forward' })).not.toBeDisabled();
    });

    it('is not disabled on other scenes even when revealPhase is set', () => {
      useGameStore.setState({ audienceScene: 'round_summary', revealPhase: 'freeze' });
      render(<SceneNavButtons />);

      expect(screen.getByRole('button', { name: 'Forward' })).not.toBeDisabled();
    });
  });

  describe('back button', () => {
    it('calls advanceScene with "back" trigger', () => {
      useGameStore.setState({ audienceScene: 'recap_title', revealPhase: null });
      const advanceSceneMock = vi.fn().mockReturnValue(true);
      vi.spyOn(useGameStore, 'getState').mockReturnValue({
        ...useGameStore.getState(),
        advanceScene: advanceSceneMock,
      });

      render(<SceneNavButtons />);
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(advanceSceneMock).toHaveBeenCalledWith('back');
    });
  });
});
