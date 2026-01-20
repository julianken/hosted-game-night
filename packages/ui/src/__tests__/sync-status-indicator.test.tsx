import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusIndicator } from '../sync-status-indicator';

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    // Mock current time for consistent timestamp tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render with saving status', () => {
      render(<SyncStatusIndicator status="saving" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should render with saved status', () => {
      render(<SyncStatusIndicator status="saved" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('should render with error status', () => {
      render(<SyncStatusIndicator status="error" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Sync error')).toBeInTheDocument();
    });
  });

  describe('saving state', () => {
    it('should display saving text', () => {
      render(<SyncStatusIndicator status="saving" />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should show spinner icon', () => {
      const { container } = render(<SyncStatusIndicator status="saving" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have blue color scheme', () => {
      const { container } = render(<SyncStatusIndicator status="saving" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('text-blue-600');
      expect(statusElement?.className).toContain('bg-blue-50');
    });

    it('should have correct aria-label for saving', () => {
      render(<SyncStatusIndicator status="saving" />);
      expect(screen.getByLabelText('Saving game state')).toBeInTheDocument();
    });
  });

  describe('saved state', () => {
    it('should display saved text without timestamp', () => {
      render(<SyncStatusIndicator status="saved" />);
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('should display relative time when lastSavedAt is provided', () => {
      const fiveMinutesAgo = new Date('2024-01-20T11:55:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={fiveMinutesAgo} />);
      expect(screen.getByText('Saved 5 minutes ago')).toBeInTheDocument();
    });

    it('should show checkmark icon', () => {
      const { container } = render(<SyncStatusIndicator status="saved" />);
      const checkmark = container.querySelector('svg path[d*="M5 13l4 4L19 7"]');
      expect(checkmark).toBeInTheDocument();
    });

    it('should have green color scheme', () => {
      const { container } = render(<SyncStatusIndicator status="saved" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('text-green-600');
      expect(statusElement?.className).toContain('bg-green-50');
    });

    it('should have correct aria-label for saved', () => {
      render(<SyncStatusIndicator status="saved" />);
      expect(screen.getByLabelText('Game state saved successfully')).toBeInTheDocument();
    });

    it('should include timestamp in aria-label when provided', () => {
      const twoHoursAgo = new Date('2024-01-20T10:00:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={twoHoursAgo} />);
      expect(screen.getByLabelText('Game state saved 2 hours ago')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display default error message', () => {
      render(<SyncStatusIndicator status="error" />);
      expect(screen.getByText('Sync error')).toBeInTheDocument();
    });

    it('should display custom error message', () => {
      render(
        <SyncStatusIndicator
          status="error"
          errorMessage="Failed to connect to server"
        />
      );
      expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
    });

    it('should show error icon', () => {
      const { container } = render(<SyncStatusIndicator status="error" />);
      const errorIcon = container.querySelector(
        'svg path[d*="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"]'
      );
      expect(errorIcon).toBeInTheDocument();
    });

    it('should have red color scheme', () => {
      const { container } = render(<SyncStatusIndicator status="error" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('text-red-600');
      expect(statusElement?.className).toContain('bg-red-50');
    });

    it('should have correct aria-label with default message', () => {
      render(<SyncStatusIndicator status="error" />);
      expect(screen.getByLabelText('Sync error: Failed to save')).toBeInTheDocument();
    });

    it('should have correct aria-label with custom message', () => {
      render(
        <SyncStatusIndicator
          status="error"
          errorMessage="Network timeout"
        />
      );
      expect(screen.getByLabelText('Sync error: Network timeout')).toBeInTheDocument();
    });
  });

  describe('timestamp formatting', () => {
    it('should format "just now" for recent saves (< 5 seconds)', () => {
      const justNow = new Date('2024-01-20T11:59:58Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={justNow} />);
      expect(screen.getByText('Saved just now')).toBeInTheDocument();
    });

    it('should format seconds (5-59 seconds)', () => {
      const thirtySecondsAgo = new Date('2024-01-20T11:59:30Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={thirtySecondsAgo} />);
      expect(screen.getByText('Saved 30 seconds ago')).toBeInTheDocument();
    });

    it('should format single minute', () => {
      const oneMinuteAgo = new Date('2024-01-20T11:59:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={oneMinuteAgo} />);
      expect(screen.getByText('Saved 1 minute ago')).toBeInTheDocument();
    });

    it('should format multiple minutes', () => {
      const fifteenMinutesAgo = new Date('2024-01-20T11:45:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={fifteenMinutesAgo} />);
      expect(screen.getByText('Saved 15 minutes ago')).toBeInTheDocument();
    });

    it('should format single hour', () => {
      const oneHourAgo = new Date('2024-01-20T11:00:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={oneHourAgo} />);
      expect(screen.getByText('Saved 1 hour ago')).toBeInTheDocument();
    });

    it('should format multiple hours', () => {
      const threeHoursAgo = new Date('2024-01-20T09:00:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={threeHoursAgo} />);
      expect(screen.getByText('Saved 3 hours ago')).toBeInTheDocument();
    });

    it('should format single day', () => {
      const oneDayAgo = new Date('2024-01-19T12:00:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={oneDayAgo} />);
      expect(screen.getByText('Saved 1 day ago')).toBeInTheDocument();
    });

    it('should format multiple days', () => {
      const threeDaysAgo = new Date('2024-01-17T12:00:00Z');
      render(<SyncStatusIndicator status="saved" lastSavedAt={threeDaysAgo} />);
      expect(screen.getByText('Saved 3 days ago')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should render only icon in compact mode', () => {
      const { container } = render(<SyncStatusIndicator status="saved" compact />);
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should not show background in compact mode', () => {
      const { container } = render(<SyncStatusIndicator status="saved" compact />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).not.toContain('bg-green-50');
      expect(statusElement?.className).not.toContain('px-3');
    });

    it('should maintain color in compact mode', () => {
      const { container } = render(<SyncStatusIndicator status="error" compact />);
      const statusElement = container.querySelector('[role="status"]');
      const colorSpan = statusElement?.querySelector('span');
      expect(colorSpan?.className).toContain('text-red-600');
    });

    it('should have aria-label in compact mode', () => {
      render(<SyncStatusIndicator status="saving" compact />);
      expect(screen.getByLabelText('Saving game state')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SyncStatusIndicator status="saved" className="custom-class" />
      );
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('custom-class');
    });

    it('should preserve built-in classes with custom className', () => {
      const { container } = render(
        <SyncStatusIndicator status="saved" className="my-4" />
      );
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('my-4');
      expect(statusElement?.className).toContain('text-green-600');
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<SyncStatusIndicator status="saving" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      const { container } = render(<SyncStatusIndicator status="saving" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive aria-label', () => {
      render(<SyncStatusIndicator status="saving" />);
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-label');
      expect(statusElement.getAttribute('aria-label')).toBeTruthy();
    });

    it('should mark icons as aria-hidden', () => {
      const { container } = render(<SyncStatusIndicator status="saving" />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('dark mode support', () => {
    it('should include dark mode classes for saving state', () => {
      const { container } = render(<SyncStatusIndicator status="saving" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('dark:text-blue-400');
      expect(statusElement?.className).toContain('dark:bg-blue-950');
    });

    it('should include dark mode classes for saved state', () => {
      const { container } = render(<SyncStatusIndicator status="saved" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('dark:text-green-400');
      expect(statusElement?.className).toContain('dark:bg-green-950');
    });

    it('should include dark mode classes for error state', () => {
      const { container } = render(<SyncStatusIndicator status="error" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('dark:text-red-400');
      expect(statusElement?.className).toContain('dark:bg-red-950');
    });
  });

  describe('visual design', () => {
    it('should use senior-friendly text size (text-lg, 18px minimum)', () => {
      const { container } = render(<SyncStatusIndicator status="saved" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('text-lg');
    });

    it('should have appropriate padding', () => {
      const { container } = render(<SyncStatusIndicator status="saved" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('px-3');
      expect(statusElement?.className).toContain('py-1.5');
    });

    it('should have rounded corners', () => {
      const { container } = render(<SyncStatusIndicator status="saved" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('rounded-md');
    });

    it('should display icon and text with gap', () => {
      const { container } = render(<SyncStatusIndicator status="saved" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.className).toContain('gap-2');
    });
  });
});
