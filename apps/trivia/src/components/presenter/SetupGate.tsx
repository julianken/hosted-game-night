'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSettingsStore, SETTINGS_RANGES } from '@/stores/settings-store';
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

  // Settings store
  const {
    roundsCount,
    lastTeamSetup,
    updateSetting,
  } = useSettingsStore();
  const isByCategory = useSettingsStore((s) => s.isByCategory);

  // Game store actions
  const redistributeQuestions = useGameStore((s) => s.redistributeQuestions);
  const updateGameSettings = useGameStore((s) => s.updateSettings);

  // Sync settings store → game store so validation reads the current roundsCount.
  // The settings store is the source of truth during setup; the game store needs
  // its copy updated for validateGameSetup to work correctly.
  useEffect(() => {
    updateGameSettings({ roundsCount });
  }, [roundsCount, updateGameSettings]);

  // Redistribute questions whenever the question list or distribution settings change.
  // redistributeQuestions is a Zustand action (stable reference).
  // The engine's idempotency contract (same-reference return) prevents feedback loops.
  useEffect(() => {
    redistributeQuestions(
      roundsCount,
      isByCategory ? 'by_category' : 'by_count'
    );
  }, [questions, roundsCount, isByCategory, redistributeQuestions]);

  // Derive per-round breakdown for display in settings and review steps.
  const perRoundBreakdown: PerRoundBreakdown[] = useMemo(
    () => derivePerRoundBreakdown(questions, roundsCount, isByCategory),
    [questions, roundsCount, isByCategory]
  );

  // Count unique categories (stable: doesn't change when only roundIndex changes)
  const uniqueCategoryCount = useMemo(
    () => (questions.length > 0 ? getUniqueCategories(questions).length : 0),
    [questions]
  );

  // By-category mode is only available with ≤ 4 unique categories.
  // Auto-disable if questions change and now have too many categories.
  const canUseByCategory = uniqueCategoryCount > 0 && uniqueCategoryCount <= 4;

  useEffect(() => {
    if (isByCategory && !canUseByCategory) {
      updateSetting('isByCategory', false);
    }
  }, [isByCategory, canUseByCategory, updateSetting]);

  // Auto-default roundsCount to category count when in by-category mode.
  // Fires when toggle changes or question set changes (new import).
  // Does NOT fire on redistribution (uniqueCategoryCount is stable across roundIndex changes).
  useEffect(() => {
    if (isByCategory && uniqueCategoryCount > 0) {
      const target = Math.min(uniqueCategoryCount, SETTINGS_RANGES.roundsCount.max);
      updateSetting('roundsCount', target);
    }
  }, [isByCategory, uniqueCategoryCount, updateSetting]);

  // Toggle the isByCategory setting
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
            roundsCount={roundsCount}
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
            isByCategory={isByCategory}
            canUseByCategory={canUseByCategory}
            perRoundBreakdown={perRoundBreakdown}
            onToggleByCategory={handleToggleByCategory}
          />
        </div>
      </div>
    </div>
  );
}
