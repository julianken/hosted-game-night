'use client';

import { useState } from 'react';
import { TriviaApiImporter } from './TriviaApiImporter';
import { QuestionSetImporter } from './QuestionSetImporter';
import { QuestionSetEditorModal } from '@/components/question-editor/QuestionSetEditorModal';

export interface EmptyStateOnboardingProps {
  onSuccess: () => void;
}

/**
 * Guided onboarding experience shown when the user has zero question sets.
 * Presents the API importer as the primary (recommended) path, with
 * file upload and manual creation as secondary alternatives.
 */
export function EmptyStateOnboarding({ onSuccess }: EmptyStateOnboardingProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Get Started with Trivia Questions</h2>
        <p className="text-base text-muted-foreground">
          The fastest way to get playing is to fetch questions from our free trivia database.
        </p>
      </div>

      {/* Primary card -- API importer */}
      <div className="border-2 border-primary bg-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold">Fetch from Trivia Database</h3>
          <span
            className="bg-primary/15 text-primary rounded-full px-3 py-1 text-sm font-semibold"
            aria-label="Recommended method"
          >
            RECOMMENDED
          </span>
        </div>
        <p className="text-base text-muted-foreground mb-5">
          Get questions instantly from thousands of trivia questions across 7 categories.
          Free, no account needed.
        </p>
        <TriviaApiImporter context="management" onSaveSuccess={onSuccess} />
      </div>

      {/* Secondary methods heading */}
      <p className="text-lg font-semibold text-muted-foreground">Other ways to add questions</p>

      {/* Secondary method cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload a File card */}
        <div className="border border-border bg-card rounded-xl p-5 flex flex-col min-h-[160px]">
          <h3 className="text-lg font-semibold mb-2">Upload a File</h3>
          <p className="text-base text-muted-foreground mb-4 flex-1">
            Import questions from a JSON file you already have prepared.
          </p>
          {showUpload ? (
            <div className="mt-2">
              <QuestionSetImporter
                onImportSuccess={() => {
                  setShowUpload(false);
                  onSuccess();
                }}
              />
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="mt-3 min-h-[44px] px-4 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors w-full"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="min-h-[44px] px-4 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              Upload JSON File
            </button>
          )}
        </div>

        {/* Create Manually card */}
        <div className="border border-border bg-card rounded-xl p-5 flex flex-col min-h-[160px]">
          <h3 className="text-lg font-semibold mb-2">Create Manually</h3>
          <p className="text-base text-muted-foreground mb-4 flex-1">
            Write your own trivia questions one by one. Best for custom or specialized content.
          </p>
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="min-h-[44px] px-4 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            Create Question Set
          </button>
        </div>
      </div>

      {/* Question Set Editor Modal */}
      <QuestionSetEditorModal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onSuccess={() => {
          setShowEditor(false);
          onSuccess();
        }}
      />
    </div>
  );
}
