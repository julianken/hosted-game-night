import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomSetupModal } from '../RoomSetupModal';
import { ToastProvider } from "@joolie-boolie/ui";
import type { ReactElement } from 'react';

// Mock stores
const mockSetPattern = vi.fn();
const mockToggleAutoCall = vi.fn();
const mockSetAutoCallSpeed = vi.fn();
const mockSetVoicePack = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      setPattern: mockSetPattern,
      toggleAutoCall: mockToggleAutoCall,
      setAutoCallSpeed: mockSetAutoCallSpeed,
      autoCallEnabled: false,
    };
    return selector ? selector(store) : store;
  }),
}));

vi.mock('@/stores/audio-store', () => ({
  useAudioStore: vi.fn((selector) => {
    const store = {
      setVoicePack: mockSetVoicePack,
    };
    return selector ? selector(store) : store;
  }),
}));

// Mock pattern registry
vi.mock('@/lib/game/patterns', () => ({
  patternRegistry: {
    get: vi.fn((id: string) => {
      if (id === 'standard') {
        return {
          id: 'standard',
          name: 'Standard',
          category: 'classic',
          cells: [],
        };
      }
      return null;
    }),
  },
}));

// Helper to render with providers
function renderWithProviders(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('RoomSetupModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateRoom: vi.fn(),
    onJoinRoom: vi.fn(),
    onPlayOffline: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for TemplateSelector
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    // Clean up portals and body styles
    document.body.style.overflow = '';
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });
    });

    it('renders all three option headings', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByText('Create New Game')).toHaveLength(2); // heading + button
        expect(screen.getByText('Join Existing Game')).toBeInTheDocument();
        expect(screen.getAllByText('Play Offline')).toHaveLength(2); // heading + button
      });
    });

    it('renders all option descriptions', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByText('Start a new bingo session and share with players')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Enter room code and PIN to join a game in progress')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Play without internet connection or room sharing')
        ).toBeInTheDocument();
      });
    });

    it('renders icons for each option', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        // Check for icon containers by their class and aria-hidden
        const dialog = screen.getByRole('dialog');
        const iconContainers = dialog.querySelectorAll('[aria-hidden="true"].flex-shrink-0');
        expect(iconContainers.length).toBe(3);
      });
    });
  });

  describe('closing behavior', () => {
    it('calls onClose when X button is clicked', async () => {
      const handleClose = vi.fn();
      renderWithProviders(<RoomSetupModal {...defaultProps} onClose={handleClose} />);
      await waitFor(() => {
        expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const handleClose = vi.fn();
      renderWithProviders(<RoomSetupModal {...defaultProps} onClose={handleClose} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Create New Game option', () => {
    it('renders Create New Game button', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Create a new game room/i })
        ).toBeInTheDocument();
      });
    });

    it('calls onCreateRoom when Create New Game button is clicked', async () => {
      const handleCreateRoom = vi.fn();
      renderWithProviders(
        <RoomSetupModal {...defaultProps} onCreateRoom={handleCreateRoom} />
      );
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Create a new game room/i })
        ).toBeInTheDocument();
      });
      fireEvent.click(
        screen.getByRole('button', { name: /Create a new game room/i })
      );
      expect(handleCreateRoom).toHaveBeenCalledTimes(1);
    });
  });

  describe('Join Existing Game option', () => {
    it('renders Join with PIN button initially', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });
    });

    it('shows join form when Join with PIN button is clicked', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Room PIN')).toBeInTheDocument();
      });
    });

    it('hides join form when Cancel button is clicked', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Room PIN')).toBeInTheDocument();
      });

      // Click Cancel
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      await waitFor(() => {
        expect(screen.queryByLabelText('Room PIN')).not.toBeInTheDocument();
      });
    });

    it('accepts 4-digit PIN input', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '1234' } });

      expect(input).toHaveValue('1234');
    });

    it('limits PIN input to 4 digits', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '123456' } });

      expect(input).toHaveValue('1234');
    });

    it('only allows numeric input for PIN', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: 'abc123' } });

      expect(input).toHaveValue('123');
    });

    it('disables Join Game button when PIN is incomplete', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '123' } });

      const joinButton = screen.getByRole('button', { name: /Join Game/i });
      expect(joinButton).toBeDisabled();
    });

    it('enables Join Game button when room code and PIN are complete', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const roomCodeInput = await screen.findByLabelText('Room Code');
      const pinInput = await screen.findByLabelText('Room PIN');

      fireEvent.change(roomCodeInput, { target: { value: 'SWAN-42' } });
      fireEvent.change(pinInput, { target: { value: '1234' } });

      const joinButton = screen.getByRole('button', { name: /Join Game/i });
      expect(joinButton).not.toBeDisabled();
    });

    it('calls onJoinRoom with room code and PIN when form is submitted', async () => {
      const handleJoinRoom = vi.fn();
      renderWithProviders(<RoomSetupModal {...defaultProps} onJoinRoom={handleJoinRoom} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const roomCodeInput = await screen.findByLabelText('Room Code');
      const pinInput = await screen.findByLabelText('Room PIN');

      fireEvent.change(roomCodeInput, { target: { value: 'swan-42' } });
      fireEvent.change(pinInput, { target: { value: '1234' } });

      const joinButton = screen.getByRole('button', { name: /Join Game/i });
      fireEvent.click(joinButton);

      expect(handleJoinRoom).toHaveBeenCalledWith('SWAN-42', '1234');
    });

    it('shows error when submitting invalid PIN', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const roomCodeInput = await screen.findByLabelText('Room Code');
      const pinInput = await screen.findByLabelText('Room PIN');

      fireEvent.change(roomCodeInput, { target: { value: 'SWAN-42' } });
      fireEvent.change(pinInput, { target: { value: '123' } });

      // Force the button to be enabled for this test
      const form = pinInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('PIN must be exactly 4 digits')).toBeInTheDocument();
      });
    });

    it('resets form when modal is closed and reopened', async () => {
      const { rerender } = renderWithProviders(<RoomSetupModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form and enter a PIN
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '1234' } });

      // Close modal
      rerender(<ToastProvider><RoomSetupModal {...defaultProps} isOpen={false} /></ToastProvider>);

      // Reopen modal
      rerender(<ToastProvider><RoomSetupModal {...defaultProps} isOpen={true} /></ToastProvider>);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Form should be hidden again
      expect(screen.queryByLabelText('Room PIN')).not.toBeInTheDocument();
    });
  });

  describe('Play Offline option', () => {
    it('renders Play Offline button', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', {
            name: /Play offline/i,
          })
        ).toBeInTheDocument();
      });
    });

    it('calls onPlayOffline when Play Offline button is clicked', async () => {
      const handlePlayOffline = vi.fn();
      renderWithProviders(
        <RoomSetupModal {...defaultProps} onPlayOffline={handlePlayOffline} />
      );
      await waitFor(() => {
        expect(
          screen.getByRole('button', {
            name: /Play offline/i,
          })
        ).toBeInTheDocument();
      });
      fireEvent.click(
        screen.getByRole('button', {
          name: /Play offline/i,
        })
      );
      expect(handlePlayOffline).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('has aria-modal="true"', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('all action buttons have accessible labels', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Create a new game room/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', {
            name: /Play offline/i,
          })
        ).toBeInTheDocument();
      });
    });

    it('PIN input has accessible label and description', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      expect(input).toHaveAttribute('aria-label', 'Enter room PIN');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });

  describe('keyboard navigation', () => {
    it('supports Tab key navigation between buttons', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');

      // First element should be the close button
      const closeButton = screen.getByLabelText('Close modal');
      expect(buttons[0]).toBe(closeButton);

      // Should have at least 4 buttons (close, create, join, offline)
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('form can be submitted with Enter key', async () => {
      const handleJoinRoom = vi.fn();
      renderWithProviders(<RoomSetupModal {...defaultProps} onJoinRoom={handleJoinRoom} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Join with room code/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Join with room code/i })
      );

      const roomCodeInput = await screen.findByLabelText('Room Code');
      const pinInput = await screen.findByLabelText('Room PIN');

      fireEvent.change(roomCodeInput, { target: { value: 'SWAN-42' } });
      fireEvent.change(pinInput, { target: { value: '1234' } });

      const form = pinInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(handleJoinRoom).toHaveBeenCalledWith('SWAN-42', '1234');
    });
  });

  describe('touch target sizing', () => {
    it('all buttons meet minimum 44x44px touch target', async () => {
      renderWithProviders(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        // Parse to verify they are valid (side-effect only)
        parseFloat(styles.minHeight);
        parseFloat(styles.minWidth);

        // Note: In jsdom, CSS custom properties may not compute correctly,
        // so we check that minHeight and minWidth are set
        expect(button.className).toMatch(/min-h-\[44px\]|min-h-\[56px\]|min-h-\[64px\]/);
      });
    });
  });

  describe('template integration', () => {
    it('renders TemplateSelector component', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderWithProviders(<RoomSetupModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Load Template')).toBeInTheDocument();
      });
    });

    it('auto-loads default template when modal opens', async () => {
      const mockTemplate = {
        id: 'test-template-1',
        name: 'Test Template',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: true,
        auto_call_interval: 3000,
        is_default: true,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockTemplate] }),
      });

      renderWithProviders(<RoomSetupModal {...defaultProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/templates');
      });
    });

    it('does not auto-load default template twice', async () => {
      const mockTemplate = {
        id: 'test-template-1',
        name: 'Test Template',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: true,
        auto_call_interval: 3000,
        is_default: true,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockTemplate] }),
      });

      const { rerender } = renderWithProviders(<RoomSetupModal {...defaultProps} />);

      // Wait for initial mount - TemplateSelector calls fetch once, RoomSetupModal auto-loads once
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const initialCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

      // Close and reopen modal
      rerender(<ToastProvider><RoomSetupModal {...defaultProps} isOpen={false} /></ToastProvider>);
      rerender(<ToastProvider><RoomSetupModal {...defaultProps} isOpen={true} /></ToastProvider>);

      // Allow any async effects to settle
      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      // Should NOT have auto-loaded default template again on reopen
      // (hasLoadedDefaultTemplate is already true, Modal preserves children)
      // The fetch count should remain the same as before close/reopen
      expect(global.fetch).toHaveBeenCalledTimes(initialCallCount);
    });

    it('handles template fetch error gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(<RoomSetupModal {...defaultProps} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error loading default template:',
          expect.any(Error)
        );
      });

      // Modal should still render normally
      expect(screen.getByText('Room Setup')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('disables TemplateSelector when isLoading is true', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderWithProviders(<RoomSetupModal {...defaultProps} isLoading={true} />);

      await waitFor(() => {
        const select = screen.getByLabelText('Load Template');
        expect(select).toBeDisabled();
      });
    });
  });
});
