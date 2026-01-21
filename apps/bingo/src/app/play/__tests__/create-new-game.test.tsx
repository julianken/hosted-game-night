import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlayPage from '../page';

// Create mock functions to be shared across tests
const mockClearToken = vi.fn();
const mockResetGame = vi.fn();
const mockConfirm = vi.fn(() => true);

// Create a mutable status variable for dynamic mock behavior
let mockGameStatus: 'idle' | 'playing' | 'paused' | 'ended' = 'idle';

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

vi.mock('@beak-gaming/sync', () => ({
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

vi.mock('@beak-gaming/ui', () => ({
  Slider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CreateGameModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div role="dialog" onClick={onClose}>Create Game Modal</div> : null,
  JoinGameModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div role="dialog" onClick={onClose}>Join Game Modal</div> : null,
  RoomCodeDisplay: ({ roomCode }: { roomCode: string }) => <div>Room: {roomCode}</div>,
}));

vi.mock('@/components/pwa', () => ({
  InstallPrompt: () => null,
  OfflineBanner: () => null,
}));

describe('PlayPage - Create New Game Button', () => {
  beforeEach(() => {
    // Set game status to idle for this test suite
    mockGameStatus = 'idle';

    // Reset all mocks before each test
    vi.clearAllMocks();
    mockClearToken.mockClear();
    mockResetGame.mockClear();
    mockConfirm.mockReturnValue(true);

    // Mock window.confirm
    global.confirm = mockConfirm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Create New Game button', () => {
    render(<PlayPage />);
    const button = screen.getByRole('button', { name: /create new game/i });
    expect(button).toBeInTheDocument();
  });

  it('button has proper accessibility and styling', () => {
    render(<PlayPage />);
    const button = screen.getByRole('button', { name: /create new game/i });

    // Check button is properly labeled
    expect(button).toHaveAccessibleName('Create New Game');

    // Check button has secondary variant style
    expect(button.className).toContain('bg-secondary');

    // Check button has medium size (min 56px height for touch targets)
    expect(button.className).toContain('min-h-[56px]');

    // Check button has shadow for visibility
    expect(button.className).toContain('shadow-lg');
  });

  it('clicking button clears session token', async () => {
    render(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockClearToken).toHaveBeenCalledTimes(1);
    });
  });

  it('clicking button resets game state', async () => {
    render(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockResetGame).toHaveBeenCalledTimes(1);
    });
  });

  it('clicking button shows create modal', async () => {
    render(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    // Modal should appear after clicking
    await waitFor(() => {
      // The CreateGameModal component should be rendered
      // We check for the modal heading or form
      const modalElement = screen.getByRole('dialog', { hidden: false });
      expect(modalElement).toBeInTheDocument();
    });
  });

  it('does not show confirmation in idle state', () => {
    render(<PlayPage />);

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
    mockConfirm.mockReturnValue(true);
    global.confirm = mockConfirm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('button is still visible during active game', () => {
    render(<PlayPage />);
    const button = screen.getByRole('button', { name: /create new game/i });
    expect(button).toBeInTheDocument();
  });

  it('does not clear session or reset game when user cancels confirmation', () => {
    mockConfirm.mockReturnValue(false); // User clicks "Cancel"

    render(<PlayPage />);
    const createButton = screen.getByRole('button', { name: /create new game/i });
    fireEvent.click(createButton);

    // Should show confirmation
    expect(mockConfirm).toHaveBeenCalledWith(
      'This will end the current game and create a new one. Are you sure?'
    );

    // Should NOT clear token or reset game
    expect(mockClearToken).not.toHaveBeenCalled();
    expect(mockResetGame).not.toHaveBeenCalled();

    // Note: Modal state is controlled by shouldShowModal which includes recovery logic,
    // so we don't test modal visibility here - that's covered by modal timing tests
  });
});
