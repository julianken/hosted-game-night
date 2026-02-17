'use client';

import { useCallback } from 'react';
import { useGameKeyboard } from '@/hooks/use-game';
import { useSync } from '@/hooks/use-sync';
import { useAutoSync, usePresenterSession } from '@joolie-boolie/sync';
import { BallDisplay, RecentBalls, BallCounter } from '@/components/presenter/BallDisplay';
import { BingoBoard } from '@/components/presenter/BingoBoard';
import { PatternSelector, PatternPreview } from '@/components/presenter/PatternSelector';
import { ControlPanel } from '@/components/presenter/ControlPanel';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@joolie-boolie/ui';
import { RoomSetupModal } from '@/components/presenter/RoomSetupModal';
import { Button } from "@joolie-boolie/ui";
import { VoiceSelector } from '@/components/ui/VoiceSelector';
import { RollSoundSelector } from '@/components/presenter/RollSoundSelector';
import { RevealChimeSelector } from '@/components/presenter/RevealChimeSelector';
import { ThemeSelector } from '@joolie-boolie/ui';
import { useAudioPreload, useAudio } from '@/hooks/use-audio';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import { OfflineBanner, InstallPrompt } from '@/components/pwa';
import { serializeBingoState, deserializeBingoState } from '@/lib/session/serializer';
import { useGameStore } from '@/stores/game-store';
import { patternRegistry } from '@/lib/game/patterns';
import { generateSecurePin } from '@joolie-boolie/sync';

export default function PlayPage() {
  const game = useGameKeyboard();

  // Theme store selectors
  const presenterTheme = useThemeStore((state) => state.presenterTheme);
  const displayTheme = useThemeStore((state) => state.displayTheme);
  const setPresenterTheme = useThemeStore((state) => state.setPresenterTheme);
  const setDisplayTheme = useThemeStore((state) => state.setDisplayTheme);

  // Apply presenter theme
  useApplyTheme(presenterTheme);

  // Shared presenter session management
  const session = usePresenterSession({
    gameType: 'bingo',
    storagePrefix: 'bingo',
    offlineSessionStoragePrefix: 'bingo_offline_session',
    fetchGameState: async (roomCode: string, token: string) => {
      const response = await fetch(`/api/sessions/${roomCode}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw response;
      const data = await response.json();
      return data.gameState;
    },
    hydrateStore: (state: unknown) => {
      const partialState = deserializeBingoState(state);
      useGameStore.setState(partialState);
    },
    serializeState: () => serializeBingoState(useGameStore.getState()),
    autoCreateOffline: true,
    onAutoCreateOffline: (newSessionId) => {
      // Set default pattern (Blackout) and ensure audio is enabled
      const blackoutPattern = patternRegistry.get('blackout');
      if (blackoutPattern) {
        useGameStore.setState((state) => ({
          ...state,
          pattern: blackoutPattern,
          audioEnabled: true,
        }));
      }
      // Suppress unused variable warning - newSessionId used by the hook itself
      void newSessionId;
    },
  });

  // Initialize sync as presenter role with session-scoped channel
  const { isConnected } = useSync({ role: 'presenter', sessionId: session.sessionId });

  // Audio preloading and controls
  const { preloadProgress } = useAudioPreload();
  const { voicePack, setVoicePack } = useAudio();

  // Auto-sync game state to database (only in online mode)
  const gameState = useGameStore();
  useAutoSync(
    gameState,
    async (state) => {
      // Skip API calls in offline/setup mode
      if (session.mode !== 'online' || !session.roomCode) return;
      const serialized = serializeBingoState(state);
      const response = await fetch(`/api/sessions/${session.roomCode}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: null, state: serialized }),
      });
      if (!response.ok) throw new Error('Failed to sync state');
    },
    {
      debounceMs: 2000,
      enabled: session.mode === 'online' && !!session.roomCode,
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

  // Session handlers that wrap the shared hook
  const handlePlayOffline = useCallback(() => {
    session.playOffline();
  }, [session]);

  const handleModalCreateRoom = useCallback(async () => {
    const pin = session.pin || generateSecurePin();
    await session.createRoom({
      pin,
      initialState: serializeBingoState(gameState),
    });
  }, [session, gameState]);

  const handleModalJoinRoom = useCallback((roomCode: string, pin: string) => {
    void session.joinRoom(roomCode, pin);
  }, [session]);

  const handleModalPlayOffline = useCallback(() => {
    session.closeModal();
    session.playOffline();
  }, [session]);

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

    // Reset game state to initial
    game.resetGame();

    // Clear session and show modal
    session.resetSession({ showModal: true });
  }, [game, session]);

  // Open display window with room code or offline session ID in URL
  const openDisplay = useCallback(() => {
    if (session.mode === 'offline' && session.offlineSessionId) {
      const displayUrl = `${window.location.origin}/display?offline=${session.offlineSessionId}`;
      const displayWindow = window.open(
        displayUrl,
        `bingo-display-offline-${session.offlineSessionId}`,
        'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      );
      if (displayWindow) {
        displayWindow.focus();
      }
    } else if (session.roomCode) {
      const displayUrl = `${window.location.origin}/display?room=${session.roomCode}`;
      const displayWindow = window.open(
        displayUrl,
        `bingo-display-${session.roomCode}`,
        'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      );
      if (displayWindow) {
        displayWindow.focus();
      }
    } else {
      // No session: show create modal
      session.openModal();
    }
  }, [session]);

  return (
    <>
      {/* Skip link for keyboard navigation */}
      <a
        href="#main"
        className="sr-only skip-link focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>

      <OfflineBanner />
      <main id="main" className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Title section */}
            <div className="flex-shrink-0">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Bingo
              </h1>
              <p className="text-lg text-muted-foreground">Presenter View</p>
            </div>

            {/* Room information - inline display matching trivia style */}
            {(session.roomCode || session.mode === 'offline') && (
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {session.roomCode && session.mode !== 'offline' && (
                  <div className="flex items-center gap-2">
                    <span className="text-base text-muted-foreground">Room:</span>
                    <span className="font-mono font-semibold text-foreground">{session.roomCode}</span>
                    {session.pin && (
                      <>
                        <span className="text-base text-muted-foreground ml-2">PIN:</span>
                        <span className="font-mono font-semibold text-foreground">{session.pin}</span>
                      </>
                    )}
                  </div>
                )}
                {session.mode === 'offline' && session.offlineSessionId && (
                  <div className="flex items-center gap-2">
                    <span className="text-base text-muted-foreground">Offline Session:</span>
                    <span className="font-mono font-semibold text-foreground">{session.offlineSessionId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Display controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
              {/* Connection status */}
              <div className="flex items-center gap-2" data-testid="sync-indicator">
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

              <div className="flex items-center gap-2">
                {/* Play Offline button - only show if no session active */}
                {!session.roomCode && session.mode !== 'offline' && (
                  <Button
                    onClick={handlePlayOffline}
                    variant="secondary"
                    size="md"
                    aria-label="Quick offline play"
                  >
                    Play Offline
                  </Button>
                )}

                {/* Create New Game button - always visible (BEA-417) */}
                <Button
                  onClick={handleCreateNewGame}
                  variant="secondary"
                  size="md"
                  className="shadow-lg"
                >
                  Create New Game
                </Button>

                {/* Open Display button */}
                <Button
                  onClick={openDisplay}
                  variant="secondary"
                  size="md"
                >
                  Open Display
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content grid - Mobile first: stack vertically, then 2 cols on tablet, 3 cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Center column on mobile (moved up for better UX): Current Ball + Controls */}
          <section className="md:col-span-2 lg:col-span-4 lg:order-2 space-y-4 md:space-y-6">
            {/* Current Ball Display */}
            <div className="bg-background border border-border rounded-xl p-4 md:p-6 shadow-sm flex flex-col items-center gap-3 md:gap-4" data-testid="current-ball-section">
              <h2 className="text-lg md:text-xl font-semibold">Current Ball</h2>
              <BallDisplay ball={game.currentBall} size="xl" />
              {game.previousBall && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-base md:text-lg">Previous:</span>
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
                isProcessing={game.isProcessing}
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
                onReset={game.requestReset}
                onUndo={game.undoCall}
                showResetConfirm={game.showResetConfirm}
                onConfirmReset={game.confirmReset}
                onCancelReset={game.cancelReset}
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
              <p className="text-base text-muted-foreground">
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
              <ThemeSelector
                presenterTheme={presenterTheme}
                displayTheme={displayTheme}
                onPresenterThemeChange={setPresenterTheme}
                onDisplayThemeChange={setDisplayTheme}
              />
            </div>

            {/* Keyboard shortcuts reference - hidden on mobile (not relevant for touch) */}
            <div className="hidden md:block bg-background border border-border rounded-xl p-4 shadow-sm" data-testid="keyboard-shortcuts-section">
              <h2 className="text-xl font-semibold mb-3">Keyboard Shortcuts</h2>
              <ul className="space-y-2 text-base">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Roll</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-base">
                    Space
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Pause/Resume</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-base">
                    P
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Undo</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-base">
                    U
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Reset</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-base">
                    R
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Mute/Unmute</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-base">
                    M
                  </kbd>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
      </main>

      {/* Session modals */}
      <RoomSetupModal
        isOpen={session.shouldShowModal}
        onClose={session.closeModal}
        onCreateRoom={handleModalCreateRoom}
        onJoinRoom={handleModalJoinRoom}
        onPlayOffline={handleModalPlayOffline}
        error={session.error}
        isLoading={session.isLoading}
      />

      <InstallPrompt />
    </>
  );
}
