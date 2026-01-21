'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useGameKeyboard } from '@/hooks/use-game';
import { useSync } from '@/hooks/use-sync';
import { useSessionRecovery, useAutoSync } from '@beak-gaming/sync';
import {
  generateSecurePin,
  generateShortSessionId,
  getStoredPin,
  storePin,
  clearStoredPin,
  getStoredOfflineSessionId,
  storeOfflineSessionId,
  clearStoredOfflineSessionId as _clearStoredOfflineSessionId,
} from '@/lib/session/secure-generation';
import { BallDisplay, RecentBalls, BallCounter } from '@/components/presenter/BallDisplay';
import { BingoBoard } from '@/components/presenter/BingoBoard';
import { PatternSelector, PatternPreview } from '@/components/presenter/PatternSelector';
import { ControlPanel } from '@/components/presenter/ControlPanel';
import { Toggle } from '@/components/ui/Toggle';
import { Slider, RoomCodeDisplay } from '@beak-gaming/ui';
import { RoomSetupModal } from '@/components/presenter/RoomSetupModal';
import { Button } from '@/components/ui/Button';
import { VoiceSelector } from '@/components/ui/VoiceSelector';
import { RollSoundSelector } from '@/components/presenter/RollSoundSelector';
import { RevealChimeSelector } from '@/components/presenter/RevealChimeSelector';
import { ThemeSelector } from '@/components/presenter/ThemeSelector';
import { PinDisplay } from '@/components/presenter/PinDisplay';
import { useAudioPreload, useAudio } from '@/hooks/use-audio';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import { OfflineBanner, InstallPrompt } from '@/components/pwa';
import { serializeBingoState, deserializeBingoState } from '@/lib/session/serializer';
import { useGameStore } from '@/stores/game-store';

export default function PlayPage() {
  const game = useGameKeyboard();

  // Session state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Recovery state tracking
  const [hasRecoveryStarted, setHasRecoveryStarted] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [recoveryErrorMessage, setRecoveryErrorMessage] = useState<string | null>(null);
  const [dismissedRecoveryError, setDismissedRecoveryError] = useState(false);

  // Offline mode state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineSessionId, setOfflineSessionId] = useState<string | null>(null);

  // PIN state
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const pinGeneratedRef = useRef(false);

  // Session ID calculation: prioritize Supabase session, fallback to offline session
  const sessionId = roomCode || offlineSessionId || '';

  // Initialize offline session ID from localStorage or generate new one
  useEffect(() => {
    try {
      const storedOfflineId = getStoredOfflineSessionId();
      if (storedOfflineId) {
        setOfflineSessionId(storedOfflineId);
      } else {
        // Generate new offline session ID and store it
        const newOfflineId = generateShortSessionId();
        storeOfflineSessionId(newOfflineId);
        setOfflineSessionId(newOfflineId);
      }
    } catch (error) {
      console.error('Failed to initialize offline session ID:', error);
      // If localStorage is unavailable, use an in-memory session ID
      const fallbackId = generateShortSessionId();
      setOfflineSessionId(fallbackId);
    }
  }, []);

  // Load stored PIN on mount
  useEffect(() => {
    const stored = getStoredPin();
    if (stored) {
      setCurrentPin(stored);
    }
  }, []);

  // Initialize sync as presenter role with session-scoped channel
  const { isConnected } = useSync({ role: 'presenter', sessionId });

  // Audio preloading and controls
  const { preloadProgress } = useAudioPreload();
  const { voicePack, setVoicePack } = useAudio();

  // Apply presenter theme
  const presenterTheme = useThemeStore((state) => state.presenterTheme);
  useApplyTheme(presenterTheme);

  // Session recovery on mount (skip in offline mode)
  const {
    isRecovering,
    isRecovered,
    error: recoveryError,
    roomCode: recoveredRoomCode,
    recover,
    clearToken,
    storeToken
  } = useSessionRecovery({
    gameType: 'bingo',
    fetchGameState: async (roomCode: string, token: string) => {
      const response = await fetch(`/api/sessions/${roomCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw response;
      const data = await response.json();
      return data.gameState;
    },
    hydrateStore: (state: unknown) => {
      const partialState = deserializeBingoState(state);
      useGameStore.setState(partialState);
    },
    enabled: !isOfflineMode,
  });

  // Track when recovery starts
  useEffect(() => {
    if (isRecovering) {
      setHasRecoveryStarted(true);
    }
  }, [isRecovering]);

  // Track when recovery completes and capture errors
  useEffect(() => {
    if (hasRecoveryStarted && !isRecovering) {
      setRecoveryAttempted(true);

      // Capture recovery error if present
      if (recoveryError) {
        setRecoveryErrorMessage(
          typeof recoveryError === 'string'
            ? recoveryError
            : (recoveryError as Error).message || 'Failed to recover session'
        );
      } else {
        setRecoveryErrorMessage(null);
      }
    }
  }, [hasRecoveryStarted, isRecovering, recoveryError]);

  // Sync recovered room code to local state
  useEffect(() => {
    if (isRecovered && recoveredRoomCode) {
      setRoomCode(recoveredRoomCode);
    }
  }, [isRecovered, recoveredRoomCode]);

  // Determine if modal should be shown
  // Show modal if:
  // 1. Explicitly requested via showCreateModal state
  // 2. No active session (roomCode or offline mode) after recovery completes
  // 3. Recovery failed with an error that hasn't been dismissed
  const shouldShowModal =
    showCreateModal ||
    (!roomCode && !isOfflineMode && recoveryAttempted) ||
    (recoveryErrorMessage !== null && !dismissedRecoveryError);

  // Auto-sync game state to database (only in online mode)
  const gameState = useGameStore();
  const { isSyncing: _isSyncing, lastSyncTime: _lastSyncTime } = useAutoSync(
    gameState,
    async (state) => {
      // Skip API calls in offline mode
      if (isOfflineMode || !roomCode || !sessionToken) return;
      const serialized = serializeBingoState(state);
      const response = await fetch(`/api/sessions/${roomCode}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, state: serialized }),
      });
      if (!response.ok) throw new Error('Failed to sync state');
    },
    {
      debounceMs: 2000,
      enabled: !isOfflineMode && !!roomCode && !!sessionToken,
      isCriticalChange: (prev, next) => {
        if (prev?.calledBalls?.length !== next?.calledBalls?.length) {
          return 'BALL_CALLED';
        }
        if (prev?.pattern?.id !== next?.pattern?.id) {
          return 'PATTERN_CHANGED';
        }
        if (prev?.status !== next?.status) {
          return 'STATUS_CHANGED';
        }
        return null;
      },
    }
  );

  // Offline session recovery on mount
  useEffect(() => {
    // Try to recover offline session from localStorage
    const recoverOfflineSession = () => {
      try {
        // Check all offline session keys
        const keys = Object.keys(localStorage).filter(key =>
          key.startsWith('bingo_offline_session_')
        );

        if (keys.length > 0) {
          // Get the most recent session (last in array)
          const lastKey = keys[keys.length - 1];
          const sessionId = lastKey.replace('bingo_offline_session_', '');

          // Validate session ID format (6 uppercase alphanumeric characters)
          if (typeof sessionId === 'string' && /^[A-Z0-9]{6}$/.test(sessionId)) {
            const stored = localStorage.getItem(lastKey);
            if (stored) {
              const data = JSON.parse(stored);
              if (data.isOffline && data.sessionId === sessionId) {
                setOfflineSessionId(sessionId);
                setIsOfflineMode(true);
                // Hydrate game state if available
                if (data.gameState) {
                  const partialState = deserializeBingoState(data.gameState);
                  useGameStore.setState(partialState);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to recover offline session:', error);
      }
    };

    recoverOfflineSession();
  }, []);

  // Save offline session state to localStorage
  useEffect(() => {
    if (isOfflineMode && offlineSessionId) {
      try {
        const sessionKey = `bingo_offline_session_${offlineSessionId}`;
        const sessionData = {
          sessionId: offlineSessionId,
          isOffline: true,
          gameState: serializeBingoState(gameState),
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      } catch (error) {
        console.error('Failed to save offline session:', error);
      }
    }
  }, [isOfflineMode, offlineSessionId, gameState]);

  // Generate or retrieve PIN when modal opens
  useEffect(() => {
    if (showCreateModal && !pinGeneratedRef.current) {
      // Check if we have a stored PIN first
      let pin = currentPin;

      if (!pin) {
        // No PIN in state, try to load from storage
        pin = getStoredPin();
      }

      if (!pin) {
        // Generate new PIN if none exists
        pin = generateSecurePin();
        pinGeneratedRef.current = true;
      }

      // Store the PIN
      setCurrentPin(pin);
      storePin(pin);
    }
  }, [showCreateModal, currentPin]);

  // Reset PIN generation flag when modal closes
  useEffect(() => {
    if (!showCreateModal) {
      pinGeneratedRef.current = false;
    }
  }, [showCreateModal]);

  // Session handlers
  const handlePlayOffline = useCallback(() => {
    const newSessionId = generateShortSessionId();
    setOfflineSessionId(newSessionId);
    setIsOfflineMode(true);
    setRoomCode(null);
    setSessionToken(null);

    // Initialize offline session in localStorage
    try {
      const sessionKey = `bingo_offline_session_${newSessionId}`;
      const sessionData = {
        sessionId: newSessionId,
        isOffline: true,
        gameState: serializeBingoState(gameState),
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to create offline session:', error);
    }
  }, [gameState]);

  const handleCreateSession = useCallback(async (pin: string) => {
    setIsCreatingSession(true);
    setSessionError(null);
    try {
      const initialState = serializeBingoState(gameState);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, initialState }),
      });
      if (!response.ok) throw new Error('Failed to create session');
      const data = await response.json();
      setRoomCode(data.data.session.roomCode);
      setSessionToken(data.data.sessionToken);
      storeToken(data.data.sessionToken);
      // Store the PIN for session recovery
      storePin(pin);
      setShowCreateModal(false);
      // Clear offline mode
      setIsOfflineMode(false);
      setOfflineSessionId(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Failed to create session');
      // Clear stored PIN on error so user can try with a new PIN
      clearStoredPin();
      setCurrentPin(null);
      pinGeneratedRef.current = false;
    } finally {
      setIsCreatingSession(false);
    }
  }, [gameState, storeToken]);

  const handleJoinSession = useCallback(async (roomCode: string, pin: string) => {
    setIsCreatingSession(true);
    setSessionError(null);
    try {
      const response = await fetch(`/api/sessions/${roomCode}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) throw new Error('Invalid PIN');
      const data = await response.json();
      setRoomCode(roomCode);
      setSessionToken(data.token);
      storeToken(data.token);
      // Store the PIN for session recovery
      storePin(pin);
      setCurrentPin(pin);
      setShowCreateModal(false);
      // Trigger recovery to load game state
      await recover();
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Failed to join session');
    } finally {
      setIsCreatingSession(false);
    }
  }, [recover, storeToken]);

  // Create new game handler - clears all session data and shows room setup modal
  const handleCreateNewGame = useCallback(() => {
    // Show confirmation if game is active
    if (game.status !== 'idle' && game.status !== 'ended') {
      const confirmed = window.confirm(
        'This will end the current game and create a new one. Are you sure?'
      );
      if (!confirmed) {
        return;
      }
    }

    // Clear all session data
    // clearToken() removes persisted token from localStorage (prevents recovery on refresh)
    // Local state must be cleared separately for immediate effect in current session
    clearToken();
    setRoomCode(null);
    setSessionToken(null);

    // Reset game state to initial
    game.resetGame();

    // Show modal for new room setup
    setShowCreateModal(true);
  }, [game, clearToken]);

  // Room Setup Modal handlers
  const handleModalCreateRoom = useCallback(() => {
    // Use the current PIN or generate a new one
    const pin = currentPin || generateSecurePin();
    if (!currentPin) {
      setCurrentPin(pin);
      storePin(pin);
    }
    handleCreateSession(pin);
  }, [currentPin, handleCreateSession]);

  const handleModalJoinRoom = useCallback((roomCode: string, pin: string) => {
    handleJoinSession(roomCode, pin);
  }, [handleJoinSession]);

  const handleModalPlayOffline = useCallback(() => {
    handlePlayOffline();
    setShowCreateModal(false);
  }, [handlePlayOffline]);

  // Open display window with room code or offline session ID in URL
  const openDisplay = useCallback(() => {
    if (isOfflineMode && offlineSessionId) {
      // Offline mode: use session ID
      const displayUrl = `${window.location.origin}/display?offline=${offlineSessionId}`;
      const displayWindow = window.open(
        displayUrl,
        `bingo-display-offline-${offlineSessionId}`,
        'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      );
      if (displayWindow) {
        displayWindow.focus();
      }
    } else if (roomCode) {
      // Online mode: use room code
      const displayUrl = `${window.location.origin}/display?room=${roomCode}`;
      const displayWindow = window.open(
        displayUrl,
        `bingo-display-${roomCode}`,
        'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      );
      if (displayWindow) {
        displayWindow.focus();
      }
    } else {
      // No session: show create modal
      setShowCreateModal(true);
    }
  }, [roomCode, isOfflineMode, offlineSessionId]);

  return (
    <>
      <OfflineBanner />
      <main className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Beak Bingo
            </h1>
            <p className="text-lg text-muted-foreground">Presenter View</p>
          </div>

          {/* Display controls */}
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-3 h-3 rounded-full
                  ${isConnected ? 'bg-success' : 'bg-muted'}
                `}
                title={isConnected ? 'Sync active' : 'Sync not active'}
              />
              <span className="text-base text-muted-foreground hidden sm:block">
                {isConnected ? 'Sync Active' : 'Sync Ready'}
              </span>
            </div>

            {/* Play Offline button - only show if no session active */}
            {!roomCode && !isOfflineMode && (
              <Button
                onClick={handlePlayOffline}
                variant="secondary"
                size="md"
              >
                Play Offline
              </Button>
            )}

            {/* Open Display button */}
            <Button
              onClick={openDisplay}
              variant="secondary"
              size="md"
            >
              Open Display
            </Button>
          </div>
        </header>

        {/* Main content grid - Mobile first: stack vertically, then 2 cols on tablet, 3 cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Center column on mobile (moved up for better UX): Current Ball + Controls */}
          <section className="md:col-span-2 lg:col-span-4 lg:order-2 space-y-4 md:space-y-6">
            {/* Current Ball Display */}
            <div className="bg-background border border-border rounded-xl p-4 md:p-6 shadow-sm flex flex-col items-center gap-3 md:gap-4">
              <h2 className="text-lg md:text-xl font-semibold">Current Ball</h2>
              <BallDisplay ball={game.currentBall} size="xl" />
              {game.previousBall && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm md:text-base">Previous:</span>
                  <BallDisplay ball={game.previousBall} size="sm" />
                </div>
              )}
              <BallCounter
                called={game.ballsCalled}
                remaining={game.ballsRemaining}
              />
            </div>

            {/* Control Panel */}
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
              <ControlPanel
                status={game.status}
                canCall={game.canCall}
                canStart={game.canStart}
                canPause={game.canPause}
                canResume={game.canResume}
                canUndo={game.canUndo}
                onStart={() => game.startGame(game.pattern ?? undefined)}
                onCallBall={game.callBall}
                onPause={game.pauseGame}
                onResume={game.resumeGame}
                onReset={game.resetGame}
                onUndo={game.undoCall}
              />
            </div>
          </section>

          {/* Left column: Bingo Board - hidden on small mobile, shown on larger screens */}
          <section className="hidden sm:block md:col-span-1 lg:col-span-4 lg:order-1 space-y-4 md:space-y-6">
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Called Numbers</h2>
              <BingoBoard calledBalls={game.calledBalls} />
            </div>

            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
              <RecentBalls balls={game.recentBalls} />
            </div>
          </section>

          {/* Mobile-only recent balls (shown when board is hidden) */}
          <section className="sm:hidden space-y-4">
            <div className="bg-background border border-border rounded-xl p-3 shadow-sm">
              <RecentBalls balls={game.recentBalls} />
            </div>
          </section>

          {/* Right column: Settings */}
          <section className="md:col-span-1 lg:col-span-4 lg:order-3 space-y-4 md:space-y-6">
            {/* Pattern Selection */}
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm space-y-3 md:space-y-4">
              <PatternSelector
                selectedPattern={game.pattern}
                onSelect={game.setPattern}
                disabled={game.status === 'playing'}
              />
              <PatternPreview pattern={game.pattern} />
            </div>

            {/* Game Settings */}
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm space-y-4 md:space-y-6">
              <h2 className="text-lg md:text-xl font-semibold">Settings</h2>

              {/* Auto-call toggle */}
              <Toggle
                checked={game.autoCallEnabled}
                onChange={game.toggleAutoCall}
                label="Auto-call"
              />

              {/* Speed slider */}
              <Slider
                value={game.autoCallSpeed}
                onChange={game.setAutoCallSpeed}
                min={5}
                max={30}
                step={1}
                label="Call Interval"
                unit="s"
                disabled={!game.autoCallEnabled}
              />

              {/* Audio toggle */}
              <Toggle
                checked={game.audioEnabled}
                onChange={game.toggleAudio}
                label="Audio Announcements"
              />
              <p className="text-xs md:text-sm text-muted-foreground">
                Press M to toggle audio
              </p>

              {/* Voice pack selector */}
              <VoiceSelector
                selectedVoice={voicePack}
                onSelect={setVoicePack}
                preloadProgress={preloadProgress}
              />

              {/* Roll sound selector */}
              <RollSoundSelector />

              {/* Reveal chime selector */}
              <RevealChimeSelector />

              {/* Theme selector */}
              <ThemeSelector />
            </div>

            {/* Keyboard shortcuts reference - hidden on mobile (not relevant for touch) */}
            <div className="hidden md:block bg-background border border-border rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-semibold mb-3">Keyboard Shortcuts</h2>
              <ul className="space-y-2 text-base">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Roll</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    Space
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Pause/Resume</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    P
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Undo</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    U
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Reset</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    R
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Mute/Unmute</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    M
                  </kbd>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
      </main>

      {/* Admin controls - Room code, PIN display, and Create New Game button */}
      <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-3">
        {roomCode && !isOfflineMode && (
          <>
            <RoomCodeDisplay
              roomCode={roomCode}
              showSyncStatus={false}
            />
            <PinDisplay
              pin={currentPin}
              offlineSessionId={null}
            />
          </>
        )}
        {isOfflineMode && offlineSessionId && (
          <>
            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
              <div className="text-sm text-muted-foreground mb-1">Offline Session</div>
              <div className="text-2xl font-mono font-bold tracking-wider">
                {offlineSessionId}
              </div>
            </div>
            <PinDisplay
              pin={null}
              offlineSessionId={offlineSessionId}
            />
          </>
        )}
        <Button
          onClick={handleCreateNewGame}
          variant="secondary"
          size="md"
          className="shadow-lg"
        >
          Create New Game
        </Button>
      </div>

      {/* Session modals */}
      <RoomSetupModal
        isOpen={shouldShowModal}
        onClose={() => {
          setShowCreateModal(false);
          setSessionError(null);
          setRecoveryErrorMessage(null);
          setDismissedRecoveryError(true);
        }}
        onCreateRoom={handleModalCreateRoom}
        onJoinRoom={handleModalJoinRoom}
        onPlayOffline={handleModalPlayOffline}
        error={sessionError || recoveryErrorMessage}
        isLoading={isCreatingSession}
      />

      <InstallPrompt />
    </>
  );
}
