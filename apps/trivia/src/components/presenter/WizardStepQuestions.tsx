'use client';

/**
 * T4.2: WizardStepQuestions
 *
 * Step 1 of the SetupWizard. Handles question content setup
 * via the Trivia API importer.
 */

import { TriviaApiImporter } from '@/components/presenter/TriviaApiImporter';
import type { Question } from '@/types';

export interface WizardStepQuestionsProps {
  questions: Question[];
}

export function WizardStepQuestions({
  questions,
}: WizardStepQuestionsProps) {

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Questions</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Fetch from our trivia database
        </p>
      </div>

      {/* Question count summary */}
      {questions.length > 0 && (
        <div className="px-4 py-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm font-medium text-success">
            {questions.length} question{questions.length !== 1 ? 's' : ''} loaded
          </p>
        </div>
      )}

      {/* Trivia API Importer (primary, always visible) */}
      <div className="bg-surface border-2 border-primary rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
            RECOMMENDED
          </span>
        </div>
        <TriviaApiImporter disabled={false} />
      </div>
    </div>
  );
}
