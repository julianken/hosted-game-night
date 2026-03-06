'use client';

/**
 * T4.3: WizardStepSettings
 *
 * Step 2 of the SetupWizard. Handles game settings:
 * rounds configuration.
 *
 * Fully presentational — zero store access, zero hooks, zero effects.
 * Supports three render states:
 *   A) isByCategory=false → toggle + Rounds slider only
 *   B) isByCategory=true, questions loaded → toggle + Rounds slider + category badge pills
 *   C) isByCategory=true, no questions → toggle + Rounds slider + empty-state message
 */

import { Slider, Toggle } from '@joolie-boolie/ui';
import { SETTINGS_RANGES } from '@/stores/settings-store';
import type { SettingsState } from '@/stores/settings-store';
import type { PerRoundBreakdown } from '@/types';
import { getCategoryName, getCategoryBadgeClasses } from '@/lib/categories';

export interface WizardStepSettingsProps {
  roundsCount: number;
  isByCategory: boolean;
  canUseByCategory: boolean;
  perRoundBreakdown: PerRoundBreakdown[];
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onToggleByCategory: (isByCategory: boolean) => void;
}

export function WizardStepSettings({
  roundsCount,
  isByCategory,
  canUseByCategory,
  perRoundBreakdown,
  onUpdateSetting,
  onToggleByCategory,
}: WizardStepSettingsProps) {
  // Determine which state we're in
  const firstRound = perRoundBreakdown[0];
  const hasBreakdown = !!firstRound && firstRound.categories.length > 0;

  // Total questions across all rounds
  const totalQuestions = perRoundBreakdown.reduce((sum, r) => sum + r.totalCount, 0);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Configure rounds and questions
        </p>
      </div>

      {/* Game Configuration */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-6">
        {/* By Category toggle — only shown when ≤ 4 unique categories */}
        {canUseByCategory && (
          <Toggle
            checked={isByCategory}
            onChange={onToggleByCategory}
            label="By Category"
          />
        )}

        {/* Rounds slider — always visible */}
        <Slider
          value={roundsCount}
          onChange={(value) => onUpdateSetting('roundsCount', value)}
          min={SETTINGS_RANGES.roundsCount.min}
          max={SETTINGS_RANGES.roundsCount.max}
          step={1}
          label="Number of Rounds"
        />

        {/* Questions-per-round hint (shown in by-count mode when questions are loaded) */}
        {!isByCategory && totalQuestions > 0 && (
          <p className="text-sm text-foreground-secondary">
            ~{Math.ceil(totalQuestions / roundsCount)} questions per round
          </p>
        )}

        {/* State B: Per-round breakdown (By Category, questions loaded) */}
        {isByCategory && hasBreakdown && (
          <div className="space-y-3">
            <p className="text-sm text-foreground-secondary">
              {roundsCount} {roundsCount === 1 ? 'round' : 'rounds'} &bull; {totalQuestions}{' '}
              {totalQuestions === 1 ? 'question' : 'questions'}
            </p>
            <div className="flex flex-col gap-1.5">
              {perRoundBreakdown.map((round) => {
                const cat = round.categories[0];
                const badgeClasses = cat
                  ? getCategoryBadgeClasses(cat.categoryId)
                  : '';
                const label = cat
                  ? getCategoryName(cat.categoryId)
                  : 'Empty';
                return (
                  <div
                    key={round.roundIndex}
                    className={[
                      'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium border',
                      cat ? badgeClasses : 'bg-surface-elevated border-border text-foreground-secondary',
                    ].join(' ')}
                  >
                    <span>
                      <span className="opacity-70">Round {round.roundIndex + 1}</span>{' '}
                      &mdash; {label}
                    </span>
                    <span>{round.totalCount} question{round.totalCount !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* State C: Empty state (By Category, no questions) */}
        {isByCategory && !hasBreakdown && (
          <p className="text-sm text-foreground-secondary">
            No questions imported yet. Import questions in Step 1 to see the breakdown.
          </p>
        )}
      </div>
    </div>
  );
}
