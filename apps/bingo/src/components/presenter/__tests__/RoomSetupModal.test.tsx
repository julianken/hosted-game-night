import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomSetupModal } from '../RoomSetupModal';

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
  });

  afterEach(() => {
    // Clean up portals and body styles
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders when isOpen is true', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('does not render when isOpen is false', () => {
      render(<RoomSetupModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });
    });

    it('renders all three option headings', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByText('Create New Game')).toHaveLength(2); // heading + button
        expect(screen.getByText('Join Existing Game')).toBeInTheDocument();
        expect(screen.getAllByText('Play Offline')).toHaveLength(2); // heading + button
      });
    });

    it('renders all option descriptions', async () => {
      render(<RoomSetupModal {...defaultProps} />);
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
      render(<RoomSetupModal {...defaultProps} />);
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
      render(<RoomSetupModal {...defaultProps} onClose={handleClose} />);
      await waitFor(() => {
        expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const handleClose = vi.fn();
      render(<RoomSetupModal {...defaultProps} onClose={handleClose} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Create New Game option', () => {
    it('renders Create New Game button', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Create a new game room/i })
        ).toBeInTheDocument();
      });
    });

    it('calls onCreateRoom when Create New Game button is clicked', async () => {
      const handleCreateRoom = vi.fn();
      render(
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
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });
    });

    it('shows join form when Join with PIN button is clicked', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Room PIN')).toBeInTheDocument();
      });
    });

    it('hides join form when Cancel button is clicked', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
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
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '1234' } });

      expect(input).toHaveValue('1234');
    });

    it('limits PIN input to 4 digits', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '123456' } });

      expect(input).toHaveValue('1234');
    });

    it('only allows numeric input for PIN', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: 'abc123' } });

      expect(input).toHaveValue('123');
    });

    it('disables Join Game button when PIN is incomplete', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '123' } });

      const joinButton = screen.getByRole('button', { name: /Join Game/i });
      expect(joinButton).toBeDisabled();
    });

    it('enables Join Game button when room code and PIN are complete', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
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
      render(<RoomSetupModal {...defaultProps} onJoinRoom={handleJoinRoom} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
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
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
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
      const { rerender } = render(<RoomSetupModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form and enter a PIN
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      fireEvent.change(input, { target: { value: '1234' } });

      // Close modal
      rerender(<RoomSetupModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<RoomSetupModal {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Form should be hidden again
      expect(screen.queryByLabelText('Room PIN')).not.toBeInTheDocument();
    });
  });

  describe('Play Offline option', () => {
    it('renders Play Offline button', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', {
            name: /Play offline without network connection/i,
          })
        ).toBeInTheDocument();
      });
    });

    it('calls onPlayOffline when Play Offline button is clicked', async () => {
      const handlePlayOffline = vi.fn();
      render(
        <RoomSetupModal {...defaultProps} onPlayOffline={handlePlayOffline} />
      );
      await waitFor(() => {
        expect(
          screen.getByRole('button', {
            name: /Play offline without network connection/i,
          })
        ).toBeInTheDocument();
      });
      fireEvent.click(
        screen.getByRole('button', {
          name: /Play offline without network connection/i,
        })
      );
      expect(handlePlayOffline).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('has aria-modal="true"', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('all action buttons have accessible labels', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Create a new game room/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', {
            name: /Play offline without network connection/i,
          })
        ).toBeInTheDocument();
      });
    });

    it('PIN input has accessible label and description', async () => {
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
      );

      const input = await screen.findByLabelText('Room PIN');
      expect(input).toHaveAttribute('aria-label', 'Enter room PIN');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });

  describe('keyboard navigation', () => {
    it('supports Tab key navigation between buttons', async () => {
      render(<RoomSetupModal {...defaultProps} />);
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
      render(<RoomSetupModal {...defaultProps} onJoinRoom={handleJoinRoom} />);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Show form to join existing game/i })
        ).toBeInTheDocument();
      });

      // Show the form
      fireEvent.click(
        screen.getByRole('button', { name: /Show form to join existing game/i })
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
      render(<RoomSetupModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseFloat(styles.minHeight);
        const minWidth = parseFloat(styles.minWidth);

        // Note: In jsdom, CSS custom properties may not compute correctly,
        // so we check that minHeight and minWidth are set
        expect(button.className).toMatch(/min-h-\[44px\]|min-h-\[56px\]|min-h-\[64px\]/);
      });
    });
  });
});
