import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ShareSession } from '../share-session';

// Mock @joolie-boolie/sync
vi.mock('@joolie-boolie/sync', () => ({
  generateSessionLink: vi.fn(({ gameType, role }: { gameType: string; role: string }) => {
    return `https://example.com/play?session=test-session&role=${role}&game=${gameType}`;
  }),
  getParticipantCounts: vi.fn(() => ({
    presenter: 1,
    audience: 0,
    total: 1,
  })),
  getSessionState: vi.fn(() => ({
    sessionId: 'test-session',
    gameType: 'bingo',
    participants: [],
  })),
}));

// Import after mock to get typed references
import {
  generateSessionLink,
  getParticipantCounts,
  getSessionState,
} from '@joolie-boolie/sync';

const mockGenerateSessionLink = vi.mocked(generateSessionLink);
const mockGetParticipantCounts = vi.mocked(getParticipantCounts);
const mockGetSessionState = vi.mocked(getSessionState);

describe('ShareSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSessionLink.mockImplementation(
      ({ role }: { gameType: string; role?: string }) =>
        `https://example.com/play?session=test-session&role=${role ?? 'audience'}`
    );
    mockGetParticipantCounts.mockReturnValue({
      presenter: 1,
      audience: 0,
      total: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the Share button', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      expect(screen.getByRole('button', { name: 'Share session' })).toBeInTheDocument();
    });

    it('should not show the panel by default', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display participant count badge when total > 1', () => {
      mockGetParticipantCounts.mockReturnValue({
        presenter: 1,
        audience: 2,
        total: 3,
      });
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={true}
          gameType="trivia"
        />
      );
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not display participant count badge when total <= 1', () => {
      mockGetParticipantCounts.mockReturnValue({
        presenter: 1,
        audience: 0,
        total: 1,
      });
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={true}
          gameType="bingo"
        />
      );
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('panel toggle', () => {
    it('should open the panel when Share button is clicked', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));
      expect(screen.getByRole('dialog', { name: 'Share session' })).toBeInTheDocument();
    });

    it('should close the panel when close button is clicked', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close share panel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should update aria-expanded when panel is open', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      const toggleBtn = screen.getByRole('button', { name: 'Share session' });
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(toggleBtn).toHaveAccessibleName('Hide share session panel');
    });
  });

  describe('gameType prop', () => {
    it('should pass gameType="bingo" to generateSessionLink', () => {
      render(
        <ShareSession
          sessionId="my-bingo-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      expect(mockGenerateSessionLink).toHaveBeenCalledWith(
        expect.objectContaining({ gameType: 'bingo', role: 'audience' })
      );
      expect(mockGenerateSessionLink).toHaveBeenCalledWith(
        expect.objectContaining({ gameType: 'bingo', role: 'presenter' })
      );
    });

    it('should pass gameType="trivia" to generateSessionLink', () => {
      render(
        <ShareSession
          sessionId="my-trivia-session"
          isConnected={false}
          gameType="trivia"
        />
      );
      expect(mockGenerateSessionLink).toHaveBeenCalledWith(
        expect.objectContaining({ gameType: 'trivia', role: 'audience' })
      );
      expect(mockGenerateSessionLink).toHaveBeenCalledWith(
        expect.objectContaining({ gameType: 'trivia', role: 'presenter' })
      );
    });

    it('should pass sessionId to generateSessionLink', () => {
      render(
        <ShareSession
          sessionId="custom-session-id"
          isConnected={false}
          gameType="bingo"
        />
      );
      expect(mockGenerateSessionLink).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'custom-session-id' })
      );
    });
  });

  describe('connection status', () => {
    it('should display "Sync active" when connected', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={true}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));
      expect(screen.getByText('Sync active')).toBeInTheDocument();
    });

    it('should display "Sync ready" when not connected', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));
      expect(screen.getByText('Sync ready')).toBeInTheDocument();
    });
  });

  describe('panel content', () => {
    it('should display audience and co-host link sections', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      expect(screen.getByText('Audience Display Link')).toBeInTheDocument();
      expect(screen.getByText('Co-Host Link')).toBeInTheDocument();
    });

    it('should display participant counts in the panel', () => {
      mockGetParticipantCounts.mockReturnValue({
        presenter: 2,
        audience: 5,
        total: 7,
      });
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={true}
          gameType="trivia"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      expect(screen.getByText('Presenters: 2')).toBeInTheDocument();
      expect(screen.getByText('Audience: 5')).toBeInTheDocument();
    });

    it('should display the note about same-device limitation', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      expect(
        screen.getByText(/Session sharing currently works for same-device windows only/)
      ).toBeInTheDocument();
    });

    it('should display shareable link inputs', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2);
      // Both should be read-only
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('readOnly');
      });
    });
  });

  describe('clipboard copy', () => {
    it('should call navigator.clipboard.writeText when copy is clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      // Click the first Copy button (audience link)
      const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
      // The primary Copy button (for audience link)
      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      expect(writeTextMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('session state polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start polling session state and participant counts when panel opens', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );

      // Should not poll before panel is open
      expect(mockGetSessionState).not.toHaveBeenCalled();
      // getParticipantCounts is called once for initial state
      const initialCountCalls = mockGetParticipantCounts.mock.calls.length;

      // Open panel
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      // Should have been called once immediately (loadState in effect)
      expect(mockGetSessionState).toHaveBeenCalledTimes(1);
      expect(mockGetParticipantCounts).toHaveBeenCalledTimes(initialCountCalls + 1);

      // Advance timer to trigger interval
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockGetSessionState).toHaveBeenCalledTimes(2);
      expect(mockGetParticipantCounts).toHaveBeenCalledTimes(initialCountCalls + 2);
    });

    it('should stop polling when panel closes', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );

      // Open panel
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));
      expect(mockGetSessionState).toHaveBeenCalledTimes(1);

      // Close panel
      fireEvent.click(screen.getByRole('button', { name: 'Close share panel' }));

      // Advance timer - should NOT increase call count
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Should still be 1 (only the initial call when opened)
      expect(mockGetSessionState).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on the share button', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      expect(screen.getByRole('button', { name: 'Share session' })).toHaveAttribute(
        'aria-label',
        'Share session'
      );
    });

    it('should have role="dialog" with aria-modal on the share panel', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should associate labels with inputs via htmlFor/id', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      const audienceLabel = screen.getByText('Audience Display Link');
      expect(audienceLabel).toHaveAttribute('for', 'audience-link-input');
      expect(document.getElementById('audience-link-input')).toBeInTheDocument();

      const cohostLabel = screen.getByText('Co-Host Link');
      expect(cohostLabel).toHaveAttribute('for', 'cohost-link-input');
      expect(document.getElementById('cohost-link-input')).toBeInTheDocument();
    });

    it('should focus the first focusable element when panel opens', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));

      // The first focusable element in the panel should be the audience link input
      const audienceInput = document.getElementById('audience-link-input');
      expect(audienceInput).toBe(document.activeElement);
    });

    it('should have aria-label on close button', () => {
      render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Share session' }));
      expect(screen.getByRole('button', { name: 'Close share panel' })).toBeInTheDocument();
    });

    it('should mark SVG icons as aria-hidden', () => {
      const { container } = render(
        <ShareSession
          sessionId="test-session"
          isConnected={false}
          gameType="bingo"
        />
      );
      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});
