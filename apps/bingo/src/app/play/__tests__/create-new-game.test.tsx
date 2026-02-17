import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlayPage from '../page';
import { ToastProvider } from "@joolie-boolie/ui";

// Create mock functions to be shared across tests
const mockClearToken = vi.fn();
const mockResetGame = vi.fn();
const mockConfirm = vi.fn(() => true);

// Create a mutable status variable for dynamic mock behavior
let mockGameStatus: 'idle' | 'playing' | 'paused' | 'ended' = 'idle';

// Mutable session state for dynamic mock behavior
let mockSessionState = {
  mode: 'offline' as 'setup' | 'online' | 'offline' | 'joined',
  roomCode: null as string | null,
  offlineSessionId: 'TEST12' as string | null,
  sessionId: 'TEST12',
  pin: null as string | null,
  isLoading: false,
  error: null as string | null,
  isRecovering: false,
  isRecovered: false,
  shouldShowModal: false,
};

const mockResetSession = vi.fn((opts?: { showModal?: boolean }) => {
  mockClearToken();
  if (opts?.showModal !== false) {
    mockSessionState.shouldShowModal = true;
  }
});

const mockCloseModal = vi.fn(() => {
  mockSessionState.shouldShowModal = false;
});

// Mock dependencies
vi.mock('@/hooks/use-game', () => ({
  useGameKeyboard: () => ({
    status: mockGameStatus,
    currentBall: null,
    previousBall: null,
    ballsCalled: 0,
    ballsRemaining: 75,
    calledBalls: [],
    recentBalls: [],
    pattern: {
      id: 'any-line',
      name: 'Any Line',
      description: 'Any row, column, or diagonal',
      cells: [],
    },
    canCall: false,
    canStart: true,
    canPause: false,
    canResume: false,
    canUndo: false,
    autoCallEnabled: false,
    autoCallSpeed: 10,
    audioEnabled: true,
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
  useSync: () => ({ isConnected: true }),
}));

vi.mock('@joolie-boolie/sync', () => ({
  useSessionRecovery: () => ({
    isRecovering: false,
    isRecovered: false,
    error: null,
    roomCode: null,
    requiresPin: false,
    recover: vi.fn(),
    clearToken: mockClearToken,
    storeToken: vi.fn(),
  }),
  useAutoSync: () => ({
    isSyncing: false,
    lastSyncTime: null,
  }),
  usePresenterSession: () => ({
    ...mockSessionState,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    playOffline: vi.fn(),
    resetSession: mockResetSession,
    openModal: vi.fn(),
    closeModal: mockCloseModal,
    storeToken: vi.fn(),
    clearToken: mockClearToken,
    recover: vi.fn(),
  }),
  generateSecurePin: () => '1234',
  generateShortSessionId: () => 'TEST12',
}));

vi.mock('@/hooks/use-audio', () => ({
  useAudioPreload: () => ({ preloadProgress: 100 }),
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
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ],
}));

vi.mock('@/stores/game-store', () => ({
  useGameStore: () => ({
    status: mockGameStatus,
    calledBalls: [],
    pattern: {
      id: 'any-line',
      name: 'Any Line',
      description: 'Any row, column, or diagonal',
      cells: [],
    },
    autoCallEnabled: false,
    autoCallSpeed: 10,
    audioEnabled: true,
  }),
}));

vi.mock('@/lib/session/serializer', () => ({
  serializeBingoState: (state: unknown) => state,
  deserializeBingoState: (state: unknown) => state,
}));

vi.mock('@/lib/sync/session', () => ({
  generateSessionId: () => 'test-session-id',
}));

vi.mock('@/components/pwa', () => ({
  InstallPrompt: () => null,
  OfflineBanner: () => null,
}));

// Helper to render PlayPage with required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('PlayPage - Create New Game Button', () => {
  beforeEach(() => {
    // Set game status to idle for this test suite
    mockGameStatus = 'idle';

    // Reset all mocks before each test
    vi.clearAllMocks();
    mockClearToken.mockClear();
    mockResetGame.mockClear();
    mockResetSession.mockClear();
    mockCloseModal.mockClear();
    mockConfirm.mockReturnValue(true);

    // Reset session state
    mockSessionState = {
      mode: 'offline',
      roomCode: null,
      offlineSessionId: 'TEST12',
      sessionId: 'TEST12',
      pin: null,
      isLoading: false,
      error: null,
      isRecovering: false,
      isRecovered: false,
      shouldShowModal: false,
    };

    // Mock window.confirm
    global.confirm = mockConfirm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Create New Game button', () => {
    renderWithProviders(<PlayPage />);
    const button = screen.getByRole('button', { name: /create new game/i });
    expect(button).toBeInTheDocument();
  });

  it('button has proper accessibility and styling', () => {
    renderWithProviders(<PlayPage />);
    const button = screen.getByRole('button', { name: /create new game/i });

    // Check button is properly labeled
    expect(button).toHaveAccessibleName('Create New Game');

    // Check button has secondary variant style
    expect(button.className).toContain('bg-secondary');

    // Check button has shadow for visibility
    expect(button.className).toContain('shadow-lg');
  });

  it('clicking button clears session token', async () => {
    renderWithProviders(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockClearToken).toHaveBeenCalledTimes(1);
    });
  });

  it('clicking button resets game state', async () => {
    renderWithProviders(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockResetGame).toHaveBeenCalledTimes(1);
    });
  });

  it('clicking button calls resetSession with showModal', async () => {
    renderWithProviders(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockResetSession).toHaveBeenCalledWith({ showModal: true });
    });
  });

  it('does not show confirmation in idle state', () => {
    renderWithProviders(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    // Should not show confirmation dialog
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});

describe('PlayPage - Create New Game with Active Game', () => {
  beforeEach(() => {
    // Set game status to playing for this test suite
    mockGameStatus = 'playing';

    vi.clearAllMocks();
    mockClearToken.mockClear();
    mockResetGame.mockClear();
    mockResetSession.mockClear();
    mockConfirm.mockReturnValue(true);

    // Reset session state
    mockSessionState = {
      mode: 'offline',
      roomCode: null,
      offlineSessionId: 'TEST12',
      sessionId: 'TEST12',
      pin: null,
      isLoading: false,
      error: null,
      isRecovering: false,
      isRecovered: false,
      shouldShowModal: false,
    };

    global.confirm = mockConfirm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('button is still visible during active game', () => {
    renderWithProviders(<PlayPage />);
    const button = screen.getByRole('button', { name: /create new game/i });
    expect(button).toBeInTheDocument();
  });

  it('does not clear session or reset game when user cancels confirmation', () => {
    mockConfirm.mockReturnValue(false); // User clicks "Cancel"

    renderWithProviders(<PlayPage />);
    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    // Should show confirmation
    expect(mockConfirm).toHaveBeenCalledWith(
      'This will end the current game and create a new one. Are you sure?'
    );

    // Should NOT clear token or reset game
    expect(mockClearToken).not.toHaveBeenCalled();
    expect(mockResetGame).not.toHaveBeenCalled();
  });
});
