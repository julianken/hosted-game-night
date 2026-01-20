'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGameKeyboard } from '@/hooks/use-game-keyboard';
import { useSync } from '@/hooks/use-sync';
import { generateSessionId } from '@/lib/sync/session';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import { useSettingsStore, type TeamSetup } from '@/stores/settings-store';
import { useGameStore } from '@/stores/game-store';
import { QuestionList } from '@/components/presenter/QuestionList';
import { QuestionDisplay } from '@/components/presenter/QuestionDisplay';
import { TeamScoreInput } from '@/components/presenter/TeamScoreInput';
import { TeamManager } from '@/components/presenter/TeamManager';
import { OpenDisplayButton } from '@/components/presenter/OpenDisplayButton';
import { RoundSummary } from '@/components/presenter/RoundSummary';
import { ThemeSelector } from '@/components/presenter/ThemeSelector';
import { SettingsPanel } from '@/components/presenter/SettingsPanel';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';

export default function PlayPage() {
  const game = useGameKeyboard();

  // Generate a unique session ID for this presenter window
  const [sessionId] = useState(() => generateSessionId());

  // Round summary overlay control
  const [showRoundSummary, setShowRoundSummary] = useState(false);

  // Initialize sync as presenter role with session-scoped channel
  const { isConnected } = useSync({ role: 'presenter', sessionId });

  // Apply presenter theme
  const presenterTheme = useThemeStore((state) => state.presenterTheme);
  useApplyTheme(presenterTheme);

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false);

  // Get settings from settings store
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

  // Sync settings store values to game store when in setup mode
  // Use Zustand selectors directly to avoid infinite loop from useGame's whole-store subscription
  const gameStatus = useGameStore((state) => state.status);
  const updateGameSettings = useGameStore((state) => state.updateSettings);

  useEffect(() => {
    if (gameStatus === 'setup') {
      updateGameSettings({
        roundsCount,
        questionsPerRound,
        timerDuration,
        timerAutoStart,
        timerVisible,
        ttsEnabled,
      });
    }
  }, [
    gameStatus,
    updateGameSettings,
    roundsCount,
    questionsPerRound,
    timerDuration,
    timerAutoStart,
    timerVisible,
    ttsEnabled,
  ]);

  // Handle saving current teams to settings store
  const handleSaveTeams = useCallback(() => {
    saveTeamSetup(game.teams);
  }, [saveTeamSetup, game.teams]);

  // Handle loading teams from settings store
  const handleLoadTeams = useCallback(
    (teamSetup: TeamSetup) => {
      game.loadTeamsFromSetup(teamSetup.names);
    },
    [game]
  );

  // Helper to get status display
  const getStatusDisplay = () => {
    switch (game.status) {
      case 'setup':
        return { text: 'Setup', className: 'bg-blue-500/20 text-blue-600' };
      case 'playing':
        return {
          text: `Playing - ${game.roundProgress}`,
          className: 'bg-green-500/20 text-green-600',
        };
      case 'paused':
        return {
          text: game.emergencyBlank ? 'Emergency Pause' : 'Paused',
          className: 'bg-orange-500/20 text-orange-600',
        };
      case 'between_rounds':
        return {
          text: `Round ${game.currentRound + 1} Complete`,
          className: 'bg-yellow-500/20 text-yellow-600',
        };
      case 'ended':
        return { text: 'Ended', className: 'bg-gray-500/20 text-gray-600' };
      default:
        return { text: 'Unknown', className: 'bg-gray-500/20 text-gray-600' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Handle next round action
  const handleNextRound = () => {
    game.nextRound();
    setShowRoundSummary(false);
  };

  // Handle complete round
  const handleCompleteRound = () => {
    game.completeRound();
    setShowRoundSummary(true);
  };

  return (
    <>
      {/* Skip links for keyboard navigation */}
      <a
        href="#main-content"
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

      <main id="main-content" className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Trivia Night
            </h1>
            <p className="text-lg text-muted-foreground">Presenter View</p>
          </div>

          {/* Display controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Game status */}
            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${statusDisplay.className}`}>
              {statusDisplay.text}
            </span>

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-3 h-3 rounded-full
                  ${isConnected ? 'bg-green-500' : 'bg-gray-400'}
                `}
                title={isConnected ? 'Sync active' : 'Sync not active'}
              />
              <span className="text-sm md:text-base text-muted-foreground hidden sm:block">
                {isConnected ? 'Sync Active' : 'Sync Ready'}
              </span>
            </div>

            {/* Fullscreen toggle - hidden on small mobile */}
            <button
              onClick={game.toggleFullscreen}
              className="hidden sm:flex w-10 h-10 items-center justify-center rounded-lg
                text-muted-foreground hover:text-foreground hover:bg-muted/30
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title={game.isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
              aria-label={game.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {game.isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary
                ${showSettings
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              title={showSettings ? 'Hide settings' : 'Show settings'}
              aria-label={showSettings ? 'Hide settings panel' : 'Show settings panel'}
              aria-expanded={showSettings}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Help button - hidden on mobile (keyboard shortcuts not relevant for touch) */}
            <button
              onClick={() => game.setShowHelp(true)}
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-lg
                text-muted-foreground hover:text-foreground hover:bg-muted/30
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Open Display button */}
            <OpenDisplayButton sessionId={sessionId} />
          </div>
        </header>

        {/* Main content grid - Mobile first: stack vertically, then responsive columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Question Display - shown first on mobile for better UX */}
          <section className="md:col-span-2 lg:col-span-5 lg:order-2">
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
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
          </section>

          {/* Question List - collapsed on small mobile, shown on tablet+ */}
          <section className="hidden sm:block md:col-span-1 lg:col-span-3 lg:order-1">
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
              <QuestionList
                questions={game.questions}
                selectedIndex={game.selectedQuestionIndex}
                displayIndex={game.displayQuestionIndex}
                currentRound={game.currentRound}
                totalRounds={game.totalRounds}
                onSelect={game.selectQuestion}
                onSetDisplay={game.setDisplayQuestion}
              />
            </div>
          </section>

          {/* Mobile-only compact question navigator */}
          <section className="sm:hidden">
            <div className="bg-background border border-border rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Round {game.currentRound + 1}/{game.totalRounds}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => game.selectQuestion(Math.max(0, game.selectedQuestionIndex - 1))}
                    disabled={game.selectedQuestionIndex === 0}
                    className="w-10 h-10 flex items-center justify-center rounded-lg
                      bg-muted/30 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors"
                    aria-label="Previous question"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-base font-medium min-w-[4rem] text-center">
                    Q{game.selectedQuestionIndex + 1}/{game.questions.length}
                  </span>
                  <button
                    onClick={() => game.selectQuestion(Math.min(game.questions.length - 1, game.selectedQuestionIndex + 1))}
                    disabled={game.selectedQuestionIndex === game.questions.length - 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg
                      bg-muted/30 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors"
                    aria-label="Next question"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right column: Team Management & Scores */}
          <section id="game-controls" className="md:col-span-1 lg:col-span-4 lg:order-3 space-y-4 md:space-y-6" aria-label="Game controls and team management">
            {/* Team Manager */}
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
              <TeamManager
                teams={game.teams}
                status={game.status}
                onAddTeam={game.addTeam}
                onRemoveTeam={game.removeTeam}
                onRenameTeam={game.renameTeam}
              />
            </div>

            {/* Team Score Input - during playing or between_rounds */}
            {(game.status === 'playing' || game.status === 'between_rounds') && (
              <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <TeamScoreInput
                  teams={game.teams}
                  currentRound={game.currentRound}
                  onAdjustScore={game.adjustTeamScore}
                  onSetScore={game.setTeamScore}
                />
              </div>
            )}

            {/* Keyboard shortcuts reference - hidden on mobile (not relevant for touch) */}
            <div className="hidden md:block bg-background border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
                <button
                  onClick={() => game.setShowHelp(true)}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  View all
                </button>
              </div>
              <ul className="space-y-2 text-base">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Navigate questions</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                      ↑
                    </kbd>
                    <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                      ↓
                    </kbd>
                  </div>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Peek answer</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    Space
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Toggle display</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    D
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Fullscreen</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    F
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">All shortcuts</span>
                  <kbd className="px-2 py-1 bg-muted/30 rounded font-mono text-sm">
                    ?
                  </kbd>
                </li>
              </ul>
            </div>

            {/* Theme Settings */}
            <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
              <ThemeSelector />
            </div>

            {/* Settings Panel - collapsible */}
            {showSettings && (
              <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
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

            {/* Game ended state */}
            {game.status === 'ended' && (
              <div className="bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <h2 className="text-lg md:text-xl font-semibold mb-3 text-center">
                  Game Over!
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowRoundSummary(true)}
                    className="w-full px-4 py-3 rounded-xl text-base font-medium
                      bg-muted hover:bg-muted/80 text-foreground
                      transition-colors duration-200 min-h-[48px]"
                  >
                    View Final Results
                  </button>
                  <button
                    onClick={game.resetGame}
                    className="w-full px-4 py-3 rounded-xl text-base font-medium
                      bg-blue-600 hover:bg-blue-700 text-white
                      transition-colors duration-200 min-h-[48px]"
                  >
                    Start New Game
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Setup mode - shown below main content */}
        {game.status === 'setup' && (
          <div className="mt-4 md:mt-6 bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground">
                  Ready to Start?
                </h2>
                <p className="text-sm text-muted-foreground">
                  {game.teams.length === 0
                    ? 'Add at least one team to begin'
                    : `${game.teams.length} team${game.teams.length === 1 ? '' : 's'} ready`}
                </p>
              </div>
              <button
                onClick={game.startGame}
                disabled={!game.canStart}
                className={`
                  w-full sm:w-auto px-6 py-3 rounded-xl text-base md:text-lg font-semibold
                  transition-colors duration-200 min-h-[48px]
                  ${
                    game.canStart
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Start Game
              </button>
            </div>
          </div>
        )}

        {/* Last question of round prompt - shown below main content */}
        {game.status === 'playing' && game.isLastQuestionOfRound && (
          <div className="mt-4 md:mt-6 bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground">
                  Last Question of Round {game.currentRound + 1}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Complete the round when ready to show round summary
                </p>
              </div>
              <button
                onClick={handleCompleteRound}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-base font-semibold
                  bg-orange-600 hover:bg-orange-700 text-white
                  transition-colors duration-200 min-h-[48px]"
              >
                Complete Round
              </button>
            </div>
          </div>
        )}

        {/* Between rounds controls - shown below main content */}
        {game.status === 'between_rounds' && (
          <div className="mt-4 md:mt-6 bg-background border border-border rounded-xl p-3 md:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground">
                  Round {game.currentRound + 1} Complete
                </h2>
                <p className="text-sm text-muted-foreground">
                  Review scores and proceed when ready
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowRoundSummary(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-base font-medium
                    bg-muted hover:bg-muted/80 text-foreground
                    transition-colors duration-200 min-h-[48px]"
                >
                  Show Summary
                </button>
                <button
                  onClick={handleNextRound}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-base font-semibold
                    bg-green-600 hover:bg-green-700 text-white
                    transition-colors duration-200 min-h-[48px]"
                >
                  {game.isLastRound ? 'End Game' : 'Next Round'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Round Summary - shown below main content */}
        {showRoundSummary && (
          <div className="mt-4 md:mt-6">
            <RoundSummary
              currentRound={game.currentRound}
              totalRounds={game.totalRounds}
              roundWinners={game.roundWinners}
              teamsSortedByScore={game.teamsSortedByScore}
              isLastRound={game.isLastRound || game.status === 'ended'}
              onNextRound={handleNextRound}
              onClose={() => setShowRoundSummary(false)}
            />
          </div>
        )}

        {/* Paused state controls - shown below main content */}
        {game.status === 'paused' && (
          <div className="mt-4 md:mt-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 md:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                {/* Pause icon */}
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-foreground">
                    {game.emergencyBlank ? 'Emergency Pause Active' : 'Game Paused'}
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {game.emergencyBlank
                      ? 'Audience display is blanked. Press E to clear emergency.'
                      : 'Press P or click Resume to continue the game'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                {game.emergencyBlank && (
                  <button
                    onClick={game.emergencyPause}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-base font-medium
                      bg-red-600 hover:bg-red-700 text-white
                      transition-colors duration-200 min-h-[48px]"
                  >
                    Clear Emergency
                  </button>
                )}
                <button
                  onClick={game.resumeGame}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-base font-semibold
                    bg-green-600 hover:bg-green-700 text-white
                    transition-colors duration-200 min-h-[48px]"
                >
                  Resume Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause controls - shown during playing or between_rounds */}
        {(game.status === 'playing' || game.status === 'between_rounds') && (
          <div className="mt-4 md:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              onClick={game.pauseGame}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-base font-medium
                bg-orange-500/20 hover:bg-orange-500/30 text-orange-600
                border border-orange-500/30
                transition-colors duration-200 flex items-center justify-center gap-2 min-h-[48px]"
              title="Pause game (P)"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
            <button
              onClick={game.emergencyPause}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-base font-medium
                bg-red-500/20 hover:bg-red-500/30 text-red-600
                border border-red-500/30
                transition-colors duration-200 flex items-center justify-center gap-2 min-h-[48px]"
              title="Emergency pause - blanks display (E)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Emergency
            </button>
          </div>
        )}
      </div>
    </main>

    {/* Keyboard shortcuts modal */}
    <KeyboardShortcutsModal
      isOpen={game.showHelp}
      onClose={() => game.setShowHelp(false)}
    />
    </>
  );
}
