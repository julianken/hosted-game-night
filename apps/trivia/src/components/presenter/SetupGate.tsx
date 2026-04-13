'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSettingsStore } from '@/stores/settings-store';
import { getUniqueCategories } from '@/lib/categories';
import { SetupWizard } from '@/components/presenter/SetupWizard';
import { derivePerRoundBreakdown } from '@/lib/game/selectors';
import type { PerRoundBreakdown } from '@/types';

interface SetupGateProps {
  isConnected: boolean;
  onOpenDisplay: () => void;
  onStartGame: () => void;
}

export function SetupGate({
  isConnected,
  onOpenDisplay,
  onStartGame,
}: SetupGateProps) {
  const [isExiting, setIsExiting] = useState(false);

  // Game store selectors
  const questions = useGameStore((state) => state.questions);
  const teams = useGameStore((state) => state.teams);
  const addTeam = useGameStore((state) => state.addTeam);
  const removeTeam = useGameStore((state) => state.removeTeam);
  const renameTeam = useGameStore((state) => state.renameTeam);
  const loadTeamsFromSetup = useGameStore((state) => state.loadTeamsFromSetup);

  // Computed selectors
  const { canStart, validation } = useGameSelectors();

  // Settings store — these reflect persisted *user intent*. We never mutate
  // them on mount in response to question-derived state (that was the BEA-713
  // bug). Instead, we compute *effective* values below and pass those to the
  // wizard / engine sync so the user's saved preferences are preserved.
  const {
    roundsCount: userRoundsCount,
    lastTeamSetup,
    updateSetting,
  } = useSettingsStore();
  const userIsByCategory = useSettingsStore((s) => s.isByCategory);

  // Game store actions
  const redistributeQuestions = useGameStore((s) => s.redistributeQuestions);
  const updateGameSettings = useGameStore((s) => s.updateSettings);

  // Count unique categories (stable: doesn't change when only roundIndex changes)
  const uniqueCategoryCount = useMemo(
    () => (questions.length > 0 ? getUniqueCategories(questions).length : 0),
    [questions]
  );

  // By-category mode is only available with ≤ 4 unique categories.
  const canUseByCategory = uniqueCategoryCount > 0 && uniqueCategoryCount <= 4;

  // ---------------------------------------------------------------------------
  // Effective (derived) values — what the UI and engine actually use.
  //
  // `userIsByCategory` and `userRoundsCount` are never mutated by question
  // changes; we transparently downgrade them at render time when the imported
  // question set can't satisfy by-category mode (>4 categories) or has fewer
  // categories than the user's chosen rounds count.
  //
  // When the question set later supports the user's original intent again
  // (e.g. they reduce categories), the effective values automatically restore
  // — no migration step needed because the persisted state was never touched.
  // ---------------------------------------------------------------------------
  const effectiveIsByCategory = userIsByCategory && canUseByCategory;
  const effectiveRoundsCount = effectiveIsByCategory
    ? Math.min(uniqueCategoryCount, userRoundsCount)
    : userRoundsCount;

  // Sync settings store → game store so validation reads the *effective*
  // roundsCount (the value that matches what's actually distributed).
  useEffect(() => {
    updateGameSettings({ roundsCount: effectiveRoundsCount });
  }, [effectiveRoundsCount, updateGameSettings]);

  // Redistribute questions whenever the question list or *effective*
  // distribution settings change. redistributeQuestions is a Zustand action
  // (stable reference). The engine's idempotency contract (same-reference
  // return) prevents feedback loops.
  useEffect(() => {
    redistributeQuestions(
      effectiveRoundsCount,
      effectiveIsByCategory ? 'by_category' : 'by_count'
    );
  }, [questions, effectiveRoundsCount, effectiveIsByCategory, redistributeQuestions]);

  // Derive per-round breakdown for display in settings and review steps.
  // Uses *effective* values so the breakdown matches the actual distribution.
  const perRoundBreakdown: PerRoundBreakdown[] = useMemo(
    () => derivePerRoundBreakdown(questions, effectiveRoundsCount, effectiveIsByCategory),
    [questions, effectiveRoundsCount, effectiveIsByCategory]
  );

  // Toggle the isByCategory setting — this is a user-initiated mutation and
  // is the *only* path through which `isByCategory` gets written to settings
  // from this component.
  const handleToggleByCategory = useCallback(
    (value: boolean) => updateSetting('isByCategory', value),
    [updateSetting]
  );

  // Two-phase exit: fade out then call onStartGame
  const handleStartGame = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onStartGame();
    }, 200);
  }, [onStartGame]);

  return (
    <div
      data-testid="setup-gate"
      className={`fixed inset-0 z-40 bg-background flex flex-col transition-opacity duration-200 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Header */}
      <header
        data-testid="setup-gate-header"
        className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-surface/80"
        style={{ backdropFilter: 'blur(8px)', height: '56px' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Trivia
          </h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/15 text-primary" style={{ letterSpacing: '0.08em' }}>
            Setup
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection dot */}
          <div data-testid="setup-gate-connection" className="flex items-center gap-2" title={isConnected ? 'Sync active' : 'Sync not active'}>
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-success' : 'bg-muted-foreground'}`} aria-hidden="true" />
          </div>
          {/* Open Display */}
          <button
            data-testid="setup-gate-open-display"
            onClick={onOpenDisplay}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-elevated hover:bg-surface-hover text-foreground border border-border transition-colors min-h-[44px]"
          >
            Open Display
          </button>
        </div>
      </header>

      {/* Scrollable content area */}
      <div data-testid="setup-gate-content" className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4">
          <SetupWizard
            questions={questions}
            roundsCount={effectiveRoundsCount}
            lastTeamSetup={lastTeamSetup}
            currentTeams={teams}
            onUpdateSetting={updateSetting}
            validation={validation}
            canStart={canStart}
            onAddTeam={addTeam}
            onRemoveTeam={removeTeam}
            onRenameTeam={renameTeam}
            onLoadTeamsFromSetup={loadTeamsFromSetup}
            onStartGame={handleStartGame}
            isByCategory={effectiveIsByCategory}
            canUseByCategory={canUseByCategory}
            perRoundBreakdown={perRoundBreakdown}
            onToggleByCategory={handleToggleByCategory}
          />
        </div>
      </div>
    </div>
  );
}
