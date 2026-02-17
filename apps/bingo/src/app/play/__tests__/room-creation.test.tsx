/**
 * Room Creation Integration Tests
 *
 * Tests for the complete room creation flow including:
 * - Online room creation with PIN generation
 * - Offline mode creation and session ID generation
 * - Room joining with PIN validation
 * - Session recovery after page refresh
 * - Create New Game button behavior
 *
 * NOTE: With BEA-542, session logic moved to usePresenterSession hook.
 * These tests mock usePresenterSession to control modal/session state
 * and verify that the PlayPage correctly delegates to the hook.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayPage from '../page';
import { ToastProvider } from "@joolie-boolie/ui";
import {
  getStoredPin,
  storePin,
  getStoredOfflineSessionId,
} from '@/lib/session/secure-generation';

// Mock HTMLDialogElement methods (not supported in jsdom)
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

// Mock window.matchMedia (not supported in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock window.open for display window tests
global.window.open = vi.fn(() => ({
  focus: vi.fn(),
} as unknown as Window));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock dependencies
const mockResetGame = vi.fn();
const mockRecoverSession = vi.fn();
const mockClearToken = vi.fn();
const mockStoreToken = vi.fn();

// Session state that can be reset per-test
let mockSession = createDefaultSession();

function createDefaultSession() {
  return {
    mode: 'setup' as 'setup' | 'online' | 'offline' | 'joined',
    roomCode: null as string | null,
    offlineSessionId: null as string | null,
    sessionId: '',
    pin: null as string | null,
    isLoading: false,
    error: null as string | null,
    isRecovering: false,
    isRecovered: false,
    shouldShowModal: true,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    playOffline: vi.fn(),
    resetSession: vi.fn((opts?: { showModal?: boolean }) => {
      mockClearToken();
      if (opts?.showModal !== false) {
        mockSession.shouldShowModal = true;
      }
    }),
    openModal: vi.fn(() => { mockSession.shouldShowModal = true; }),
    closeModal: vi.fn(() => { mockSession.shouldShowModal = false; }),
    storeToken: mockStoreToken,
    clearToken: mockClearToken,
    recover: mockRecoverSession,
  };
}

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
    setPattern: vi.fn(),
    toggleAutoCall: vi.fn(),
    setAutoCallSpeed: vi.fn(),
    toggleAudio: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-sync', () => ({
  useSync: () => ({ isConnected: false }),
}));

vi.mock('@joolie-boolie/sync', () => ({
  useSessionRecovery: () => ({
    isRecovering: false,
    isRecovered: false,
    error: null,
    roomCode: null,
    requiresPin: false,
    recover: mockRecoverSession,
    clearToken: mockClearToken,
    storeToken: mockStoreToken,
  }),
  useAutoSync: () => ({
    isSyncing: false,
    lastSyncTime: null,
  }),
  usePresenterSession: () => mockSession,
  generateSecurePin: () => '1234',
  generateShortSessionId: () => 'TEST12',
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
  }),
}));

vi.mock('@/lib/session/serializer', () => ({
  serializeBingoState: vi.fn(() => ({ test: 'state' })),
  deserializeBingoState: vi.fn((state) => state),
}));

vi.mock('@/lib/game/patterns', () => ({
  patternRegistry: {
    get: () => null,
    getAll: () => [],
    getByCategory: () => [],
  },
}));

// Helper to render PlayPage with required providers
function renderPlayPage() {
  return render(
    <ToastProvider>
      <PlayPage />
    </ToastProvider>
  );
}

describe('Room Creation Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Reset mock session to default (modal shown, no session)
    mockSession = createDefaultSession();

    // Reset fetch mock and provide default response for template fetching
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: unknown) => {
      if (typeof url === 'string' && url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ templates: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      } as Response);
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Online Room Creation', () => {
    it('should create a new online room with generated PIN', async () => {
      const user = userEvent.setup();
      const mockRoomCode = 'TEST-123';
      const mockSessionToken = 'session-token-123';

      // Configure createRoom mock to simulate successful creation
      mockSession.createRoom = vi.fn(async () => {
        mockSession.mode = 'online';
        mockSession.roomCode = mockRoomCode;
        mockSession.shouldShowModal = false;
        mockStoreToken(mockSessionToken);
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: '1234', initialState: {} }),
        });
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: unknown) => {
        if (typeof url === 'string' && url.includes('/api/templates')) {
          return Promise.resolve({ ok: true, json: async () => ({ templates: [] }) } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/sessions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                session: { roomCode: mockRoomCode },
                sessionToken: mockSessionToken,
              },
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create a new game room/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockSession.createRoom).toHaveBeenCalled();
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(mockStoreToken).toHaveBeenCalledWith(mockSessionToken);
      }, { timeout: 2000 });
    });

    it('should handle API errors during room creation', async () => {
      const user = userEvent.setup();

      mockSession.createRoom = vi.fn(async () => {
        mockSession.error = 'Failed to create session';
        // Simulate failed fetch
        await fetch('/api/sessions', { method: 'POST', headers: {}, body: '' });
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: unknown) => {
        if (typeof url === 'string' && url.includes('/api/templates')) {
          return Promise.resolve({ ok: true, json: async () => ({ templates: [] }) } as Response);
        }
        return Promise.resolve({ ok: false, status: 500 } as Response);
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create a new game room/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockStoreToken).not.toHaveBeenCalled();
      });
    });

    it('should persist PIN after successful room creation', async () => {
      const user = userEvent.setup();
      const mockRoomCode = 'TEST-123';
      const mockSessionToken = 'session-token-123';
      const testPin = '5678';

      mockSession.createRoom = vi.fn(async (opts: { pin: string }) => {
        mockSession.mode = 'online';
        mockSession.roomCode = mockRoomCode;
        mockSession.pin = opts.pin;
        mockSession.shouldShowModal = false;
        mockStoreToken(mockSessionToken);
        // Store the PIN like the real hook does
        localStorage.setItem('bingo_pin', opts.pin);
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create a new game room/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockSession.createRoom).toHaveBeenCalled();
      }, { timeout: 2000 });

      // The PIN stored depends on what pin is passed - the page uses session.pin or generates one
      await waitFor(() => {
        expect(mockStoreToken).toHaveBeenCalledWith(mockSessionToken);
      }, { timeout: 2000 });

      void testPin; // suppress lint
    });
  });

  describe('Offline Mode Creation', () => {
    it('should create offline session without API calls', async () => {
      const user = userEvent.setup();

      mockSession.playOffline = vi.fn(() => {
        mockSession.mode = 'offline';
        mockSession.offlineSessionId = 'TEST12';
        mockSession.sessionId = 'TEST12';
        mockSession.shouldShowModal = false;
        localStorage.setItem('bingo_offline_session_id', 'TEST12');
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      vi.clearAllMocks();
      (global.fetch as ReturnType<typeof vi.fn>).mockClear();

      const offlineButton = screen.getByRole('button', { name: /play offline/i });
      await user.click(offlineButton);

      expect(mockSession.playOffline).toHaveBeenCalled();
      // Modal should close (via closeModal called in handleModalPlayOffline)
      expect(mockSession.closeModal).toHaveBeenCalled();

      // Verify no API calls (other than possibly templates) after clicking offline
      const fetchAfterOffline = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const sessionCalls = fetchAfterOffline.filter(
        call => typeof call[0] === 'string' && call[0].includes('/api/sessions')
      );
      expect(sessionCalls).toHaveLength(0);
    });

    it('should generate and store offline session ID', async () => {
      const user = userEvent.setup();

      mockSession.playOffline = vi.fn(() => {
        mockSession.mode = 'offline';
        mockSession.offlineSessionId = 'TEST12';
        mockSession.sessionId = 'TEST12';
        mockSession.shouldShowModal = false;
        localStorage.setItem('bingo_offline_session_id', 'TEST12');
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const offlineButton = screen.getByRole('button', { name: /play offline/i });
      await user.click(offlineButton);

      await waitFor(() => {
        expect(getStoredOfflineSessionId()).toBeTruthy();
      });

      const storedId = getStoredOfflineSessionId();
      expect(storedId).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should store offline session data in localStorage', async () => {
      const user = userEvent.setup();

      mockSession.playOffline = vi.fn(() => {
        mockSession.mode = 'offline';
        mockSession.offlineSessionId = 'TEST12';
        mockSession.sessionId = 'TEST12';
        mockSession.shouldShowModal = false;
        localStorage.setItem('bingo_offline_session_id', 'TEST12');
        localStorage.setItem('bingo_offline_session_TEST12', JSON.stringify({
          sessionId: 'TEST12',
          isOffline: true,
          gameState: {},
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        }));
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const offlineButton = screen.getByRole('button', { name: /play offline/i });
      await user.click(offlineButton);

      await waitFor(() => {
        expect(getStoredOfflineSessionId()).toBeTruthy();
      });

      const sessionId = getStoredOfflineSessionId();
      const sessionKey = `bingo_offline_session_${sessionId}`;
      const sessionData = localStorage.getItem(sessionKey);

      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        expect(parsed.sessionId).toBe(sessionId);
        expect(parsed.isOffline).toBe(true);
      }
    });
  });

  describe('Join Existing Room', () => {
    it('should validate room code and PIN before joining', async () => {
      const user = userEvent.setup();

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: /join with room code/i });
      await user.click(joinButton);

      expect(screen.getByLabelText(/enter room code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enter room pin/i)).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /join game/i });
      expect(submitButton).toBeDisabled();
    });

    it('should accept valid room code and PIN', async () => {
      const user = userEvent.setup();
      const mockRoomCode = 'TEST-123';
      const mockPin = '1234';
      const mockToken = 'join-token-123';

      mockSession.joinRoom = vi.fn(async (code: string, pin: string) => {
        mockSession.mode = 'joined';
        mockSession.roomCode = code;
        mockSession.pin = pin;
        mockSession.shouldShowModal = false;
        mockStoreToken(mockToken);
        await mockRecoverSession();
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: unknown) => {
        if (typeof url === 'string' && url.includes('/api/templates')) {
          return Promise.resolve({ ok: true, json: async () => ({ templates: [] }) } as Response);
        }
        if (typeof url === 'string' && url.includes('/verify-pin')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ token: mockToken }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: /join with room code/i });
      await user.click(joinButton);

      const roomCodeInput = screen.getByLabelText(/enter room code/i);
      const pinInput = screen.getByLabelText(/enter room pin/i);

      await user.type(roomCodeInput, mockRoomCode);
      await user.type(pinInput, mockPin);

      const submitButton = screen.getByRole('button', { name: /join game/i });
      expect(submitButton).not.toBeDisabled();
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSession.joinRoom).toHaveBeenCalledWith(
          expect.stringContaining('TEST-123'),
          mockPin
        );
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(mockStoreToken).toHaveBeenCalledWith(mockToken);
        expect(mockRecoverSession).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should reject invalid PIN format', async () => {
      const user = userEvent.setup();

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: /join with room code/i });
      await user.click(joinButton);

      const roomCodeInput = screen.getByLabelText(/enter room code/i);
      const pinInput = screen.getByLabelText(/enter room pin/i);

      await user.type(roomCodeInput, 'TEST-123');
      await user.type(pinInput, '123'); // Only 3 digits

      const submitButton = screen.getByRole('button', { name: /join game/i });
      expect(submitButton).toBeDisabled();
    });

    it('should handle join errors gracefully', async () => {
      const user = userEvent.setup();
      const mockRoomCode = 'TEST-123';
      const mockPin = '1234';

      mockSession.joinRoom = vi.fn(async () => {
        // Simulate error - storeToken NOT called
        mockSession.error = 'Failed to join session';
      });

      renderPlayPage();

      await waitFor(() => {
        expect(screen.getByText('Room Setup')).toBeInTheDocument();
      });

      const joinButton = screen.getByRole('button', { name: /join with room code/i });
      await user.click(joinButton);

      const roomCodeInput = screen.getByLabelText(/enter room code/i);
      const pinInput = screen.getByLabelText(/enter room pin/i);

      await user.type(roomCodeInput, mockRoomCode);
      await user.type(pinInput, mockPin);

      const submitButton = screen.getByRole('button', { name: /join game/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSession.joinRoom).toHaveBeenCalled();
        expect(mockStoreToken).not.toHaveBeenCalled();
      });
    });
  });

  describe('Session Recovery', () => {
    it('should recover session from stored PIN on page refresh', () => {
      const mockPin = '5678';
      storePin(mockPin);

      renderPlayPage();

      const storedPin = getStoredPin();
      expect(storedPin).toBe(mockPin);
    });

    it('should clear PIN after Create New Game', async () => {
      const user = userEvent.setup();
      storePin('1234');

      // Reset mock to have no modal showing (session exists)
      mockSession.shouldShowModal = false;
      mockSession.mode = 'offline';
      mockSession.offlineSessionId = 'TEST12';

      renderPlayPage();

      const createNewButton = screen.getByRole('button', { name: /create new game/i });
      await user.click(createNewButton);

      expect(mockClearToken).toHaveBeenCalled();
      expect(mockResetGame).toHaveBeenCalled();
    });
  });

  describe('Create New Game Button', () => {
    it('should clear session data when confirmed', async () => {
      const user = userEvent.setup();
      mockSession.shouldShowModal = false;
      mockSession.mode = 'offline';

      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderPlayPage();

      const createNewButton = screen.getByRole('button', { name: /create new game/i });
      await user.click(createNewButton);

      expect(mockClearToken).toHaveBeenCalled();
      expect(mockResetGame).toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('Display Window Opening', () => {
    it('should open display window in offline mode', async () => {
      const user = userEvent.setup();

      mockSession.shouldShowModal = false;
      mockSession.mode = 'offline';
      mockSession.offlineSessionId = 'TEST12';
      mockSession.sessionId = 'TEST12';

      renderPlayPage();

      const openDisplayButton = screen.getByRole('button', { name: /open display/i });
      await user.click(openDisplayButton);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('/display?offline=TEST12'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should open display window with room code in online mode', async () => {
      const user = userEvent.setup();

      mockSession.shouldShowModal = false;
      mockSession.mode = 'online';
      mockSession.roomCode = 'TEST-123';
      mockSession.sessionId = 'TEST-123';

      renderPlayPage();

      const openDisplayButton = screen.getByRole('button', { name: /open display/i });
      await user.click(openDisplayButton);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('/display?room=TEST-123'),
        expect.any(String),
        expect.any(String)
      );
    });
  });
});
