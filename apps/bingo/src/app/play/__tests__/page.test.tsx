import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import PlayPage from '../page';
import { useSessionRecovery, useAutoSync } from '@beak-gaming/sync';
import { CreateGameModal, RoomCodeDisplay } from '@beak-gaming/ui';

// Get the mocked functions
const mockUseSessionRecovery = vi.mocked(useSessionRecovery);
const mockUseAutoSync = vi.mocked(useAutoSync);
const mockCreateGameModal = vi.mocked(CreateGameModal);
const mockRoomCodeDisplay = vi.mocked(RoomCodeDisplay);

// Mock all dependencies
vi.mock('@/hooks/use-game', () => ({
  useGameKeyboard: () => ({
    currentBall: null,
    previousBall: null,
    ballsCalled: 0,
    ballsRemaining: 75,
    status: 'idle',
    canCall: false,
    canStart: true,
    canPause: false,
    canResume: false,
    canUndo: false,
    pattern: null,
    calledBalls: [],
    recentBalls: [],
    autoCallEnabled: false,
    autoCallSpeed: 10,
    audioEnabled: true,
    startGame: vi.fn(),
    callBall: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    resetGame: vi.fn(),
    undoCall: vi.fn(),
    setPattern: vi.fn(),
    toggleAutoCall: vi.fn(),
    setAutoCallSpeed: vi.fn(),
    toggleAudio: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-sync', () => ({
  useSync: () => ({ isConnected: false }),
}));

vi.mock('@/hooks/use-audio', () => ({
  useAudioPreload: () => ({ preloadProgress: 0 }),
  useAudio: () => ({ voicePack: 'standard', setVoicePack: vi.fn() }),
}));

vi.mock('@/hooks/use-theme', () => ({
  useApplyTheme: vi.fn(),
}));

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: () => ({ presenterTheme: 'system' }),
  THEME_OPTIONS: [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ],
}));

vi.mock('@/stores/game-store', () => ({
  useGameStore: () => ({
    status: 'idle',
    calledBalls: [],
    pattern: null,
  }),
}));

vi.mock('@/lib/sync/session', () => ({
  generateSessionId: () => 'test-session-id',
}));

vi.mock('@/lib/session/serializer', () => ({
  serializeBingoState: vi.fn((state) => state),
  deserializeBingoState: vi.fn((state) => state),
}));

vi.mock('@/components/pwa', () => ({
  OfflineBanner: () => null,
  InstallPrompt: () => null,
}));

// Mock the sync package with factory function
vi.mock('@beak-gaming/sync', () => ({
  useSessionRecovery: vi.fn(),
  useAutoSync: vi.fn(),
}));

// Mock the UI package with factory function
vi.mock('@beak-gaming/ui', () => ({
  CreateGameModal: vi.fn(),
  JoinGameModal: vi.fn(),
  RoomCodeDisplay: vi.fn(),
  Slider: vi.fn(),
}));

describe('PlayPage - Modal Timing and Recovery Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseAutoSync.mockReturnValue({
      isSyncing: false,
      lastSyncTime: null,
    });

    // Setup UI mocks to render based on props
    mockCreateGameModal.mockImplementation((props: any) => {
      return props.isOpen ? <div data-testid="create-game-modal">Create Game Modal</div> : null;
    });

    mockRoomCodeDisplay.mockImplementation((props: any) => {
      return <div data-testid="room-code-display">{props.roomCode}</div>;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Scenario 1: First visit (no session)', () => {
    it('should show modal immediately when no session exists and recovery is not in progress', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: null,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      // Modal should be visible immediately
      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
      });
    });

    it('should show modal when recovery completes with no session found', async () => {
      // Start with recovery in progress
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: true,
        isRecovered: false,
        error: null,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      const { rerender } = render(<PlayPage />);

      // Recovery completes, still no session
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: null,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      rerender(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
      });
    });
  });

  describe('Scenario 2: Session recovery fails', () => {
    it('should show modal when recovery fails with error', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: 'Session expired',
        roomCode: 'ABC123',
        requiresPin: true,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
      });
    });

    it('should display error message to user when recovery fails', async () => {
      const errorMessage = 'Failed to recover session: Invalid token';

      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: errorMessage,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].error).toBe(errorMessage);
      });
    });

    it('should show modal for 401 Unauthorized error', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: 'Session expired. Please enter PIN to rejoin.',
        roomCode: 'XYZ789',
        requiresPin: true,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
        expect(lastCall[0].error).toContain('Session expired');
      });
    });

    it('should show modal for 404 Not Found error', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: 'Session not found. It may have expired.',
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
        expect(lastCall[0].error).toContain('Session not found');
      });
    });
  });

  describe('Scenario 3: Session recovery succeeds', () => {
    it('should NOT show modal when recovery succeeds', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: true,
        error: null,
        roomCode: 'DEF456',
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(false);
      });
    });

    it('should display room code when recovery succeeds', async () => {
      const roomCode = 'GHI789';

      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: true,
        error: null,
        roomCode,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      // The component should set roomCode from recovery
      await waitFor(() => {
        expect(mockRoomCodeDisplay).toHaveBeenCalled();
        const lastCall = mockRoomCodeDisplay.mock.calls[mockRoomCodeDisplay.mock.calls.length - 1];
        expect(lastCall[0].roomCode).toBe(roomCode);
      });
    });
  });

  describe('Scenario 4: No flashing behavior', () => {
    it('should NOT show modal while recovery is in progress', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: true,
        isRecovered: false,
        error: null,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(false);
      });
    });

    it('should maintain modal closed state during successful recovery transition', async () => {
      // Start with recovery in progress
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: true,
        isRecovered: false,
        error: null,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      const { rerender } = render(<PlayPage />);

      // Recovery succeeds
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: true,
        error: null,
        roomCode: 'JKL012',
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      rerender(<PlayPage />);

      // Modal should never have been opened
      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(false);
      });
    });
  });

  describe('Scenario 5: Recovery state tracking', () => {
    it('should track that recovery was attempted', async () => {
      // Recovery completes without session
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: null,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      // Modal should show because recovery was attempted but found nothing
      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
      });
    });

    it('should clear recovery error when modal is closed', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: 'Some error',
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
      });

      // Simulate closing modal
      act(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        lastCall[0].onClose();
      });

      // Error should be cleared
      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].error).toBeUndefined();
      });
    });
  });

  describe('Scenario 6: User manually opens modal', () => {
    it('should allow user to manually open modal via "Open Display" button when no room', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: true,
        error: null,
        roomCode: 'MNO345',
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      const { rerender } = render(<PlayPage />);

      // Initially modal is closed (successful recovery)
      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(false);
      });

      // TODO: Test manual opening via button click
      // This would require more complex setup to test the openDisplay function
    });
  });

  describe('Edge cases', () => {
    it('should handle transition from error to no error', async () => {
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: 'Initial error',
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      const { rerender } = render(<PlayPage />);

      // Error clears
      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: false,
        error: null,
        roomCode: null,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      rerender(<PlayPage />);

      // Modal should still be open (no session exists)
      await waitFor(() => {
        const lastCall = mockCreateGameModal.mock.calls[mockCreateGameModal.mock.calls.length - 1];
        expect(lastCall[0].isOpen).toBe(true);
      });
    });

    it('should sync recovered roomCode to component state', async () => {
      const recoveredRoomCode = 'PQR678';

      mockUseSessionRecovery.mockReturnValue({
        isRecovering: false,
        isRecovered: true,
        error: null,
        roomCode: recoveredRoomCode,
        requiresPin: false,
        recover: vi.fn(),
        clearToken: vi.fn(),
        storeToken: vi.fn(),
      });

      render(<PlayPage />);

      // Component should use the recovered room code
      await waitFor(() => {
        expect(mockRoomCodeDisplay).toHaveBeenCalled();
        const lastCall = mockRoomCodeDisplay.mock.calls[mockRoomCodeDisplay.mock.calls.length - 1];
        expect(lastCall[0].roomCode).toBe(recoveredRoomCode);
      });
    });
  });
});
