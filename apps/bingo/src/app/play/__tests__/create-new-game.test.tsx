import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayPage from '../page';
import { ToastProvider } from "@joolie-boolie/ui";

// Create mock functions to be shared across tests
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
    isProcessing: false,
    showResetConfirm: false,
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
    requestReset: vi.fn(),
    confirmReset: vi.fn(),
    cancelReset: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-sync', () => ({
  useSync: () => ({ isConnected: true }),
}));

vi.mock('@/hooks/use-audio', () => ({
  useAudioPreload: () => ({ preloadProgress: 100 }),
  useAudio: () => ({
    voicePack: 'standard',
    setVoicePack: vi.fn(),
    voiceVolume: 1,
    setVoiceVolume: vi.fn(),
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

vi.mock('@/lib/sync/session', () => ({
  generateSessionId: () => 'test-session-id',
}));

vi.mock('@joolie-boolie/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    InstallPrompt: () => null,
  };
});

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
    mockResetGame.mockClear();
    mockConfirm.mockReturnValue(true);

    // Mock window.confirm
    global.confirm = mockConfirm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Create New Game button', () => {
    renderWithProviders(<PlayPage />);
    const button = screen.getByRole('button', { name: /new game/i });
    expect(button).toBeInTheDocument();
  });

  it('button has proper accessibility and styling', () => {
    renderWithProviders(<PlayPage />);
    const button = screen.getByRole('button', { name: /new game/i });

    // Check button is properly labeled
    expect(button).toHaveAccessibleName('New Game');

    // Check button has secondary variant style
    expect(button.className).toContain('bg-secondary');

    // Check button has shadow for visibility
    expect(button.className).toContain('shadow-lg');
  });

  it('clicking button resets game state', () => {
    renderWithProviders(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /new game/i });
    fireEvent.click(createButton);

    expect(mockResetGame).toHaveBeenCalledTimes(1);
  });

  it('does not show confirmation in idle state', () => {
    renderWithProviders(<PlayPage />);

    const createButton = screen.getByRole('button', { name: /new game/i });
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
    mockResetGame.mockClear();
    mockConfirm.mockReturnValue(true);

    global.confirm = mockConfirm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('button is still visible during active game', () => {
    renderWithProviders(<PlayPage />);
    const button = screen.getByRole('button', { name: /new game/i });
    expect(button).toBeInTheDocument();
  });

  it('does not reset game when user cancels confirmation', () => {
    mockConfirm.mockReturnValue(false); // User clicks "Cancel"

    renderWithProviders(<PlayPage />);
    const createButton = screen.getByRole('button', { name: /new game/i });
    fireEvent.click(createButton);

    // Should show confirmation
    expect(mockConfirm).toHaveBeenCalledWith(
      'This will end the current game and create a new one. Are you sure?'
    );

    // Should NOT reset game
    expect(mockResetGame).not.toHaveBeenCalled();
  });
});
