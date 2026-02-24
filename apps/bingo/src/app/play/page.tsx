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
import { VoiceVolumeControl } from '@/components/presenter/VoiceVolumeControl';
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
  const { voicePack, setVoicePack, voiceVolume, setVoiceVolume } = useAudio();

  // Full store subscription intentional — useAutoSync needs complete state for serialization
  // and change detection (the hook's useEffect dependency on `state` drives reactivity).
  // Passing a selector here would break the sync trigger mechanism.
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

  // Audience state label (Issue 2.3 — presenter audience-state indicator)
  const audienceStateLabel = {
    idle: 'Waiting',
    playing: 'Game in Progress',
    paused: 'Paused',
    ended: 'Game Over',
  }[game.status] ?? 'Waiting';

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
      <main id="main" className="min-h-screen bg-background p-3 md:p-4">
        <div className="max-w-[1600px] mx-auto">

          {/* Compact single-line header */}
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Bingo
              </h1>
              {/* Presenter badge */}
              <span
                className="
                  px-2 py-0.5 rounded text-xs font-semibold
                  bg-primary/20 text-primary border border-primary/30
                "
                aria-label="Presenter view"
              >
                Presenter
              </span>
              {/* Audience state indicator (Issue 2.3) */}
              <span className="text-sm font-medium text-foreground-secondary hidden sm:inline">
                Audience: {audienceStateLabel}
              </span>
            </div>

            {/* Room info + controls row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Session info */}
              {session.roomCode && session.mode !== 'offline' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground-secondary">Room:</span>
                  <span className="font-mono font-semibold text-foreground text-sm">{session.roomCode}</span>
                  {session.pin && (
                    <>
                      <span className="text-sm text-foreground-secondary ml-1">PIN:</span>
                      <span className="font-mono font-semibold text-foreground text-sm">{session.pin}</span>
                    </>
                  )}
                </div>
              )}
              {session.mode === 'offline' && session.offlineSessionId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground-secondary">Offline:</span>
                  <span className="font-mono font-semibold text-foreground text-sm">{session.offlineSessionId}</span>
                </div>
              )}

              {/* Connection status */}
              <div className="flex items-center gap-2" data-testid="sync-indicator">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-success' : 'bg-foreground-muted'}`}
                  title={isConnected ? 'Sync active' : 'Sync not active'}
                />
                <span className="text-sm text-foreground-secondary hidden sm:block">
                  {isConnected ? 'Synced' : 'Ready'}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {!session.roomCode && session.mode !== 'offline' && (
                  <Button onClick={handlePlayOffline} variant="secondary" size="md" aria-label="Quick offline play">
                    Offline
                  </Button>
                )}
                <Button onClick={handleCreateNewGame} variant="secondary" size="md" className="shadow-lg">
                  New Game
                </Button>
                <Button onClick={openDisplay} variant="secondary" size="md">
                  Open Display
                </Button>
              </div>
            </div>
          </header>

          {/* Command center 3-column grid
              Left(col-span-4): board
              Center(col-span-5): current ball + controls — slightly wider
              Right(col-span-3): settings/pattern
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4">

            {/* Left column: Bingo Board */}
            <section className="hidden sm:block md:col-span-1 lg:col-span-3 lg:order-1 space-y-3">
              <div
                className="bg-surface border border-border-subtle rounded-xl p-3 shadow-md"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                <h2 className="text-base font-semibold mb-2 text-foreground-secondary">Called Numbers</h2>
                <BingoBoard calledBalls={game.calledBalls} />
              </div>

              <div
                className="bg-surface border border-border-subtle rounded-xl p-3"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <RecentBalls balls={game.recentBalls} />
              </div>
            </section>

            {/* Mobile-only recent balls */}
            <section className="sm:hidden space-y-3">
              <div className="bg-surface border border-border-subtle rounded-xl p-3">
                <RecentBalls balls={game.recentBalls} />
              </div>
            </section>

            {/* Center column: Current Ball + Controls */}
            <section className="md:col-span-2 lg:col-span-5 lg:order-2 space-y-3" data-testid="current-ball-section">
              {/* Current Ball with ambient glow backdrop */}
              <div
                className="bg-surface border border-border-subtle rounded-xl p-4 flex flex-col items-center gap-3 relative overflow-hidden"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                {/* Ambient glow div behind current ball */}
                {game.currentBall && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none transition-opacity duration-700"
                    style={{
                      background: `radial-gradient(circle at 50% 45%, var(--bingo-ball-${game.currentBall.column.toLowerCase()}-glow-intense) 0%, transparent 65%)`,
                      opacity: 0.7,
                    }}
                  />
                )}

                <h2 className="text-base font-semibold text-foreground-secondary relative z-10">Current Ball</h2>
                <div className="relative z-10">
                  <BallDisplay ball={game.currentBall} size="lg" />
                </div>
                {game.previousBall && (
                  <div className="flex items-center gap-2 text-foreground-secondary relative z-10">
                    <span className="text-sm">Previous:</span>
                    <BallDisplay ball={game.previousBall} size="sm" />
                  </div>
                )}
                <div className="relative z-10">
                  <BallCounter called={game.ballsCalled} remaining={game.ballsRemaining} />
                </div>
              </div>

              {/* Control Panel */}
              <div
                className="bg-surface border border-border-subtle rounded-xl p-3"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
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

            {/* Right column: Settings / Pattern */}
            <section className="md:col-span-1 lg:col-span-4 lg:order-3 space-y-3">
              {/* Pattern Selection */}
              <div
                className="bg-surface border border-border-subtle rounded-xl p-3 space-y-2"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <PatternSelector
                  selectedPattern={game.pattern}
                  onSelect={game.setPattern}
                  disabled={game.status === 'playing'}
                />
                <PatternPreview pattern={game.pattern} />
              </div>

              {/* Game Settings */}
              <div
                className="bg-surface border border-border-subtle rounded-xl p-3 space-y-2"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <h2 className="text-base font-semibold text-foreground-secondary">Settings</h2>

                {/* Auto-call toggle + conditional speed slider */}
                <div className="space-y-1">
                  <Toggle
                    checked={game.autoCallEnabled}
                    onChange={game.toggleAutoCall}
                    label="Auto-call"
                  />
                  {game.autoCallEnabled && (
                    <Slider
                      value={game.autoCallSpeed}
                      onChange={game.setAutoCallSpeed}
                      min={5}
                      max={30}
                      step={1}
                      label="Call Interval"
                      unit="s"
                    />
                  )}
                </div>

                {/* Audio toggle */}
                <Toggle
                  checked={game.audioEnabled}
                  onChange={game.toggleAudio}
                  label="Audio Announcements"
                />

                {/* Audio & Sound collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-2 text-base font-medium text-foreground-secondary hover:text-foreground transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>Audio & Sound</span>
                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="space-y-3 pt-2">
                    {/* Voice pack selector */}
                    <VoiceSelector
                      selectedVoice={voicePack}
                      onSelect={setVoicePack}
                      preloadProgress={preloadProgress}
                    />

                    {/* Voice volume + preview */}
                    <VoiceVolumeControl
                      volume={voiceVolume}
                      onVolumeChange={setVoiceVolume}
                    />

                    {/* Roll sound selector */}
                    <RollSoundSelector />

                    {/* Reveal chime selector */}
                    <RevealChimeSelector />
                  </div>
                </details>

                {/* Appearance collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-2 text-base font-medium text-foreground-secondary hover:text-foreground transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>Appearance</span>
                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="space-y-3 pt-2">
                    <ThemeSelector
                      presenterTheme={presenterTheme}
                      displayTheme={displayTheme}
                      onPresenterThemeChange={setPresenterTheme}
                      onDisplayThemeChange={setDisplayTheme}
                    />
                  </div>
                </details>
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
