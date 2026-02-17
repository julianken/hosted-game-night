import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ControlPanel } from '../ControlPanel';
import { ToastProvider } from "@joolie-boolie/ui";
import type { ReactElement } from 'react';
vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      pattern: { id: 'standard', name: 'Standard' },
      autoCallEnabled: false,
      autoCallSpeed: 3000,
    };
    return selector ? selector(store) : store;
  }),
}));

vi.mock('@/stores/audio-store', () => ({
  useAudioStore: vi.fn((selector) => {
    const store = {
      voicePack: 'classic',
    };
    return selector ? selector(store) : store;
  }),
}));

// Helper to render with providers
function renderWithProviders(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

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

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for SaveTemplateModal
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  describe('when status is idle', () => {
    it('shows Start Game button', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);
      expect(screen.getByRole('button', { name: /Start Game/i })).toBeInTheDocument();
    });

    it('does not show Call Ball button', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);
      expect(screen.queryByRole('button', { name: /Roll/i })).not.toBeInTheDocument();
    });
  });

  describe('when status is playing', () => {
    it('shows Call Ball button', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canCall={true} />);
      expect(screen.getByRole('button', { name: /Roll/i })).toBeInTheDocument();
    });

    it('does not show Start Game button', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" />);
      expect(screen.queryByRole('button', { name: /Start Game/i })).not.toBeInTheDocument();
    });
  });

  describe('when status is paused', () => {
    it('shows Call Ball button', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="paused" />);
      expect(screen.getByRole('button', { name: /Roll/i })).toBeInTheDocument();
    });
  });

  describe('pause/resume buttons', () => {
    it('shows Pause button when canPause is true', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canPause={true} />);
      expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
    });

    it('does not show Pause button when canPause is false', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canPause={false} />);
      expect(screen.queryByRole('button', { name: /^Pause/i })).not.toBeInTheDocument();
    });

    it('shows Resume button when canResume is true', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="paused" canResume={true} />);
      expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
    });

    it('does not show Resume button when canResume is false', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="paused" canResume={false} />);
      expect(screen.queryByRole('button', { name: /^Resume/i })).not.toBeInTheDocument();
    });
  });

  describe('undo button', () => {
    it('disables Undo when canUndo is false', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canUndo={false} />);
      expect(screen.getByRole('button', { name: /Undo/i })).toBeDisabled();
    });

    it('enables Undo when canUndo is true', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canUndo={true} />);
      expect(screen.getByRole('button', { name: /Undo/i })).not.toBeDisabled();
    });
  });

  describe('button handlers', () => {
    it('calls onStart when Start Game clicked', () => {
      const handleStart = vi.fn();
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" canStart={true} onStart={handleStart} />);
      fireEvent.click(screen.getByRole('button', { name: /Start Game/i }));
      expect(handleStart).toHaveBeenCalledTimes(1);
    });

    it('calls onCallBall when Call Ball clicked', () => {
      const handleCallBall = vi.fn();
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canCall={true} onCallBall={handleCallBall} />);
      fireEvent.click(screen.getByRole('button', { name: /Roll/i }));
      expect(handleCallBall).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when Pause clicked', () => {
      const handlePause = vi.fn();
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canPause={true} onPause={handlePause} />);
      fireEvent.click(screen.getByRole('button', { name: /Pause/i }));
      expect(handlePause).toHaveBeenCalledTimes(1);
    });

    it('calls onResume when Resume clicked', () => {
      const handleResume = vi.fn();
      renderWithProviders(<ControlPanel {...defaultProps} status="paused" canResume={true} onResume={handleResume} />);
      fireEvent.click(screen.getByRole('button', { name: /Resume/i }));
      expect(handleResume).toHaveBeenCalledTimes(1);
    });

    it('calls onReset when Reset clicked', () => {
      const handleReset = vi.fn();
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" onReset={handleReset} />);
      fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it('calls onUndo when Undo clicked and enabled', () => {
      const handleUndo = vi.fn();
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" canUndo={true} onUndo={handleUndo} />);
      fireEvent.click(screen.getByRole('button', { name: /Undo/i }));
      expect(handleUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('status indicator', () => {
    it('shows status text for idle', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);
      expect(screen.getByText('idle')).toBeInTheDocument();
    });

    it('shows status text for playing', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" />);
      expect(screen.getByText('playing')).toBeInTheDocument();
    });

    it('shows status text for paused', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="paused" />);
      expect(screen.getByText('paused')).toBeInTheDocument();
    });

    it('shows status text for ended', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="ended" />);
      expect(screen.getByText('ended')).toBeInTheDocument();
    });
  });

  describe('reset confirmation dialog', () => {
    it('does not show reset confirmation dialog by default', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" />);
      expect(screen.queryByText(/This will end the current game/i)).not.toBeInTheDocument();
    });

    it('shows reset confirmation dialog when showResetConfirm is true', () => {
      renderWithProviders(
        <ControlPanel
          {...defaultProps}
          status="playing"
          showResetConfirm={true}
          onConfirmReset={vi.fn()}
          onCancelReset={vi.fn()}
        />
      );
      expect(screen.getByText(/This will end the current game and clear all called numbers/i)).toBeInTheDocument();
      expect(screen.getByText('Reset Game?')).toBeInTheDocument();
    });

    it('calls onConfirmReset when Reset is clicked in confirmation dialog', () => {
      const handleConfirmReset = vi.fn();
      renderWithProviders(
        <ControlPanel
          {...defaultProps}
          status="playing"
          showResetConfirm={true}
          onConfirmReset={handleConfirmReset}
          onCancelReset={vi.fn()}
        />
      );
      // The Modal has a "Reset" confirm button
      const resetButton = screen.getByRole('button', { name: 'Reset' });
      fireEvent.click(resetButton);
      expect(handleConfirmReset).toHaveBeenCalledTimes(1);
    });

    it('calls onCancelReset when Cancel is clicked in confirmation dialog', () => {
      const handleCancelReset = vi.fn();
      renderWithProviders(
        <ControlPanel
          {...defaultProps}
          status="playing"
          showResetConfirm={true}
          onConfirmReset={vi.fn()}
          onCancelReset={handleCancelReset}
        />
      );
      // The Modal has a "Cancel" button
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);
      expect(handleCancelReset).toHaveBeenCalledTimes(1);
    });

    it('calls onCancelReset when close button is clicked in confirmation dialog', () => {
      const handleCancelReset = vi.fn();
      renderWithProviders(
        <ControlPanel
          {...defaultProps}
          status="playing"
          showResetConfirm={true}
          onConfirmReset={vi.fn()}
          onCancelReset={handleCancelReset}
        />
      );
      const closeButton = screen.getByRole('button', { name: /Close modal/i });
      fireEvent.click(closeButton);
      expect(handleCancelReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('save template integration', () => {
    it('renders "Save as Template" button', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);
      expect(
        screen.getByRole('button', { name: /Save current settings as a template/i })
      ).toBeInTheDocument();
    });

    it('opens SaveTemplateModal when "Save as Template" clicked', async () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);

      const saveButton = screen.getByRole('button', {
        name: /Save current settings as a template/i,
      });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Save Template')).toBeInTheDocument();
      });
    });

    it('closes SaveTemplateModal when cancel is clicked', async () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);

      // Open modal
      const saveButton = screen.getByRole('button', {
        name: /Save current settings as a template/i,
      });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Save Template')).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Save Template')).not.toBeInTheDocument();
      });
    });

    it('SaveTemplateModal is not visible initially', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);
      expect(screen.queryByText('Save Template')).not.toBeInTheDocument();
    });

    it('"Save as Template" button is always enabled', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="playing" />);
      const saveButton = screen.getByRole('button', {
        name: /Save current settings as a template/i,
      });
      expect(saveButton).not.toBeDisabled();
    });

    it('"Save as Template" button has accessible label', () => {
      renderWithProviders(<ControlPanel {...defaultProps} status="idle" />);
      const saveButton = screen.getByRole('button', {
        name: /Save current settings as a template/i,
      });
      expect(saveButton).toHaveAttribute(
        'aria-label',
        'Save current settings as a template'
      );
    });
  });
});
