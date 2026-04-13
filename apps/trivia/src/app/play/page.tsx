'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameKeyboard } from '@/hooks/use-game-keyboard';
import { useSync } from '@/hooks/use-sync';
import { generateSessionId } from '@/lib/sync/session';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import { useGameStore } from '@/stores/game-store';
import { useSettingsStore } from '@/stores/settings-store';
import { QuestionList } from '@/components/presenter/QuestionList';
import { QuestionDisplay } from '@/components/presenter/QuestionDisplay';
import { RoundScoringPanel } from '@/components/presenter/RoundScoringPanel';
import { SceneNavButtons } from '@/components/presenter/SceneNavButtons';
import { NextActionHint } from '@/components/presenter/NextActionHint';
import { useGameEventSounds } from '@/hooks/use-sounds';
import { useRevealSequence } from '@/hooks/use-reveal-sequence';
import { RoundSummary } from '@/components/presenter/RoundSummary';
import { RoundScoringView } from '@/components/presenter/RoundScoringView';
import { ThemeSelector } from '@joolie-boolie/ui';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { SaveTemplateModal } from '@/components/presenter/SaveTemplateModal';
import { SavePresetModal } from '@/components/presenter/SavePresetModal';
import { Button, Modal } from '@joolie-boolie/ui';
import { SetupGate } from '@/components/presenter/SetupGate';

export default function PlayPage() {
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);

  // BEA-715: Hydration-ready gate.
  // The SetupGate wizard reads from useSettingsStore (zustand persist). Under
  // React 19 + AnimatePresence, wizard step buttons exist in the DOM before
  // their click handlers attach (or before the persisted settings have
  // hydrated), causing E2E clicks to land but do nothing. Set a data-attribute
  // once persist has finished hydrating + the component has mounted, so the
  // E2E helper (e2e/utils/helpers.ts::startGameViaWizard) can gate on it.
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  useEffect(() => {
    const check = () => {
      const hydrated = useSettingsStore.persist?.hasHydrated?.() ?? true;
      if (hydrated) setSettingsHydrated(true);
    };
    check();
    const unsub = useSettingsStore.persist?.onFinishHydration?.(() => {
      setSettingsHydrated(true);
    });
    return () => {
      unsub?.();
    };
  }, []);

  const game = useGameKeyboard({
    onResetRequest: useCallback(() => setShowNewGameConfirm(true), []),
  });

  // Theme store selectors
  const presenterTheme = useThemeStore((state) => state.presenterTheme);
  const displayTheme = useThemeStore((state) => state.displayTheme);
  const setPresenterTheme = useThemeStore((state) => state.setPresenterTheme);
  const setDisplayTheme = useThemeStore((state) => state.setDisplayTheme);

  // Apply presenter theme
  useApplyTheme(presenterTheme);

  // Local session ID — stable for the lifetime of this presenter window
  const sessionIdRef = useRef(generateSessionId());
  const sessionId = sessionIdRef.current;

  // Initialize sync as presenter role with session-scoped channel
  const { isConnected } = useSync({ role: 'presenter', sessionId });

  // Round summary overlay control
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const audienceScene = useGameStore((state) => state.audienceScene);

  // Auto-hide round summary overlay when game state advances past it:
  // - Reset to setup (all reset paths)
  // - Next round starts (status → playing)
  // - Recap entry via ArrowRight (scene leaves round_summary during between_rounds)
  // Note: does NOT hide during 'ended' so "View Final Results" overlay stays visible.
  useEffect(() => {
    if (game.status === 'setup' || game.status === 'playing') {
      setShowRoundSummary(false);
    }
  }, [game.status]);

  useEffect(() => {
    if (game.status === 'between_rounds' && audienceScene !== 'round_summary') {
      setShowRoundSummary(false);
    }
  }, [audienceScene, game.status]);

  // WU-04: Auto-show RoundSummary overlay when scene enters round_summary.
  // Decouples the overlay from handleCompleteRound so SceneNavButtons can
  // trigger round_summary via advanceScene without knowing about the overlay.
  useEffect(() => {
    if (audienceScene === 'round_summary' && game.status === 'between_rounds') {
      setShowRoundSummary(true);
    }
  }, [audienceScene, game.status]);

  // Auto-show RoundSummary (as Final Results) when game ends.
  // Fires exactly once per game: status can only reach 'ended' once before
  // resetGame() resets it to 'setup', which the existing auto-hide handles.
  // Does NOT use a ref — no risk of double-fire across the status lifecycle.
  useEffect(() => {
    if (game.status === 'ended') {
      setShowRoundSummary(true);
    }
  }, [game.status]);

  const openDisplay = useCallback(() => {
    const displayUrl = `${window.location.origin}/display?session=${sessionId}`;
    window.open(displayUrl, `trivia-display-${sessionId}`, 'popup');
  }, [sessionId]);

  // between_rounds only: advance to next round and reset scene.
  const handleNextRound = () => {
    if (game.status !== 'between_rounds') return;
    game.nextRound();
    setShowRoundSummary(false);
    useGameStore.getState().setAudienceScene('round_intro');
  };

  // ended only: dismiss the final results overlay.
  // Does NOT touch audienceScene — final_podium must remain stable.
  const handleEndGameDismiss = () => {
    setShowRoundSummary(false);
  };

  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const {
    questionsPerRound,
    timerDuration,
    timerAutoStart,
    timerVisible,
    ttsEnabled,
  } = useSettingsStore();

  // NOTE: `roundsCount` is intentionally omitted here. During the setup phase,
  // SetupGate is the *sole writer* of `roundsCount` to game-store — it writes
  // the *effective* value (which may be downgraded from the user's raw setting
  // when the imported question set has fewer unique categories than requested).
  // If we also wrote the raw `roundsCount` here, the two effects would race and
  // `validateGameSetup`/`canStart` could observe an inconsistent value. See
  // BEA-713 for context.
  useEffect(() => {
    if (game.status === 'setup') {
      useGameStore.getState().updateSettings({
        questionsPerRound,
        timerDuration,
        timerAutoStart,
        timerVisible,
        ttsEnabled,
      });
    }
  }, [game.status, questionsPerRound, timerDuration, timerAutoStart, timerVisible, ttsEnabled]);

  /** Handle new game with confirmation */
  const handleNewGame = useCallback(() => {
    if (game.status === 'setup') return; // Already in setup
    setShowNewGameConfirm(true);
  }, [game.status]);

  const confirmNewGame = useCallback(() => {
    setShowNewGameConfirm(false);
    // Full reset: clear teams, scores, questions — back to a fresh setup
    const store = useGameStore.getState();
    store.resetGame();
    // Clear teams that resetGame preserves
    for (const team of useGameStore.getState().teams) {
      store.removeTeam(team.id);
    }
    store.setAudienceScene('waiting');
  }, []);

  /** Read revealPhase for sound triggers (T3.1) */
  const revealPhase = useGameStore((state) => state.revealPhase);

  /** BEA-600: Mount reveal sequence hook — drives 3-beat choreography on answer_reveal scene */
  const { triggerReveal, resetReveal } = useRevealSequence({
    questionIndex: game.displayQuestionIndex,
    revealedAnswer: game.displayQuestion?.correctAnswers[0] ?? null,
    onPhaseChange: (phase) => {
      useGameStore.getState().setRevealPhase(phase);
    },
  });

  /** BEA-600: Auto-trigger reveal when scene enters answer_reveal; reset on exit */
  useEffect(() => {
    if (audienceScene === 'answer_reveal') {
      triggerReveal();
    } else {
      resetReveal();
    }
  }, [audienceScene, triggerReveal, resetReveal]);

  /** Read timer state for sound triggers (BEA-583) */
  const timerIsRunning = useGameStore((state) => state.timer.isRunning);

  /** T3.1: Wire scene-aware game event sounds */
  useGameEventSounds({
    status: game.status,
    displayQuestionIndex: game.displayQuestionIndex,
    currentRound: game.currentRound,
    audienceScene,
    revealPhase,
    timerIsRunning,
  });

  /** Per-round scoring scene (BEA-662) */
  const isRoundScoringScene = audienceScene === 'round_scoring';

  /** Handle round scores submission from RoundScoringPanel */
  const handleRoundScoresSubmitted = useCallback((scores: Record<string, number>) => {
    useGameStore.getState().setRoundScores(scores);
    useGameStore.getState().advanceScene('advance');
  }, []);

  /** Sync round scoring progress to audience display */
  const handleRoundScoringProgress = useCallback((entries: Record<string, number>) => {
    useGameStore.getState().updateRoundScoringProgress(entries);
  }, []);

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

  const mainRef = useRef<HTMLDivElement>(null);

  // Focus main content when transitioning from setup to playing
  useEffect(() => {
    if (game.status === 'playing' && mainRef.current) {
      mainRef.current.focus();
    }
  }, [game.status]);

  return (
    <>
      {/* Skip links for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only skip-link focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>

      {/*
        Fixed-viewport 2-column layout during gameplay (Issue 6.5).
        Left rail: question navigator (w-64)
        Center: hero question panel (flex-1, max-w 64rem when not round_scoring)
        No viewport scrolling during gameplay.
        The center panel uses viewport-centered max-width (64rem) with asymmetric
        margins to appear centered on screen despite the left-only aside (w-64).
        Margins clamp to 0 on narrow screens so content fills available space.
        The round_scoring scene renders full-width (no max-w wrapper) so the
        side-by-side scoring form + Q&A reference layout has full space.
      */}
      <div
        id="main"
        data-settings-hydrated={settingsHydrated ? 'true' : undefined}
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

            {/* Open Display */}
            <Button onClick={openDisplay} variant="secondary" size="sm">
              Open Display
            </Button>

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

            {/* New Game */}
            {game.status !== 'setup' && (
              <button
                onClick={handleNewGame}
                className="min-w-[var(--size-touch)] min-h-[var(--size-touch)] flex items-center justify-center rounded-lg
                  text-foreground-secondary hover:text-destructive hover:bg-destructive/10
                  transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                title="New Game (R)"
                aria-label="Start new game"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.015 4.356v4.992" />
                </svg>
              </button>
            )}

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

        {/* ---- MAIN 2-COLUMN AREA ---- */}
        <div
          className="flex flex-1 overflow-hidden"
          aria-hidden={game.status === 'setup' ? true : undefined}
          inert={game.status === 'setup' ? true : undefined}
        >

          {/* LEFT RAIL: Question Navigator (w-64) */}
          <aside
            className="w-64 flex-shrink-0 border-r border-border overflow-y-auto bg-surface/40 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted"
            aria-label="Question navigator"
          >
            <div className="p-3">
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
          </aside>

          {/* CENTER: Hero Question Panel (flex-1) */}
          <main
            ref={mainRef}
            id="main-content"
            className={`flex-1 ${isRoundScoringScene ? 'overflow-hidden p-4' : 'overflow-y-auto p-4'}`}
            aria-label="Current question"
            tabIndex={-1}
          >
            {/* Round scoring: side-by-side layout (scoring form left, Q&A reference right) */}
            {isRoundScoringScene ? (
              <div className="flex gap-4 h-full">
                {/* Scoring form — fixed width left column */}
                <div className="w-[400px] shrink-0 overflow-y-auto">
                  <div className="bg-surface border border-border rounded-xl p-4 shadow-md">
                    <RoundScoringPanel
                      hideHeader
                      teams={game.teams}
                      currentRound={game.currentRound}
                      onSubmitScores={handleRoundScoresSubmitted}
                      onProgressChange={handleRoundScoringProgress}
                    />
                  </div>
                </div>
                {/* Q&A reference — flexible right column */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                  <div className="bg-surface border border-border rounded-xl p-4 shadow-md">
                    <RoundScoringView />
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="w-full"
                style={{
                  maxWidth: '64rem',
                  marginLeft: 'max(0px, calc(50% - 32rem - 8rem))',
                  marginRight: 'auto',
                }}
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

            {/* Scene navigation buttons (WU-03) + contextual action hint */}
            <div className="mb-4 px-1 flex flex-col gap-1.5">
              <SceneNavButtons />
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
                  <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">P</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-foreground-secondary">Toggle display</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">Space</kbd>
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

            {/* Re-open final results: shown when ended and overlay is dismissed */}
            {!showRoundSummary && game.status === 'ended' && (
              <div className="mt-4">
                <button
                  onClick={() => setShowRoundSummary(true)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium
                    bg-surface-elevated hover:bg-surface-hover text-foreground
                    border border-border transition-colors min-h-[44px]"
                >
                  View Final Results
                </button>
              </div>
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
                  onNextRound={game.status === 'ended' ? handleEndGameDismiss : handleNextRound}
                  onReviewAnswers={game.status === 'between_rounds' ? () => {
                    setShowRoundSummary(false);
                    useGameStore.getState().advanceScene('advance');
                  } : undefined}
                  onClose={() => setShowRoundSummary(false)}
                />
              </div>
            )}
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Setup Gate Overlay (z-40) */}
      {game.status === 'setup' && (
        <SetupGate
          isConnected={isConnected}
          onOpenDisplay={openDisplay}
          onStartGame={game.startGame}
        />
      )}

      {/* Modals */}
      <KeyboardShortcutsModal
        isOpen={game.showHelp}
        onClose={() => game.setShowHelp(false)}
      />
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
      />
      <SavePresetModal
        isOpen={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
      />
      <Modal
        isOpen={showNewGameConfirm}
        onClose={() => setShowNewGameConfirm(false)}
        title="Start New Game?"
        variant="danger"
        confirmLabel="New Game"
        onConfirm={confirmNewGame}
        size="sm"
      >
        <p className="text-sm text-foreground-secondary">
          This will end the current game and return to setup. All scores and progress will be lost.
        </p>
      </Modal>
    </>
  );
}
