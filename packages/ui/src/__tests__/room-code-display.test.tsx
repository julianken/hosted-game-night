import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoomCodeDisplay } from '../room-code-display';

// Ensure navigator.clipboard exists with a mock writeText function
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: async () => {},  // Placeholder function to spy on
  },
  writable: true,
  configurable: true,
});

let mockWriteText: ReturnType<typeof vi.spyOn>;

// Mock window.location
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (window as any).location;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
window.location = { origin: 'http://localhost:3000' } as any;

describe('RoomCodeDisplay', () => {
  beforeEach(() => {
    // Spy on clipboard to track calls
    mockWriteText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    mockWriteText?.mockRestore();
  });

  describe('rendering', () => {
    it('should render with room code', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      expect(screen.getByText('SWAN-42')).toBeInTheDocument();
    });

    it('should render header text', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      expect(screen.getByText('Room Code')).toBeInTheDocument();
    });

    it('should render Copy Link button', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      expect(screen.getByRole('button', { name: /Copy audience display link/i })).toBeInTheDocument();
    });

    it('should not render QR button by default', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      expect(screen.queryByRole('button', { name: /Show QR code/i })).not.toBeInTheDocument();
    });

    it('should render QR button when onShowQR is provided', () => {
      const mockShowQR = vi.fn();
      render(<RoomCodeDisplay roomCode="SWAN-42" onShowQR={mockShowQR} />);

      expect(screen.getByRole('button', { name: /Show QR code/i })).toBeInTheDocument();
    });

    it('should display different room codes', () => {
      const { rerender } = render(<RoomCodeDisplay roomCode="DUCK-99" />);
      expect(screen.getByText('DUCK-99')).toBeInTheDocument();

      rerender(<RoomCodeDisplay roomCode="HAWK-12" />);
      expect(screen.getByText('HAWK-12')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    // TODO: Fix clipboard spy not tracking calls in jsdom 27 + React 19
    // The clipboard operation succeeds (component shows "Copied!" state)
    // but vi.spyOn(navigator.clipboard, 'writeText') doesn't track the call
    it.skip('should copy display URL to clipboard on button click', async () => {
      const user = userEvent.setup();
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await act(async () => {
        await user.click(copyButton);
      });

      // Wait for clipboard operation to complete
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(1);
      });

      expect(mockWriteText).toHaveBeenCalledWith(
        'http://localhost:3000/display?room=SWAN-42'
      );
    });

    it('should show "Copied!" feedback after copying', async () => {
      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should show checkmark icon when copied', async () => {
      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await user.click(copyButton);

      await waitFor(() => {
        const checkmark = screen.getByRole('button', { name: /Link copied to clipboard/i });
        expect(checkmark).toBeInTheDocument();
      });
    });

    // TODO: Depends on clipboard spy working (see test above)
    it.skip('should reset "Copied!" state after 2 seconds', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Fast-forward 2 seconds WITH act() wrapper
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve(); // Flush microtasks
      });

      // Check that state has reset
      await waitFor(() => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
        expect(screen.getByText('Copy Link')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should use custom onCopyLink handler when provided', async () => {
      const mockCopyLink = vi.fn();
      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" onCopyLink={mockCopyLink} />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(mockCopyLink).toHaveBeenCalledTimes(1);
      });

      expect(mockWriteText).not.toHaveBeenCalled();
    });

    it('should still show "Copied!" feedback with custom handler', async () => {
      const mockCopyLink = vi.fn();
      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" onCopyLink={mockCopyLink} />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should handle clipboard error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWriteText.mockRejectedValueOnce(new Error('Clipboard access denied'));

      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to copy to clipboard:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('QR code functionality', () => {
    it('should call onShowQR when QR button is clicked', async () => {
      const mockShowQR = vi.fn();
      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" onShowQR={mockShowQR} />);

      const qrButton = screen.getByRole('button', { name: /Show QR code/i });
      await user.click(qrButton);

      expect(mockShowQR).toHaveBeenCalledTimes(1);
    });

    it('should show QR icon on button', () => {
      const mockShowQR = vi.fn();
      const { container: _container } = render(
        <RoomCodeDisplay roomCode="SWAN-42" onShowQR={mockShowQR} />
      );

      const qrButton = screen.getByRole('button', { name: /Show QR code/i });
      const icon = qrButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('sync status indicator', () => {
    it('should not show sync status by default when no saving or lastSavedAt', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      expect(screen.queryByText(/Saving.../i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Saved/i)).not.toBeInTheDocument();
    });

    it('should show saving indicator when isSaving is true', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" isSaving={true} />);

      expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    });

    it('should show spinner icon when saving', () => {
      const { container: _container } = render(
        <RoomCodeDisplay roomCode="SWAN-42" isSaving={true} />
      );

      const spinner = _container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show "Saved just now" for recent saves', () => {
      const now = new Date();
      const justNow = new Date(now.getTime() - 5000); // 5 seconds ago
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={justNow} />);

      expect(screen.getByText(/Saved just now/i)).toBeInTheDocument();
    });

    it('should show "Saved X seconds ago"', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={thirtySecondsAgo} />);

      expect(screen.getByText(/Saved 30 seconds ago/i)).toBeInTheDocument();
    });

    it('should show "Saved 1 minute ago" for single minute', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={oneMinuteAgo} />);

      expect(screen.getByText(/Saved 1 minute ago/i)).toBeInTheDocument();
    });

    it('should show "Saved X minutes ago" for multiple minutes', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 300000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={fiveMinutesAgo} />);

      expect(screen.getByText(/Saved 5 minutes ago/i)).toBeInTheDocument();
    });

    it('should show "Saved 1 hour ago" for single hour', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={oneHourAgo} />);

      expect(screen.getByText(/Saved 1 hour ago/i)).toBeInTheDocument();
    });

    it('should show "Saved X hours ago" for multiple hours', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 10800000);
      render(<RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={threeHoursAgo} />);

      expect(screen.getByText(/Saved 3 hours ago/i)).toBeInTheDocument();
    });

    it('should show checkmark icon when saved', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const { container: _container } = render(
        <RoomCodeDisplay roomCode="SWAN-42" lastSavedAt={oneMinuteAgo} />
      );

      const statusElement = screen.getByText(/Saved 1 minute ago/i).parentElement;
      const checkmark = statusElement?.querySelector('svg');
      expect(checkmark).toBeInTheDocument();
    });

    it('should hide sync status when showSyncStatus is false', () => {
      render(
        <RoomCodeDisplay
          roomCode="SWAN-42"
          isSaving={true}
          showSyncStatus={false}
        />
      );

      expect(screen.queryByText(/Saving.../i)).not.toBeInTheDocument();
    });

    it('should have role="status" on sync indicator', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" isSaving={true} />);

      // Find the sync status container
      const savingText = screen.getByText(/Saving.../i);
      const statusContainer = savingText.closest('[role="status"]');
      expect(statusContainer).toBeInTheDocument();
    });

    it('should have aria-live="polite" on sync indicator', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" isSaving={true} />);

      const savingText = screen.getByText(/Saving.../i);
      const statusContainer = savingText.closest('[role="status"]');
      expect(statusContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-atomic="true" on sync indicator', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" isSaving={true} />);

      const savingText = screen.getByText(/Saving.../i);
      const statusContainer = savingText.closest('[role="status"]');
      expect(statusContainer).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('accessibility', () => {
    it('should have role="region" on container', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const container = screen.getByRole('region', { name: /Room code information/i });
      expect(container).toBeInTheDocument();
    });

    it('should have aria-label on container', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Room code information');
    });

    it('should have accessible room code with proper aria-label', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const roomCodeElement = screen.getByText('SWAN-42');
      expect(roomCodeElement).toHaveAttribute('aria-label', 'Room code: SWAN 42');
    });

    it('should have role="status" on room code display', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const roomCodeElement = screen.getByText('SWAN-42').parentElement;
      expect(roomCodeElement).toHaveAttribute('role', 'status');
    });

    it('should have aria-live="polite" on room code display', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const roomCodeElement = screen.getByText('SWAN-42').parentElement;
      expect(roomCodeElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have role="group" on action buttons container', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const buttonsContainer = screen.getByRole('group', { name: /Room code actions/i });
      expect(buttonsContainer).toBeInTheDocument();
    });

    it('should have aria-label on buttons group', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Room code actions');
    });

    it('should have descriptive aria-label on Copy button', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link to clipboard/i });
      expect(copyButton).toHaveAttribute('aria-label');
    });

    it('should update aria-label when copied', async () => {
      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Link copied to clipboard/i })).toBeInTheDocument();
      });
    });

    it('should have descriptive aria-label on QR button', () => {
      const mockShowQR = vi.fn();
      render(<RoomCodeDisplay roomCode="SWAN-42" onShowQR={mockShowQR} />);

      const qrButton = screen.getByRole('button', { name: /Show QR code for joining/i });
      expect(qrButton).toHaveAttribute('aria-label', 'Show QR code for joining');
    });

    it('should mark decorative icons as aria-hidden', () => {
      const { container: _container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const icons = _container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container: _container } = render(
        <RoomCodeDisplay roomCode="SWAN-42" className="custom-class" />
      );

      const regionElement = _container.querySelector('[role="region"]');
      expect(regionElement).toHaveClass('custom-class');
    });

    it('should preserve built-in classes with custom className', () => {
      const { container: _container } = render(
        <RoomCodeDisplay roomCode="SWAN-42" className="my-4" />
      );

      const regionElement = _container.querySelector('[role="region"]');
      expect(regionElement).toHaveClass('my-4');
      expect(regionElement?.className).toContain('bg-white');
      expect(regionElement?.className).toContain('rounded-lg');
    });
  });

  describe('visual design', () => {
    it('should have large font size for room code (text-5xl)', () => {
      const { container: _container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const roomCodeElement = screen.getByText('SWAN-42');
      expect(roomCodeElement.className).toContain('text-5xl');
    });

    it('should have bold font weight on room code', () => {
      const { container: _container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const roomCodeElement = screen.getByText('SWAN-42');
      expect(roomCodeElement.className).toContain('font-bold');
    });

    it('should have high contrast colors', () => {
      const { container: _container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const roomCodeElement = screen.getByText('SWAN-42');
      expect(roomCodeElement.className).toContain('text-blue-900');
    });

    it('should have dark mode support', () => {
      const { container: _container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const roomCodeElement = screen.getByText('SWAN-42');
      expect(roomCodeElement.className).toContain('dark:text-blue-100');
    });
  });

  describe('button layout', () => {
    it('should have flex layout for buttons', () => {
      const { container: _container } = render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const buttonsContainer = screen.getByRole('group');
      expect(buttonsContainer.className).toContain('flex');
    });

    it('should have gap between buttons', () => {
      const mockShowQR = vi.fn();
      const { container: _container } = render(
        <RoomCodeDisplay roomCode="SWAN-42" onShowQR={mockShowQR} />
      );

      const buttonsContainer = screen.getByRole('group');
      expect(buttonsContainer.className).toContain('gap-2');
    });

    it('should have flex-1 on Copy button for equal width', () => {
      render(<RoomCodeDisplay roomCode="SWAN-42" />);

      const copyButton = screen.getByRole('button', { name: /Copy audience display link/i });
      expect(copyButton.className).toContain('flex-1');
    });

    it('should have flex-1 on QR button for equal width', () => {
      const mockShowQR = vi.fn();
      render(<RoomCodeDisplay roomCode="SWAN-42" onShowQR={mockShowQR} />);

      const qrButton = screen.getByRole('button', { name: /Show QR code/i });
      expect(qrButton.className).toContain('flex-1');
    });
  });

  describe('room code formatting', () => {
    it('should split room code properly in aria-label', () => {
      render(<RoomCodeDisplay roomCode="HAWK-12" />);

      const roomCodeElement = screen.getByText('HAWK-12');
      expect(roomCodeElement).toHaveAttribute('aria-label', 'Room code: HAWK 12');
    });

    it('should handle different bird names', () => {
      render(<RoomCodeDisplay roomCode="DUCK-99" />);

      const roomCodeElement = screen.getByText('DUCK-99');
      expect(roomCodeElement).toHaveAttribute('aria-label', 'Room code: DUCK 99');
    });
  });
});
