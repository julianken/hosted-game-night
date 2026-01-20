import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RoomCodeDisplay } from '../room-code-display';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
});

describe('RoomCodeDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the room code prominently', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      expect(screen.getByText('SWAN-42')).toBeInTheDocument();
    });

    it('should render with correct heading', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      expect(screen.getByRole('heading', { name: 'Room Code' })).toBeInTheDocument();
    });

    it('should apply large font size for senior-friendly display', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const roomCodeElement = screen.getByText('SWAN-42');
      expect(roomCodeElement.className).toContain('text-5xl');
    });

    it('should render as a region with proper aria-label', () => {
      const { container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const region = container.querySelector('[role="region"]');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-label', 'Room code information');
    });

    it('should render room code with aria-label for screen readers', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const roomCodeElement = screen.getByLabelText('Room code: SWAN 42');
      expect(roomCodeElement).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should render copy link button', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('should copy display URL to clipboard when clicked', async () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /copy audience display link/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/display?room=SWAN-42'
      );
    });

    it('should show "Copied!" feedback after successful copy', async () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /copy audience display link/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('should update aria-label when copied', async () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /copy audience display link/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByRole('button', { name: /link copied to clipboard/i })).toBeInTheDocument();
    });

    it('should reset "Copied!" feedback after 2 seconds', async () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /copy audience display link/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();

      // Fast-forward 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('should use custom onCopyLink handler when provided', async () => {
      const customCopyHandler = vi.fn();
      render(<RoomCodeDisplay roomCode="SWAN-42" onCopyLink={customCopyHandler} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(customCopyHandler).toHaveBeenCalledTimes(1);
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it('should handle clipboard errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));

      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /copy/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to copy to clipboard:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('QR code button', () => {
    it('should not render QR code button by default', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      expect(screen.queryByRole('button', { name: /qr code/i })).not.toBeInTheDocument();
    });

    it('should render QR code button when onShowQR is provided', () => {
      const handleShowQR = vi.fn();
      render(<RoomCodeDisplay roomCode="SWAN-42" onShowQR={handleShowQR} />);
      expect(screen.getByRole('button', { name: /show qr code/i })).toBeInTheDocument();
    });

    it('should call onShowQR when QR button is clicked', () => {
      const handleShowQR = vi.fn();
      render(<RoomCodeDisplay roomCode="SWAN-42" onShowQR={handleShowQR} />);

      const qrButton = screen.getByRole('button', { name: /show qr code/i });
      fireEvent.click(qrButton);

      expect(handleShowQR).toHaveBeenCalledTimes(1);
    });
  });

  describe('sync status indicator', () => {
    it('should show "Saving..." when isSaving is true', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" isSaving={true} />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should show last saved time when lastSavedAt is provided', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={oneMinuteAgo} />);
      expect(screen.getByText(/saved 1 minute ago/i)).toBeInTheDocument();
    });

    it('should format "just now" for recent saves (< 10 seconds)', () => {
      const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={fiveSecondsAgo} />);
      expect(screen.getByText(/saved just now/i)).toBeInTheDocument();
    });

    it('should format seconds for saves < 1 minute', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={thirtySecondsAgo} />);
      expect(screen.getByText(/saved 30 seconds ago/i)).toBeInTheDocument();
    });

    it('should format minutes for saves < 1 hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={fiveMinutesAgo} />);
      expect(screen.getByText(/saved 5 minutes ago/i)).toBeInTheDocument();
    });

    it('should format hours for older saves', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={twoHoursAgo} />);
      expect(screen.getByText(/saved 2 hours ago/i)).toBeInTheDocument();
    });

    it('should hide sync status when showSyncStatus is false', () => {
      render(
        <RoomCodeDisplay
          roomCode="SWAN-42"
          isSaving={true}
          showSyncStatus={false}
        />
      );
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });

    it('should not render sync status when not saving and no lastSavedAt', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" isSaving={false} />);
      expect(screen.queryByText(/saving/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
    });

    it('should have aria-live region for sync status', () => {
      const { container } = render(<RoomCodeDisplay roomCode="SWAN-42" isSaving={true} />);
      const statusElement = container.querySelector('[aria-live="polite"]');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have action buttons in a group', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const group = screen.getByRole('group', { name: 'Room code actions' });
      expect(group).toBeInTheDocument();
    });

    it('should have proper aria-labels on all buttons', () => {
      const handleShowQR = vi.fn();
      render(<RoomCodeDisplay roomCode="SWAN-42" onShowQR={handleShowQR} />);

      expect(screen.getByRole('button', { name: /copy audience display link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show qr code for joining/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const copyButton = screen.getByRole('button', { name: /copy/i });

      copyButton.focus();
      expect(copyButton).toHaveFocus();
    });

    it('should render room code status as live region', () => {
      const { container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const roomCodeStatus = container.querySelector('[aria-live="polite"]');
      expect(roomCodeStatus).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <RoomCodeDisplay roomCode="SWAN-42" className="custom-class" />
      );
      const region = container.querySelector('[role="region"]');
      expect(region?.className).toContain('custom-class');
    });

    it('should have high contrast styling for senior-friendly design', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const roomCodeElement = screen.getByText('SWAN-42');
      expect(roomCodeElement.className).toContain('text-blue-900');
    });

    it('should have shadow and rounded corners', () => {
      const { container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const region = container.querySelector('[role="region"]');
      expect(region?.className).toContain('shadow-lg');
      expect(region?.className).toContain('rounded-lg');
    });
  });

  describe('different room codes', () => {
    it('should handle different room code formats', () => {
      const codes = ['SWAN-42', 'HAWK-99', 'DUCK-10', 'DOVE-55'];

      codes.forEach((code) => {
        const { unmount } = render(<RoomCodeDisplay roomCode={code} />);
        expect(screen.getByText(code)).toBeInTheDocument();
        unmount();
      });
    });

    it('should update copy URL with different room codes', async () => {
      render(<RoomCodeDisplay roomCode="HAWK-99" />);

      const copyButton = screen.getByRole('button', { name: /copy/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/display?room=HAWK-99'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle rapid copy clicks', async () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);
      const copyButton = screen.getByRole('button', { name: /copy/i });

      // Click multiple times rapidly
      await act(async () => {
        fireEvent.click(copyButton);
        fireEvent.click(copyButton);
        fireEvent.click(copyButton);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
    });

    it('should handle undefined lastSavedAt gracefully', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={undefined} />);
      expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
    });

    it('should handle both isSaving and lastSavedAt (prioritize saving)', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      render(
        <RoomCodeDisplay
          roomCode="SWAN-42"
          isSaving={true}
          lastSavedAt={oneMinuteAgo}
        />
      );

      // Should show "Saving..." not "Saved..."
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
    });
  });

  describe('displayName', () => {
    it('should have correct displayName for debugging', () => {
      expect(RoomCodeDisplay.displayName).toBe('RoomCodeDisplay');
    });
  });
});
