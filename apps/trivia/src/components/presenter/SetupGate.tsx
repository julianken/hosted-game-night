'use client';

import { useState, useCallback } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSettingsStore } from '@/stores/settings-store';
import { SetupWizard } from '@/components/presenter/SetupWizard';

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
    questionsPerRound,
    lastTeamSetup,
    updateSetting,
  } = useSettingsStore();

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
            questionsPerRound={questionsPerRound}
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
          />
        </div>
      </div>
    </div>
  );
}
