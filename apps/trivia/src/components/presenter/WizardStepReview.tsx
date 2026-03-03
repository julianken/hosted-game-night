'use client';

/**
 * T4.5: WizardStepReview
 *
 * Step 4 (index 3) of the SetupWizard. Review/summary step showing:
 * - Validation status banner (red/amber/green)
 * - Validation issues list
 * - Per-round question grid
 * - Settings summary
 * - Teams pills
 * - "Edit" deep-links back to previous steps
 * - Save Template + Start Game buttons
 */

import type { GameSetupValidation } from '@/lib/game/selectors';
import type { Team, Question } from '@/types';

export interface WizardStepReviewProps {
  validation: GameSetupValidation;
  canStart: boolean;
  questions: Question[];
  teams: Team[];
  roundsCount: number;
  questionsPerRound: number;
  timerDuration: number;
  onGoToStep: (step: number) => void;
  onSaveTemplate: () => void;
  onStartGame: () => void;
}

export function WizardStepReview({
  validation,
  canStart,
  questions,
  teams,
  roundsCount,
  questionsPerRound,
  timerDuration,
  onGoToStep,
  onSaveTemplate,
  onStartGame,
}: WizardStepReviewProps) {
  return (
    <div className="space-y-4" data-testid="wizard-step-review">
      {/* Status banner */}
      {validation.blockCount > 0 ? (
        <div className="px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl">
          <p className="text-sm font-semibold text-destructive">
            Cannot start &mdash; {validation.blockCount} issue{validation.blockCount !== 1 ? 's' : ''} to fix
          </p>
        </div>
      ) : validation.warnCount > 0 ? (
        <div className="px-4 py-3 bg-warning/10 border border-warning/30 rounded-xl">
          <p className="text-sm font-semibold text-warning">
            Ready with {validation.warnCount} warning{validation.warnCount !== 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <div className="px-4 py-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm font-semibold text-success">
            Ready to start!
          </p>
        </div>
      )}

      {/* Validation issues list */}
      {validation.issues.length > 0 && (
        <div className="space-y-1.5">
          {validation.issues.map((issue) => (
            <div
              key={issue.id + (issue.roundIndex !== undefined ? `-r${issue.roundIndex}` : '')}
              className={`px-3 py-2 rounded-lg text-sm ${
                issue.severity === 'block'
                  ? 'bg-destructive/5 text-destructive'
                  : 'bg-warning/5 text-warning'
              }`}
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Per-round question grid */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Questions</h3>
          <button
            type="button"
            onClick={() => onGoToStep(0)}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            data-testid="review-edit-questions"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: roundsCount }, (_, i) => {
            const count = questions.filter((q) => q.roundIndex === i).length;
            const isMatch = count === questionsPerRound;
            return (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isMatch
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                }`}
              >
                Round {i + 1}: {count} question{count !== 1 ? 's' : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings summary */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Settings</h3>
          <button
            type="button"
            onClick={() => onGoToStep(1)}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            data-testid="review-edit-settings"
          >
            Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-secondary">
          <span>
            <span className="font-medium text-foreground">{timerDuration}s</span> timer
          </span>
          <span>
            <span className="font-medium text-foreground">{roundsCount}</span> round{roundsCount !== 1 ? 's' : ''}
          </span>
          <span>
            <span className="font-medium text-foreground">{questionsPerRound}</span> questions/round
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Teams</h3>
          <button
            type="button"
            onClick={() => onGoToStep(2)}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            data-testid="review-edit-teams"
          >
            Edit
          </button>
        </div>
        {teams.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {teams.map((team) => (
              <span
                key={team.id}
                className="px-2.5 py-1 text-xs font-medium bg-surface-elevated border border-border rounded-full text-foreground"
              >
                {team.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-destructive font-medium">No teams added</p>
        )}
      </div>

      {/* Bottom action row: Save Template + Start Game */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          type="button"
          onClick={onSaveTemplate}
          disabled={questions.length === 0}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]
            ${questions.length > 0
              ? 'bg-secondary hover:bg-secondary-hover text-secondary-foreground'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          aria-disabled={questions.length === 0}
        >
          Save Template
        </button>
        <button
          type="button"
          onClick={onStartGame}
          disabled={!canStart}
          className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px]
            ${canStart
              ? 'bg-success hover:bg-success/90 text-success-foreground'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          aria-disabled={!canStart}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
