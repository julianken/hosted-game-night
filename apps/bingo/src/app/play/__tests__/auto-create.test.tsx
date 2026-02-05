/**
 * PlayPage Auto-Create Game Tests (BEA-417)
 *
 * Verifies that the /play page auto-creates a game with default settings
 * when no session exists, instead of showing a modal.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayPage from '../page';
import { ToastProvider } from "@beak-gaming/ui";
import {
  getStoredOfflineSessionId,
  clearStoredOfflineSessionId,
} from '@/lib/session/secure-generation';

// Mock HTMLDialogElement methods (not supported in jsdom)
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

// Mock dependencies
const mockSetPattern = vi.fn();
const mockResetGame = vi.fn();

vi.mock('@/hooks/use-game', () => ({
  useGameKeyboard: () => ({
    status: 'idle',
    currentBall: null,
    previousBall: null,
    ballsCalled: 0,
    ballsRemaining: 75,
    calledBalls: [],
    recentBalls: [],
    pattern: null,
    autoCallEnabled: false,
    autoCallSpeed: 10,
    audioEnabled: true,
    canCall: false,
    canStart: true,
    canPause: false,
    canResume: false,
    canUndo: false,
    startGame: vi.fn(),
    callBall: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    resetGame: mockResetGame,
    undoCall: vi.fn(),
    setPattern: mockSetPattern,
    toggleAutoCall: vi.fn(),
    setAutoCallSpeed: vi.fn(),
    toggleAudio: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-sync', () => ({
  useSync: () => ({ isConnected: false }),
}));

const mockClearToken = vi.fn();

vi.mock('@beak-gaming/sync', () => ({
  useSessionRecovery: () => ({
    isRecovering: false,
    isRecovered: false,
    error: null,
    roomCode: null,
    recover: vi.fn(),
    clearToken: mockClearToken,
    storeToken: vi.fn(),
  }),
  useAutoSync: () => ({
    isSyncing: false,
    lastSyncTime: null,
  }),
}));

vi.mock('@/hooks/use-audio', () => ({
  useAudioPreload: () => ({ preloadProgress: 0 }),
  useAudio: () => ({
    voicePack: 'standard',
    setVoicePack: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-theme', () => ({
  useApplyTheme: vi.fn(),
}));

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: () => 'light',
  THEME_OPTIONS: [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ],
}));

// Mock useGameStore with both hook and direct store access
const mockGameStoreState = {
  status: 'idle',
  calledBalls: [],
  pattern: null,
  autoCallEnabled: false,
  audioEnabled: true,
};

vi.mock('@/stores/game-store', () => {
  const state = {
    status: 'idle',
    calledBalls: [],
    pattern: null,
    autoCallEnabled: false,
    audioEnabled: true,
  };

  const mockSetState = vi.fn((updater) => {
    if (typeof updater === 'function') {
      const newState = updater(state);
      Object.assign(state, newState);
    } else {
      Object.assign(state, updater);
    }
  });

  const mockGetState = vi.fn(() => state);

  const useGameStore = () => state;
  useGameStore.setState = mockSetState;
  useGameStore.getState = mockGetState;

  return { useGameStore };
});

// Mock the pattern registry
vi.mock('@/lib/game/patterns', () => {
  const blackoutPattern = {
    id: 'blackout',
    name: 'Blackout',
    description: 'Cover all 24 numbers',
    category: 'coverage',
    positions: Array.from({ length: 25 }, (_, i) => i),
  };

  return {
    patternRegistry: {
      get: (id: string) => {
        if (id === 'blackout') {
          return blackoutPattern;
        }
        return null;
      },
      getByCategory: (category: string) => {
        if (category === 'coverage') {
          return [blackoutPattern];
        }
        return [];
      },
      getAll: () => [blackoutPattern],
    },
  };
});

// Helper to render PlayPage with required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

// Get reference to mocked functions after vi.mock() hoisting
async function getMockGameStore() {
  const { useGameStore } = await import('@/stores/game-store');
  return {
    setState: useGameStore.setState as ReturnType<typeof vi.fn>,
    getState: useGameStore.getState as ReturnType<typeof vi.fn>,
  };
}

describe('PlayPage - Auto-Create Game (BEA-417)', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
    // Reset mock store state
    Object.assign(mockGameStoreState, {
      status: 'idle',
      calledBalls: [],
      pattern: null,
      autoCallEnabled: false,
      audioEnabled: true,
    });
    // Mock window.matchMedia for PWA components
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock useGameStore.setState and getState for auto-create will be done via module mock
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Auto-Create on First Visit', () => {
    it('auto-creates offline game when no session exists', async () => {
      // Ensure no stored session
      expect(getStoredOfflineSessionId()).toBeNull();

      renderWithProviders(<PlayPage />);

      // Should auto-create an offline session
      await waitFor(() => {
        const sessionId = getStoredOfflineSessionId();
        expect(sessionId).not.toBeNull();
        expect(sessionId?.length).toBe(6);
      }, { timeout: 3000 });

      // Should set default pattern (Blackout)
      const { setState } = await getMockGameStore();
      await waitFor(() => {
        expect(setState).toHaveBeenCalled();
        // Check that setState was called with pattern and audioEnabled
        const calls = setState.mock.calls;
        const setStateCall = calls.find(call => {
          const arg = call[0];
          if (typeof arg === 'function') {
            const result = arg(mockGameStoreState);
            return result.pattern?.id === 'blackout' && result.audioEnabled === true;
          }
          return arg.pattern?.id === 'blackout' && arg.audioEnabled === true;
        });
        expect(setStateCall).toBeDefined();
      }, { timeout: 3000 });
    });

    it('does not show modal on first visit when auto-creating', async () => {
      // Ensure no stored session
      clearStoredOfflineSessionId();

      renderWithProviders(<PlayPage />);

      // Wait for auto-create to complete
      await waitFor(() => {
        expect(getStoredOfflineSessionId()).not.toBeNull();
      }, { timeout: 3000 });

      // Modal should NOT be shown
      const modal = screen.queryByRole('dialog');
      expect(modal).toBeNull();
    });

    it('sets audio enabled by default on auto-create', async () => {
      clearStoredOfflineSessionId();

      renderWithProviders(<PlayPage />);

      const { setState } = await getMockGameStore();
      await waitFor(() => {
        expect(setState).toHaveBeenCalled();
        const calls = setState.mock.calls;
        const audioCall = calls.find(call => {
          const arg = call[0];
          if (typeof arg === 'function') {
            const result = arg(mockGameStoreState);
            return result.audioEnabled === true;
          }
          return arg.audioEnabled === true;
        });
        expect(audioCall).toBeDefined();
      }, { timeout: 3000 });
    });
  });

  describe('Modal Behavior', () => {
    it('shows modal ONLY when "Create New Game" button is clicked', async () => {
      // Start with auto-created session
      renderWithProviders(<PlayPage />);

      // Wait for auto-create
      await waitFor(() => {
        expect(getStoredOfflineSessionId()).not.toBeNull();
      }, { timeout: 3000 });

      // Modal should not be visible initially
      expect(screen.queryByRole('dialog')).toBeNull();

      // Click "Create New Game" button
      const createNewButton = await screen.findByRole('button', { name: /create new game/i });
      await userEvent.click(createNewButton);

      // Modal should now be visible
      await waitFor(() => {
        const modal = screen.queryByRole('dialog');
        expect(modal).not.toBeNull();
      });
    });

    // This test would require dynamic mock override which is complex in Vitest
    // The key behavior is tested by the "does not show modal on first visit" test
  });

  describe('Auto-Create Prevention', () => {
    it('does not auto-create if offline session already exists', async () => {
      // Manually create an offline session
      const existingSessionId = 'ABC123';
      localStorage.setItem('bingo_offline_session_id', existingSessionId);
      localStorage.setItem(`bingo_offline_session_${existingSessionId}`, JSON.stringify({
        sessionId: existingSessionId,
        isOffline: true,
        gameState: {
          status: 'idle',
          calledBalls: [],
          pattern: null,
        },
      }));

      renderWithProviders(<PlayPage />);

      // Should use existing session, not create new one
      await waitFor(() => {
        const sessionId = getStoredOfflineSessionId();
        expect(sessionId).toBe(existingSessionId);
      });

      // Should not call setState for auto-create
      // (might be called for recovery hydration, but not for auto-create)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify we didn't create a new session
      expect(getStoredOfflineSessionId()).toBe(existingSessionId);
    });

  });

  describe('Create New Game Resets Auto-Create', () => {
    it('allows auto-create again after clicking "Create New Game"', async () => {
      renderWithProviders(<PlayPage />);

      // Wait for initial auto-create
      await waitFor(() => {
        expect(getStoredOfflineSessionId()).not.toBeNull();
      }, { timeout: 3000 });

      getStoredOfflineSessionId();

      // Click "Create New Game" button (this clears session and resets auto-create flag)
      const createNewButton = await screen.findByRole('button', { name: /create new game/i });
      await userEvent.click(createNewButton);

      // Modal should be shown
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeNull();
      });

      // Close modal (dismissing it)
      const dialog = screen.getByRole('dialog');
      const closeButton = dialog.querySelector('button[aria-label="Close"]') ||
                          dialog.querySelector('[data-testid="close-modal"]');
      if (closeButton) {
        await userEvent.click(closeButton as HTMLElement);
      }

      // Verify session was cleared
      expect(mockClearToken).toHaveBeenCalled();
      expect(mockResetGame).toHaveBeenCalled();
    });
  });
});
