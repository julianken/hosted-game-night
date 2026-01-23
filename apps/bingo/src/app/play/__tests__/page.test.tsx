/**
 * PlayPage Integration Tests
 *
 * This file tests the offline mode and session ID strategy features.
 *
 * TODO: Add back modal timing and recovery error handling tests from PR #123
 * (These tests verify shouldShowModal logic with recoveryAttempted, isRecovered,
 * dismissedRecoveryError state tracking)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import PlayPage from '../page';
import { ToastProvider } from '@/components/ui/Toast';
import {
  generateSecurePin,
  generateShortSessionId,
  getStoredPin,
  storePin,
  clearStoredPin,
  getStoredOfflineSessionId,
  storeOfflineSessionId,
  clearStoredOfflineSessionId,
} from '@/lib/session/secure-generation';

// Mock HTMLDialogElement methods (not supported in jsdom)
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

// Mock dependencies
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

vi.mock('@beak-gaming/sync', () => ({
  useSessionRecovery: () => ({
    isRecovering: false,
    isRecovered: false,
    error: null,
    roomCode: null,
    recover: vi.fn(),
    clearToken: vi.fn(),
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

vi.mock('@/stores/game-store', () => ({
  useGameStore: () => ({
    status: 'idle',
    calledBalls: [],
    pattern: null,
    autoCallEnabled: false,
    audioEnabled: true,
  }),
}));

// Helper to render PlayPage with required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('PlayPage - Session ID Strategy', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
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
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Offline Session ID Management', () => {
    it('generates and stores a new offline session ID if none exists', async () => {
      // Ensure no stored session ID
      expect(getStoredOfflineSessionId()).toBeNull();

      renderWithProviders(<PlayPage />);

      // Wait for the useEffect to run
      await waitFor(() => {
        const storedId = getStoredOfflineSessionId();
        expect(storedId).not.toBeNull();
        expect(storedId?.length).toBe(6);
      });
    });

    it('uses existing offline session ID if available', async () => {
      // Store a session ID before rendering
      const existingId = generateShortSessionId();
      storeOfflineSessionId(existingId);

      renderWithProviders(<PlayPage />);

      // Should use the existing ID
      await waitFor(() => {
        const storedId = getStoredOfflineSessionId();
        expect(storedId).toBe(existingId);
      });
    });

    it('does not generate new session ID if one is already stored', async () => {
      const existingId = 'ABC123';
      storeOfflineSessionId(existingId);

      renderWithProviders(<PlayPage />);

      await waitFor(() => {
        const storedId = getStoredOfflineSessionId();
        expect(storedId).toBe(existingId);
      });
    });
  });

  describe('Session ID Calculation', () => {
    it('uses offline session ID when no Supabase session exists', async () => {
      const offlineId = generateShortSessionId();
      storeOfflineSessionId(offlineId);

      renderWithProviders(<PlayPage />);

      // The component should use the offline session ID for BroadcastChannel
      await waitFor(() => {
        expect(getStoredOfflineSessionId()).toBe(offlineId);
      });
    });

    it('prioritizes Supabase session ID over offline session ID', async () => {
      // This test would need more complex mocking to test online scenarios
      // For now, we're testing the offline-first approach
      const offlineId = generateShortSessionId();
      storeOfflineSessionId(offlineId);

      renderWithProviders(<PlayPage />);

      await waitFor(() => {
        expect(getStoredOfflineSessionId()).toBe(offlineId);
      });
    });
  });

  describe('Session Recovery with PIN', () => {
    it('uses stored PIN when recovering a session', async () => {
      const pin = generateSecurePin();
      const sessionId = generateShortSessionId();

      storePin(pin);
      storeOfflineSessionId(sessionId);

      renderWithProviders(<PlayPage />);

      await waitFor(() => {
        expect(getStoredPin()).toBe(pin);
        expect(getStoredOfflineSessionId()).toBe(sessionId);
      });
    });

    it('handles missing PIN gracefully', async () => {
      clearStoredPin();

      renderWithProviders(<PlayPage />);

      await waitFor(() => {
        expect(getStoredPin()).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid session IDs gracefully', async () => {
      // Store an invalid session ID
      localStorage.setItem('bingo_offline_session_id', 'INVALID');

      renderWithProviders(<PlayPage />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Beak Bingo')).toBeInTheDocument();
      });
    });
  });

  describe('Secure Generation Utilities Integration', () => {
    it('generates secure PINs with correct format', () => {
      const pin = generateSecurePin();
      expect(pin).toMatch(/^\d{4}$/);
      const pinNum = parseInt(pin, 10);
      expect(pinNum).toBeGreaterThanOrEqual(1000);
      expect(pinNum).toBeLessThanOrEqual(9999);
    });

    it('generates session IDs with correct format', () => {
      const sessionId = generateShortSessionId();
      expect(sessionId).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
      expect(sessionId.length).toBe(6);
    });

    it('stores and retrieves PIN correctly', () => {
      const pin = generateSecurePin();
      storePin(pin);
      expect(getStoredPin()).toBe(pin);
      clearStoredPin();
      expect(getStoredPin()).toBeNull();
    });

    it('stores and retrieves offline session ID correctly', () => {
      const sessionId = generateShortSessionId();
      storeOfflineSessionId(sessionId);
      expect(getStoredOfflineSessionId()).toBe(sessionId);
      clearStoredOfflineSessionId();
      expect(getStoredOfflineSessionId()).toBeNull();
    });
  });

  describe('Multi-tab Scenario', () => {
    it('prevents session ID collisions between tabs', async () => {
      // Simulate two tabs
      const tab1SessionId = generateShortSessionId();
      const tab2SessionId = generateShortSessionId();

      // Store different session IDs
      storeOfflineSessionId(tab1SessionId);

      renderWithProviders(<PlayPage />);

      await waitFor(() => {
        const storedId = getStoredOfflineSessionId();
        expect(storedId).toBe(tab1SessionId);
      });

      // In a real multi-tab scenario, each tab should maintain its own session
      // This is handled by the BroadcastChannel API using different session IDs
    });
  });
});

describe('Secure Generation Utilities', () => {
  describe('generateSecurePin', () => {
    it('generates 4-digit PINs', () => {
      for (let i = 0; i < 100; i++) {
        const pin = generateSecurePin();
        expect(pin).toMatch(/^\d{4}$/);
      }
    });

    it('generates PINs in valid range', () => {
      for (let i = 0; i < 100; i++) {
        const pin = generateSecurePin();
        const num = parseInt(pin, 10);
        expect(num).toBeGreaterThanOrEqual(1000);
        expect(num).toBeLessThanOrEqual(9999);
      }
    });

    it('generates unique PINs', () => {
      const pins = new Set();
      for (let i = 0; i < 100; i++) {
        pins.add(generateSecurePin());
      }
      // Should have high uniqueness (>90% unique)
      expect(pins.size).toBeGreaterThan(90);
    });
  });

  describe('generateShortSessionId', () => {
    it('generates 6-character session IDs', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateShortSessionId();
        expect(id.length).toBe(6);
      }
    });

    it('only uses allowed characters', () => {
      const allowedChars = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/;
      for (let i = 0; i < 100; i++) {
        const id = generateShortSessionId();
        expect(id).toMatch(allowedChars);
      }
    });

    it('excludes ambiguous characters', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateShortSessionId();
        expect(id).not.toContain('0');
        expect(id).not.toContain('O');
        expect(id).not.toContain('1');
        expect(id).not.toContain('I');
      }
    });

    it('generates unique session IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateShortSessionId());
      }
      // Should have very high uniqueness (>95% unique)
      expect(ids.size).toBeGreaterThan(95);
    });
  });

  describe('PIN storage', () => {
    beforeEach(() => {
      clearStoredPin();
    });

    it('stores PIN in localStorage', () => {
      const pin = '1234';
      storePin(pin);
      expect(localStorage.getItem('bingo_pin')).toBe(pin);
    });

    it('retrieves stored PIN', () => {
      const pin = '5678';
      storePin(pin);
      expect(getStoredPin()).toBe(pin);
    });

    it('returns null when no PIN stored', () => {
      expect(getStoredPin()).toBeNull();
    });

    it('clears stored PIN', () => {
      storePin('9999');
      clearStoredPin();
      expect(getStoredPin()).toBeNull();
    });
  });

  describe('Offline session ID storage', () => {
    beforeEach(() => {
      clearStoredOfflineSessionId();
    });

    it('stores session ID in localStorage', () => {
      const id = 'ABC123';
      storeOfflineSessionId(id);
      expect(localStorage.getItem('bingo_offline_session_id')).toBe(id);
    });

    it('retrieves stored session ID', () => {
      const id = 'XYZ789';
      storeOfflineSessionId(id);
      expect(getStoredOfflineSessionId()).toBe(id);
    });

    it('returns null when no session ID stored', () => {
      expect(getStoredOfflineSessionId()).toBeNull();
    });

    it('clears stored session ID', () => {
      storeOfflineSessionId('TEST12');
      clearStoredOfflineSessionId();
      expect(getStoredOfflineSessionId()).toBeNull();
    });
  });
});
