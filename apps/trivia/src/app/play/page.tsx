'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGameKeyboard } from '@/hooks/use-game-keyboard';
import { useSync } from '@/hooks/use-sync';
import { useAutoSync, usePresenterSession, generateSecurePin } from '@joolie-boolie/sync';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import { useGameStore } from '@/stores/game-store';
import { useSettingsStore, type TeamSetup } from '@/stores/settings-store';
import { QuestionList } from '@/components/presenter/QuestionList';
import { QuestionDisplay } from '@/components/presenter/QuestionDisplay';
import { TeamScoreInput } from '@/components/presenter/TeamScoreInput';
import { TeamManager } from '@/components/presenter/TeamManager';
import { QuickScoreGrid } from '@/components/presenter/QuickScoreGrid';
import { NextActionHint } from '@/components/presenter/NextActionHint';
import { useQuickScore } from '@/hooks/use-quick-score';
import { useGameEventSounds } from '@/hooks/use-sounds';
import { RoundSummary } from '@/components/presenter/RoundSummary';
import { ThemeSelector } from '@joolie-boolie/ui';
import { SettingsPanel } from '@/components/presenter/SettingsPanel';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { RoomSetupModal } from '@/components/presenter/RoomSetupModal';
import { SaveTemplateModal } from '@/components/presenter/SaveTemplateModal';
import { SavePresetModal } from '@/components/presenter/SavePresetModal';
import { SaveQuestionSetModal } from '@/components/presenter/SaveQuestionSetModal';
import { filterQuestionsByCategory } from '@/lib/categories';
import type { QuestionCategory } from '@/types';
import { Button } from '@joolie-boolie/ui';
import { serializeTriviaState, deserializeTriviaState } from '@/lib/state/serializer';
import { SetupWizard } from '@/components/presenter/SetupWizard';
import { PresenterActionBar } from '@/components/presenter/PresenterActionBar';

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
    gameType: 'trivia',
    storagePrefix: 'trivia',
    offlineSessionStoragePrefix: 'trivia_offline_session',
    fetchGameState: async (roomCode: string, token: string) => {
      const response = await fetch(`/api/sessions/${roomCode}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw response;
      const data = await response.json();
      return data.gameState;
    },
    hydrateStore: (state: unknown) => {
      const partialState = deserializeTriviaState(state);
      useGameStore.setState(partialState);
    },
    serializeState: () => serializeTriviaState(useGameStore.getState()),
    autoCreateOffline: false,
  });

  // Initialize sync as presenter role with session-scoped channel
  const { isConnected } = useSync({ role: 'presenter', sessionId: session.sessionId });

  // Round summary overlay control
  const [showRoundSummary, setShowRoundSummary] = useState(false);

  // Auto-sync game state to database (only in online mode)
  const gameState = useGameStore();
  const { isSyncing: _isSyncing, lastSyncTime: _lastSyncTime } = useAutoSync(
    gameState,
    async (state) => {
      if (session.mode !== 'online' || !session.roomCode) return;
      const serialized = serializeTriviaState(state);
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
        if (prev?.status !== next?.status) return 'STATUS_CHANGED';
        if (prev?.displayQuestionIndex !== next?.displayQuestionIndex) return 'QUESTION_CHANGED';
        if (prev?.currentRound !== next?.currentRound) return 'ROUND_CHANGED';
        return null;
      },
    }
  );

  // Save offline session state to localStorage
  useEffect(() => {
    if (session.mode === 'offline' && session.offlineSessionId) {
      try {
        const sessionKey = `trivia_offline_session_${session.offlineSessionId}`;
        const sessionData = {
          sessionId: session.offlineSessionId,
          isOffline: true,
          gameState: serializeTriviaState(gameState),
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      } catch (error) {
        console.error('Failed to save offline session:', error);
      }
    }
  }, [session.mode, session.offlineSessionId, gameState]);

  // Session handlers
  const handlePlayOffline = useCallback(() => {
    session.playOffline();
  }, [session]);

  const handleModalCreateRoom = useCallback(async () => {
    const pin = session.pin || generateSecurePin();
    await session.createRoom({
      pin,
      initialState: serializeTriviaState(gameState),
    });
  }, [session, gameState]);

  const handleModalJoinRoom = useCallback((roomCode: string, pin: string) => {
    void session.joinRoom(roomCode, pin);
  }, [session]);

  const handleModalPlayOffline = useCallback(() => {
    session.playOffline();
    session.closeModal();
  }, [session]);

  const handleCreateNewGame = useCallback(() => {
    if (game.status !== 'setup' && game.status !== 'ended') {
      const confirmed = window.confirm(
        'This will end the current game and create a new one. Are you sure?'
      );
      if (!confirmed) return;
    }
    game.resetGame();
    session.resetSession({ showModal: true });
  }, [game, session]);

  const openDisplay = useCallback(() => {
    let displayUrl: string;
    let windowName: string;

    if (session.mode === 'offline' && session.offlineSessionId) {
      displayUrl = `${window.location.origin}/display?offline=${session.offlineSessionId}`;
      windowName = `trivia-display-offline-${session.offlineSessionId}`;
    } else if (session.roomCode) {
      displayUrl = `${window.location.origin}/display?room=${session.roomCode}`;
      windowName = `trivia-display-${session.roomCode}`;
    } else {
      displayUrl = `${window.location.origin}/display`;
      windowName = 'trivia-display';
    }

    const displayWindow = window.open(
      displayUrl,
      windowName,
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (displayWindow) displayWindow.focus();
  }, [session]);

  const handleNextRound = () => {
    game.nextRound();
    setShowRoundSummary(false);
  };

  const handleCompleteRound = () => {
    game.completeRound();
    setShowRoundSummary(true);
  };

  const [showSettings, setShowSettings] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [showSaveQuestionSetModal, setShowSaveQuestionSetModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<QuestionCategory[]>([]);

  const filteredQuestions = useMemo(() => {
    if (selectedCategories.length === 0) return game.questions;
    return filterQuestionsByCategory(game.questions, selectedCategories);
  }, [game.questions, selectedCategories]);

  const {
    roundsCount,
    questionsPerRound,
    timerDuration,
    timerAutoStart,
    timerVisible,
    ttsEnabled,
    lastTeamSetup,
    updateSetting,
    saveTeamSetup,
  } = useSettingsStore();

  useEffect(() => {
    if (game.status === 'setup') {
      useGameStore.getState().updateSettings({
        roundsCount,
        questionsPerRound,
        timerDuration,
        timerAutoStart,
        timerVisible,
        ttsEnabled,
      });
    }
  }, [game.status, roundsCount, questionsPerRound, timerDuration, timerAutoStart, timerVisible, ttsEnabled]);

  const handleSaveTeams = useCallback(() => {
    saveTeamSetup(game.teams);
  }, [saveTeamSetup, game.teams]);

  const handleLoadTeams = useCallback(
    (teamSetup: TeamSetup) => {
      game.loadTeamsFromSetup(teamSetup.names);
    },
    [game]
  );

  /** Read audienceScene directly from the store (Issue 2.3, T1.13) */
  const audienceScene = useGameStore((state) => state.audienceScene);

  /** Read revealPhase for sound triggers (T3.1) */
  const revealPhase = useGameStore((state) => state.revealPhase);

  /** T3.1: Wire scene-aware game event sounds */
  useGameEventSounds({
    status: game.status,
    displayQuestionIndex: game.displayQuestionIndex,
    currentRound: game.currentRound,
    audienceScene,
    revealPhase,
  });

  /** Quick score hook (T3.6) — wired to selected question index */
  const quickScore = useQuickScore(game.selectedQuestionIndex);

  /** Scoring-phase scenes where QuickScoreGrid should appear (T3.6) */
  const isScoringScene = (
    audienceScene === 'answer_reveal' ||
    audienceScene === 'question_closed' ||
    audienceScene === 'score_flash'
  );

  /** Status badge for the presenter header */
  const getStatusDisplay = () => {
    switch (game.status) {
      case 'setup':
        return { text: 'Setup', className: 'bg-blue-500/20 text-blue-400' };
      case 'playing':
        return {
          text: `Playing - ${game.roundProgress}`,
          className: 'bg-success/20 text-success',
        };
      case 'paused':
        return {
          text: game.emergencyBlank ? 'Emergency Pause' : 'Paused',
          className: 'bg-warning/20 text-warning',
        };
      case 'between_rounds':
        return {
          text: `Round ${game.currentRound + 1} Complete`,
          className: 'bg-accent/20 text-accent',
        };
      case 'ended':
        return { text: 'Ended', className: 'bg-muted text-muted-foreground' };
      default:
        return { text: 'Unknown', className: 'bg-muted text-muted-foreground' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <>
      {/* Skip links for keyboard navigation */}
      <a
        href="#main"
        className="sr-only skip-link focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>
      <a
        href="#game-controls"
        className="sr-only skip-link focus:not-sr-only focus:absolute focus:top-4 focus:left-48 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium"
      >
        Skip to game controls
      </a>

      {/*
        Fixed-viewport 3-column layout during gameplay (Issue 6.5).
        Left rail: question navigator (w-64)
        Center: hero question panel (flex-1)
        Right: leaderboard sidebar (w-80)
        Bottom: fixed action bar (h-16)
        No viewport scrolling during gameplay.
      */}
      <div
        id="main"
        className="h-screen flex flex-col overflow-hidden bg-background"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {/* ---- TOP HEADER BAR ---- */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-surface/80"
          style={{ backdropFilter: 'blur(8px)', height: '56px' }}
        >
          {/* Brand + Presenter label */}
          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Trivia
            </h1>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/15 text-primary"
              style={{ letterSpacing: '0.08em' }}
            >
              Presenter
            </span>
          </div>

          {/* Center: status + audience scene indicator (Issue 2.3) */}
          <div className="flex items-center gap-4">
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${statusDisplay.className}`}>
              {statusDisplay.text}
            </span>
            <span className="text-sm text-foreground-secondary font-medium hidden md:block">
              Audience: {audienceScene.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-2" title={isConnected ? 'Sync active' : 'Sync not active'}>
              <div
                className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-success' : 'bg-muted-foreground'}`}
                aria-hidden="true"
              />
              <span className="text-sm text-foreground-secondary hidden lg:block">
                {isConnected ? 'Synced' : 'Ready'}
              </span>
            </div>

            {/* Room code */}
            {session.roomCode && session.mode !== 'offline' && (
              <span className="font-mono text-sm font-semibold text-foreground bg-surface px-2 py-1 rounded-md">
                {session.roomCode}
              </span>
            )}

            {/* Play Offline */}
            {!session.roomCode && session.mode !== 'offline' && (
              <Button onClick={handlePlayOffline} variant="secondary" size="sm">
                Play Offline
              </Button>
            )}

            {/* Open Display */}
            <Button onClick={openDisplay} variant="secondary" size="sm">
              Open Display
            </Button>

            {/* Create New Game */}
            {(session.roomCode || session.mode === 'offline') && (
              <Button onClick={handleCreateNewGame} variant="secondary" size="sm">
                New Game
              </Button>
            )}

            {/* Fullscreen */}
            <button
              onClick={game.toggleFullscreen}
              className="hidden sm:flex min-w-[var(--size-touch)] min-h-[var(--size-touch)] items-center justify-center rounded-lg
                text-foreground-secondary hover:text-foreground hover:bg-surface-hover
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title={game.isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
              aria-label={game.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {game.isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`min-w-[var(--size-touch)] min-h-[var(--size-touch)] flex items-center justify-center rounded-lg
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary
                ${showSettings
                  ? 'bg-primary/20 text-primary'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-surface-hover'
                }`}
              title={showSettings ? 'Hide settings' : 'Show settings'}
              aria-label={showSettings ? 'Hide settings panel' : 'Show settings panel'}
              aria-expanded={showSettings}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Help */}
            <button
              onClick={() => game.setShowHelp(true)}
              className="hidden md:flex min-w-[var(--size-touch)] min-h-[var(--size-touch)] items-center justify-center rounded-lg
                text-foreground-secondary hover:text-foreground hover:bg-surface-hover
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* ---- MAIN 3-COLUMN AREA ---- */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT RAIL: Question Navigator (w-64) */}
          <aside
            className="w-64 flex-shrink-0 border-r border-border overflow-y-auto bg-surface/40"
            aria-label="Question navigator"
          >
            <div className="p-3">
              <QuestionList
                questions={game.status === 'setup' ? filteredQuestions : game.questions}
                selectedIndex={game.selectedQuestionIndex}
                displayIndex={game.displayQuestionIndex}
                currentRound={game.currentRound}
                totalRounds={game.totalRounds}
                onSelect={game.selectQuestion}
                onSetDisplay={game.setDisplayQuestion}
              />
            </div>
          </aside>

          {/* CENTER: Hero Question Panel (flex-1) */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto p-4"
            aria-label="Current question"
          >
            {/* Question display */}
            <div className="bg-surface border border-border rounded-xl p-4 shadow-md mb-3">
              <QuestionDisplay
                question={game.selectedQuestion}
                peekAnswer={game.peekAnswer}
                onTogglePeek={() => game.setPeekAnswer(!game.peekAnswer)}
                onToggleDisplay={() => {
                  const isCurrentlyOnDisplay = game.displayQuestionIndex === game.selectedQuestionIndex;
                  game.setDisplayQuestion(isCurrentlyOnDisplay ? null : game.selectedQuestionIndex);
                }}
                progress={game.questionInRoundProgress}
                roundProgress={game.roundProgress}
                isOnDisplay={game.displayQuestionIndex === game.selectedQuestionIndex}
              />
            </div>

            {/* Next action hint (T3.6) */}
            <div className="mb-4 px-1">
              <NextActionHint />
            </div>

            {/* Keyboard shortcuts reference */}
            <div className="hidden md:block bg-surface border border-border rounded-xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">Keyboard Shortcuts</h2>
                <button
                  onClick={() => game.setShowHelp(true)}
                  className="text-sm text-primary hover:text-primary/80 underline min-h-[var(--size-touch)] flex items-center"
                >
                  View all
                </button>
              </div>
              <ul className="space-y-1.5 text-sm">
                <li className="flex justify-between">
                  <span className="text-foreground-secondary">Navigate questions</span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">↓</kbd>
                  </div>
                </li>
                <li className="flex justify-between">
                  <span className="text-foreground-secondary">Peek answer</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">Space</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-foreground-secondary">Toggle display</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">D</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-foreground-secondary">Fullscreen</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">F</kbd>
                </li>
              </ul>
            </div>

            {/* Theme settings */}
            <div className="bg-surface border border-border rounded-xl p-3 shadow-sm mb-4">
              <ThemeSelector
                presenterTheme={presenterTheme}
                displayTheme={displayTheme}
                onPresenterThemeChange={setPresenterTheme}
                onDisplayThemeChange={setDisplayTheme}
              />
            </div>

            {/* Settings panel */}
            {showSettings && (
              <div className="bg-surface border border-border rounded-xl p-3 shadow-sm mb-4">
                <SettingsPanel
                  status={game.status}
                  roundsCount={roundsCount}
                  questionsPerRound={questionsPerRound}
                  timerDuration={timerDuration}
                  timerAutoStart={timerAutoStart}
                  timerVisible={timerVisible}
                  ttsEnabled={ttsEnabled}
                  lastTeamSetup={lastTeamSetup}
                  currentTeams={game.teams}
                  onUpdateSetting={updateSetting}
                  onLoadTeams={handleLoadTeams}
                  onSaveTeams={handleSaveTeams}
                />
              </div>
            )}

            {/* Setup mode content — SetupWizard (T4.1) */}
            {game.status === 'setup' && (
              <SetupWizard
                questions={game.questions}
                onImport={gameState.importQuestions}
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
                onSaveQuestionSet={() => setShowSaveQuestionSetModal(true)}
                roundsCount={roundsCount}
                questionsPerRound={questionsPerRound}
                timerDuration={timerDuration}
                timerAutoStart={timerAutoStart}
                timerVisible={timerVisible}
                ttsEnabled={ttsEnabled}
                lastTeamSetup={lastTeamSetup}
                currentTeams={game.teams}
                onUpdateSetting={updateSetting}
                onLoadTeams={handleLoadTeams}
                onSaveTeams={handleSaveTeams}
                onSavePreset={() => setShowSavePresetModal(true)}
                canStart={game.canStart}
                onAddTeam={game.addTeam}
                onRemoveTeam={game.removeTeam}
                onRenameTeam={game.renameTeam}
                onLoadTeamsFromSetup={game.loadTeamsFromSetup}
                onSaveTemplate={() => setShowSaveTemplateModal(true)}
                onStartGame={game.startGame}
              />
            )}

            {/* Round summary */}
            {showRoundSummary && (
              <div className="mt-4">
                <RoundSummary
                  currentRound={game.currentRound}
                  totalRounds={game.totalRounds}
                  roundWinners={(game.isLastRound || game.status === 'ended') ? game.overallLeaders : game.roundWinners}
                  teamsSortedByScore={game.teamsSortedByScore}
                  isLastRound={game.isLastRound || game.status === 'ended'}
                  onNextRound={handleNextRound}
                  onClose={() => setShowRoundSummary(false)}
                />
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR: Leaderboard + Team Controls (w-80) */}
          <aside
            id="game-controls"
            className="w-80 flex-shrink-0 border-l border-border overflow-y-auto bg-surface/40"
            aria-label="Game controls and team management"
          >
            <div className="p-3 space-y-3">
              {/* Team Manager */}
              <div className="bg-surface border border-border rounded-xl p-3 shadow-sm">
                <TeamManager
                  teams={game.teams}
                  status={game.status}
                  onAddTeam={game.addTeam}
                  onRemoveTeam={game.removeTeam}
                  onRenameTeam={game.renameTeam}
                />
              </div>

              {/* Quick Score Grid (T3.6) — shown during scoring-phase scenes */}
              {(game.status === 'playing' || game.status === 'between_rounds') && isScoringScene && (
                <div className="bg-surface border border-border rounded-xl p-3 shadow-sm">
                  <QuickScoreGrid
                    teams={game.teams}
                    quickScore={quickScore}
                  />
                </div>
              )}

              {/* Team Score Input */}
              {(game.status === 'playing' || game.status === 'between_rounds') && !isScoringScene && (
                <div className="bg-surface border border-border rounded-xl p-3 shadow-sm">
                  <TeamScoreInput
                    teams={game.teams}
                    currentRound={game.currentRound}
                    onAdjustScore={game.adjustTeamScore}
                    onSetScore={game.setTeamScore}
                  />
                </div>
              )}

              {/* Game ended state */}
              {game.status === 'ended' && (
                <div className="bg-surface border border-border rounded-xl p-3 shadow-sm">
                  <h2 className="text-base font-semibold mb-3 text-center text-foreground">Game Over</h2>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowRoundSummary(true)}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium
                        bg-surface-elevated hover:bg-surface-hover text-foreground
                        border border-border transition-colors min-h-[44px]"
                    >
                      View Final Results
                    </button>
                    <button
                      onClick={game.resetGame}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium
                        bg-primary hover:bg-primary-hover text-primary-foreground
                        transition-colors min-h-[44px]"
                    >
                      Start New Game
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* ---- FIXED BOTTOM ACTION BAR (T4.6) ---- */}
        <PresenterActionBar
          status={game.status}
          currentRound={game.currentRound}
          totalRounds={game.totalRounds}
          isLastRound={game.isLastRound}
          isLastQuestionOfRound={game.isLastQuestionOfRound}
          emergencyBlank={game.emergencyBlank}
          onCompleteRound={handleCompleteRound}
          onNextRound={handleNextRound}
          onShowSummary={() => setShowRoundSummary(true)}
          onResumeGame={game.resumeGame}
          onPauseGame={game.pauseGame}
          onEmergencyPause={game.emergencyPause}
        />
      </div>

      {/* Modals */}
      <KeyboardShortcutsModal
        isOpen={game.showHelp}
        onClose={() => game.setShowHelp(false)}
      />
      <RoomSetupModal
        isOpen={session.shouldShowModal}
        onClose={session.closeModal}
        onCreateRoom={handleModalCreateRoom}
        onJoinRoom={handleModalJoinRoom}
        onPlayOffline={handleModalPlayOffline}
        error={session.error}
        isLoading={session.isLoading}
      />
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
      />
      <SavePresetModal
        isOpen={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
      />
      <SaveQuestionSetModal
        isOpen={showSaveQuestionSetModal}
        onClose={() => setShowSaveQuestionSetModal(false)}
      />
    </>
  );
}
