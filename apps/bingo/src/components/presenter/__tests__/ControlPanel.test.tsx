import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlPanel } from '../ControlPanel';

describe('ControlPanel', () => {
  const defaultProps = {
    status: 'idle' as const,
    canCall: false,
    canStart: true,
    canPause: false,
    canResume: false,
    canUndo: false,
    onStart: vi.fn(),
    onCallBall: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onReset: vi.fn(),
    onUndo: vi.fn(),
  };

  describe('when status is idle', () => {
    it('shows Start Game button', () => {
      render(<ControlPanel {...defaultProps} status="idle" />);
      expect(screen.getByRole('button', { name: /Start Game/i })).toBeInTheDocument();
    });

    it('does not show Call Ball button', () => {
      render(<ControlPanel {...defaultProps} status="idle" />);
      expect(screen.queryByRole('button', { name: /Roll/i })).not.toBeInTheDocument();
    });
  });

  describe('when status is playing', () => {
    it('shows Call Ball button', () => {
      render(<ControlPanel {...defaultProps} status="playing" canCall={true} />);
      expect(screen.getByRole('button', { name: /Roll/i })).toBeInTheDocument();
    });

    it('does not show Start Game button', () => {
      render(<ControlPanel {...defaultProps} status="playing" />);
      expect(screen.queryByRole('button', { name: /Start Game/i })).not.toBeInTheDocument();
    });
  });

  describe('when status is paused', () => {
    it('shows Call Ball button', () => {
      render(<ControlPanel {...defaultProps} status="paused" />);
      expect(screen.getByRole('button', { name: /Roll/i })).toBeInTheDocument();
    });
  });

  describe('pause/resume buttons', () => {
    it('shows Pause button when canPause is true', () => {
      render(<ControlPanel {...defaultProps} status="playing" canPause={true} />);
      expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
    });

    it('does not show Pause button when canPause is false', () => {
      render(<ControlPanel {...defaultProps} status="playing" canPause={false} />);
      expect(screen.queryByRole('button', { name: /^Pause/i })).not.toBeInTheDocument();
    });

    it('shows Resume button when canResume is true', () => {
      render(<ControlPanel {...defaultProps} status="paused" canResume={true} />);
      expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
    });

    it('does not show Resume button when canResume is false', () => {
      render(<ControlPanel {...defaultProps} status="paused" canResume={false} />);
      expect(screen.queryByRole('button', { name: /^Resume/i })).not.toBeInTheDocument();
    });
  });

  describe('undo button', () => {
    it('disables Undo when canUndo is false', () => {
      render(<ControlPanel {...defaultProps} status="playing" canUndo={false} />);
      expect(screen.getByRole('button', { name: /Undo/i })).toBeDisabled();
    });

    it('enables Undo when canUndo is true', () => {
      render(<ControlPanel {...defaultProps} status="playing" canUndo={true} />);
      expect(screen.getByRole('button', { name: /Undo/i })).not.toBeDisabled();
    });
  });

  describe('button handlers', () => {
    it('calls onStart when Start Game clicked', () => {
      const handleStart = vi.fn();
      render(<ControlPanel {...defaultProps} status="idle" canStart={true} onStart={handleStart} />);
      fireEvent.click(screen.getByRole('button', { name: /Start Game/i }));
      expect(handleStart).toHaveBeenCalledTimes(1);
    });

    it('calls onCallBall when Call Ball clicked', () => {
      const handleCallBall = vi.fn();
      render(<ControlPanel {...defaultProps} status="playing" canCall={true} onCallBall={handleCallBall} />);
      fireEvent.click(screen.getByRole('button', { name: /Roll/i }));
      expect(handleCallBall).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when Pause clicked', () => {
      const handlePause = vi.fn();
      render(<ControlPanel {...defaultProps} status="playing" canPause={true} onPause={handlePause} />);
      fireEvent.click(screen.getByRole('button', { name: /Pause/i }));
      expect(handlePause).toHaveBeenCalledTimes(1);
    });

    it('calls onResume when Resume clicked', () => {
      const handleResume = vi.fn();
      render(<ControlPanel {...defaultProps} status="paused" canResume={true} onResume={handleResume} />);
      fireEvent.click(screen.getByRole('button', { name: /Resume/i }));
      expect(handleResume).toHaveBeenCalledTimes(1);
    });

    it('calls onReset when Reset clicked', () => {
      const handleReset = vi.fn();
      render(<ControlPanel {...defaultProps} status="playing" onReset={handleReset} />);
      fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it('calls onUndo when Undo clicked and enabled', () => {
      const handleUndo = vi.fn();
      render(<ControlPanel {...defaultProps} status="playing" canUndo={true} onUndo={handleUndo} />);
      fireEvent.click(screen.getByRole('button', { name: /Undo/i }));
      expect(handleUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('status indicator', () => {
    it('shows status text for idle', () => {
      render(<ControlPanel {...defaultProps} status="idle" />);
      expect(screen.getByText('idle')).toBeInTheDocument();
    });

    it('shows status text for playing', () => {
      render(<ControlPanel {...defaultProps} status="playing" />);
      expect(screen.getByText('playing')).toBeInTheDocument();
    });

    it('shows status text for paused', () => {
      render(<ControlPanel {...defaultProps} status="paused" />);
      expect(screen.getByText('paused')).toBeInTheDocument();
    });

    it('shows status text for ended', () => {
      render(<ControlPanel {...defaultProps} status="ended" />);
      expect(screen.getByText('ended')).toBeInTheDocument();
    });
  });
});
