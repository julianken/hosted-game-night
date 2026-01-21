import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PinDisplay } from '../PinDisplay';

describe('PinDisplay', () => {
  let clipboardWriteTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock clipboard API
    clipboardWriteTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteTextSpy,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PIN display mode', () => {
    it('renders PIN with correct styling', () => {
      render(<PinDisplay pin="1234" />);

      expect(screen.getByText('Room PIN')).toBeInTheDocument();
      expect(screen.getByLabelText('PIN: 1234')).toBeInTheDocument();
      expect(screen.getByText('1234')).toHaveClass('text-4xl', 'font-mono', 'font-bold');
    });

    it('displays copy button', () => {
      render(<PinDisplay pin="1234" />);

      const button = screen.getByRole('button', { name: /copy pin to clipboard/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Copy PIN');
    });

    it('shows helper text', () => {
      render(<PinDisplay pin="1234" />);

      expect(screen.getByText('Share this PIN with players to join your game')).toBeInTheDocument();
    });

    it('copies PIN to clipboard when button clicked', async () => {
      render(<PinDisplay pin="5678" />);

      const button = screen.getByRole('button', { name: /copy pin to clipboard/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(clipboardWriteTextSpy).toHaveBeenCalledWith('5678');
      });
    });

    it('shows success feedback after copying', async () => {
      render(<PinDisplay pin="1234" />);

      const button = screen.getByRole('button', { name: /copy pin to clipboard/i });
      fireEvent.click(button);

      // Check button text changed
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pin copied to clipboard/i })).toBeInTheDocument();
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('resets success feedback after 2 seconds', async () => {
      render(<PinDisplay pin="1234" />);

      const button = screen.getByRole('button', { name: /copy pin to clipboard/i });
      fireEvent.click(button);

      // Feedback should be shown
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Wait for 2 seconds for feedback to reset
      await waitFor(() => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
        expect(screen.getByText('Copy PIN')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles clipboard API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      clipboardWriteTextSpy.mockRejectedValue(new Error('Clipboard access denied'));

      render(<PinDisplay pin="1234" />);

      const button = screen.getByRole('button', { name: /copy pin to clipboard/i });
      fireEvent.click(button);

      // Should log error but not crash
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to copy PIN:',
          expect.any(Error)
        );
      }, { timeout: 1000 });

      // Button should not show success state
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('does not attempt to copy when PIN is null', () => {
      render(<PinDisplay pin={null} />);

      // Component should not render when pin is null
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(clipboardWriteTextSpy).not.toHaveBeenCalled();
    });

    it('applies custom className', () => {
      const { container } = render(<PinDisplay pin="1234" className="custom-class" />);

      const pinDisplay = container.querySelector('.custom-class');
      expect(pinDisplay).toBeInTheDocument();
    });

    it('has correct ARIA labels for accessibility', () => {
      render(<PinDisplay pin="1234" />);

      expect(screen.getByRole('status', { name: 'Room PIN' })).toBeInTheDocument();
      expect(screen.getByLabelText('PIN: 1234')).toBeInTheDocument();
    });
  });

  describe('Offline mode', () => {
    it('displays offline session ID when provided and PIN is null', () => {
      render(<PinDisplay pin={null} offlineSessionId="offline-123" />);

      expect(screen.getByText('Offline Session ID')).toBeInTheDocument();
      expect(screen.getByText('offline-123')).toBeInTheDocument();
      expect(screen.getByText('No network connection. PIN sharing unavailable.')).toBeInTheDocument();
    });

    it('does not show copy button in offline mode', () => {
      render(<PinDisplay pin={null} offlineSessionId="offline-123" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('prefers PIN over offline session ID when both provided', () => {
      render(<PinDisplay pin="1234" offlineSessionId="offline-123" />);

      // Should show PIN, not offline ID
      expect(screen.getByText('Room PIN')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.queryByText('Offline Session ID')).not.toBeInTheDocument();
    });

    it('has correct ARIA label in offline mode', () => {
      render(<PinDisplay pin={null} offlineSessionId="offline-123" />);

      expect(screen.getByRole('status', { name: 'Offline Session ID' })).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty string PIN', () => {
      render(<PinDisplay pin="" />);

      // Empty PIN should be treated as null
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('handles very long PINs', () => {
      const longPin = '123456789012345678901234567890';
      render(<PinDisplay pin={longPin} />);

      expect(screen.getByText(longPin)).toBeInTheDocument();
      expect(screen.getByLabelText(`PIN: ${longPin}`)).toBeInTheDocument();
    });

    it('handles special characters in PIN', () => {
      const specialPin = '!@#$';
      render(<PinDisplay pin={specialPin} />);

      expect(screen.getByText(specialPin)).toBeInTheDocument();
    });

    it('renders null when no PIN and no offline session ID', () => {
      const { container } = render(<PinDisplay pin={null} offlineSessionId={null} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Visual design', () => {
    it('has senior-friendly large font sizes', () => {
      render(<PinDisplay pin="1234" />);

      const pinElement = screen.getByLabelText('PIN: 1234');
      expect(pinElement).toHaveClass('text-4xl'); // Large on mobile
    });

    it('has high contrast text', () => {
      render(<PinDisplay pin="1234" />);

      const pinElement = screen.getByLabelText('PIN: 1234');
      expect(pinElement).toHaveClass('text-foreground'); // High contrast color
    });

    it('uses monospace font for PIN', () => {
      render(<PinDisplay pin="1234" />);

      const pinElement = screen.getByLabelText('PIN: 1234');
      expect(pinElement).toHaveClass('font-mono');
    });
  });

  describe('Multiple clicks', () => {
    it('handles rapid consecutive clicks', async () => {
      render(<PinDisplay pin="1234" />);

      const button = screen.getByRole('button', { name: /copy pin to clipboard/i });

      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should have called clipboard API for each click
      await waitFor(() => {
        expect(clipboardWriteTextSpy).toHaveBeenCalledTimes(3);
        expect(clipboardWriteTextSpy).toHaveBeenCalledWith('1234');
      });
    });
  });
});
