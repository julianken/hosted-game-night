'use client';

/**
 * T4.4: WizardStepTeams
 *
 * Step 3 (index 2) of the SetupWizard. Team management:
 * TeamManager, quick-fill buttons, load/save team setup,
 * and readiness summary. Start Game and Save Template
 * have moved to WizardStepReview (step 4).
 */

import { TeamManager } from '@/components/presenter/TeamManager';
import type { Team } from '@/types';
import type { TeamSetup } from '@/stores/settings-store';

export interface WizardStepTeamsProps {
  teams: Team[];
  questionCount: number;
  roundsCount: number;
  lastTeamSetup: TeamSetup | null;
  onAddTeam: (name?: string) => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
  onLoadTeamsFromSetup: (names: string[]) => void;
  onSaveTeams: () => void;
}

const QUICK_FILL_OPTIONS = [
  { label: '4 Teams', count: 4 },
  { label: '6 Teams', count: 6 },
  { label: '8 Teams', count: 8 },
] as const;

function buildTableNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Table ${i + 1}`);
}

export function WizardStepTeams({
  teams,
  questionCount,
  roundsCount,
  lastTeamSetup,
  onAddTeam,
  onRemoveTeam,
  onRenameTeam,
  onLoadTeamsFromSetup,
  onSaveTeams,
}: WizardStepTeamsProps) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Teams</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Add teams and launch your game
        </p>
      </div>

      {/* Readiness summary */}
      <div className="px-4 py-3 bg-surface border border-border rounded-xl">
        <p className="text-sm text-foreground-secondary">
          <span className={questionCount > 0 ? 'text-success font-medium' : 'text-warning font-medium'}>
            {questionCount} question{questionCount !== 1 ? 's' : ''}
          </span>
          <span className="mx-2 text-border">·</span>
          <span className="font-medium text-foreground">{roundsCount} round{roundsCount !== 1 ? 's' : ''}</span>
          <span className="mx-2 text-border">·</span>
          <span className={teams.length > 0 ? 'text-success font-medium' : 'text-warning font-medium'}>
            {teams.length} team{teams.length !== 1 ? 's' : ''}
          </span>
        </p>
      </div>

      {/* Quick-fill buttons */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Fill</h3>
        <div className="flex gap-2 flex-wrap">
          {QUICK_FILL_OPTIONS.map(({ label, count }) => (
            <button
              key={count}
              type="button"
              onClick={() => onLoadTeamsFromSetup(buildTableNames(count))}
              className="px-4 py-2 rounded-lg text-sm font-medium
                bg-surface-elevated hover:bg-surface-hover text-foreground
                border border-border transition-colors min-h-[44px]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Load saved team setup */}
      {lastTeamSetup && lastTeamSetup.count > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Saved Teams</h3>
            <span className="text-xs text-foreground-secondary">
              {lastTeamSetup.count} team{lastTeamSetup.count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {lastTeamSetup.names.slice(0, 6).map((name, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-surface-elevated border border-border rounded-md text-foreground"
              >
                {name}
              </span>
            ))}
            {lastTeamSetup.names.length > 6 && (
              <span className="px-2 py-0.5 text-xs text-foreground-secondary">
                +{lastTeamSetup.names.length - 6} more
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onLoadTeamsFromSetup(lastTeamSetup.names)}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium
              bg-surface-elevated hover:bg-surface-hover text-foreground
              border border-border transition-colors min-h-[44px]"
          >
            Load Saved Teams
          </button>
        </div>
      )}

      {/* Team Manager */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <TeamManager
          teams={teams}
          status="setup"
          onAddTeam={onAddTeam}
          onRemoveTeam={onRemoveTeam}
          onRenameTeam={onRenameTeam}
        />
      </div>

      {/* Save current teams */}
      {teams.length > 0 && (
        <button
          type="button"
          onClick={onSaveTeams}
          className="w-full px-4 py-3 rounded-xl text-sm font-medium
            bg-surface-elevated hover:bg-surface-hover text-foreground
            border border-border transition-colors min-h-[44px]"
        >
          Save Current Team Setup
        </button>
      )}

    </div>
  );
}
