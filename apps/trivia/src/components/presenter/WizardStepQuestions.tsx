'use client';

/**
 * T4.2: WizardStepQuestions
 *
 * Step 1 of the SetupWizard. Handles all question content setup:
 * CSV/JSON import, question set selection, API importer, category filter,
 * question count display, and save-as-set button.
 */

import { useState } from 'react';
import { QuestionImporter } from '@/components/presenter/QuestionImporter';
import { QuestionSetSelector } from '@/components/presenter/QuestionSetSelector';
import { TriviaApiImporter } from '@/components/presenter/TriviaApiImporter';
import { CategoryFilterCompact } from '@/components/presenter/CategoryFilter';
import type { QuestionCategory } from '@/types';
import type { Question } from '@/types';

export interface WizardStepQuestionsProps {
  questions: Question[];
  onImport: (questions: Question[], mode?: 'replace' | 'append') => void;
  selectedCategories: QuestionCategory[];
  onCategoryChange: (categories: QuestionCategory[]) => void;
  onSaveQuestionSet: () => void;
}

export function WizardStepQuestions({
  questions,
  onImport,
  selectedCategories,
  onCategoryChange,
  onSaveQuestionSet,
}: WizardStepQuestionsProps) {
  const [showApiImporter, setShowApiImporter] = useState(false);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Questions</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Import or select your trivia questions
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

      {/* CSV / JSON Import */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Import Questions</h3>
        <QuestionImporter status="setup" onImport={onImport} />
      </div>

      {/* Question Set Selector */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Load from Saved Set</h3>
        <QuestionSetSelector disabled={false} />
      </div>

      {/* Trivia API Importer (collapsible) */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowApiImporter((prev) => !prev)}
          aria-expanded={showApiImporter}
          className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between
            text-sm font-medium text-left hover:bg-surface-hover transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span>Fetch from Trivia API</span>
          <span aria-hidden="true" className="text-foreground-secondary text-xs">
            {showApiImporter ? 'Hide' : 'Show'}
          </span>
        </button>
        {showApiImporter && (
          <div className="border-t border-border p-4">
            <TriviaApiImporter disabled={false} />
          </div>
        )}
      </div>

      {/* Category Filter */}
      {questions.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Filter by Category</h3>
          <CategoryFilterCompact
            selectedCategories={selectedCategories}
            onCategoryChange={onCategoryChange}
            questions={questions}
          />
        </div>
      )}

      {/* Save Questions as Set */}
      <button
        onClick={onSaveQuestionSet}
        disabled={questions.length === 0}
        className={`w-full px-4 py-3 rounded-xl text-sm font-medium
          transition-colors duration-200 min-h-[44px]
          ${questions.length > 0
            ? 'bg-primary hover:bg-primary-hover text-primary-foreground'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          }`}
        aria-disabled={questions.length === 0}
      >
        Save Questions as Set
      </button>
    </div>
  );
}
