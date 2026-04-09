'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTriviaQuestionSetStore } from '@/stores/question-set-store';
import type { TriviaQuestionSetItem } from '@/stores/question-set-store';
import type { TriviaQuestion } from '@/types/trivia-question';
import { EmptyStateOnboarding } from '@/components/presenter/EmptyStateOnboarding';
import { AddQuestionsPanel } from '@/components/presenter/AddQuestionsPanel';
import { QuestionSetEditorModal } from '@/components/question-editor/QuestionSetEditorModal';
import {
  getCategoryStatistics,
  getCategoryBadgeClasses,
} from '@/lib/categories';
import { triviaQuestionsToQuestions } from '@/lib/questions/conversion';

export default function QuestionSetsPage() {
  const questionSets = useTriviaQuestionSetStore((state) => state.items);
  const removeQuestionSet = useTriviaQuestionSetStore((state) => state.remove);
  const updateQuestionSet = useTriviaQuestionSetStore((state) => state.update);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestionSetId, setEditingQuestionSetId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleRename = (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    updateQuestionSet(id, { name: editingName.trim() });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    removeQuestionSet(id);
    setDeletingId(null);
  };

  const handleEdit = (id: string) => {
    setEditingQuestionSetId(id);
    setShowEditor(true);
  };

  const handleEditorSuccess = () => {
    setToast({ message: 'Question set saved successfully', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = (qs: TriviaQuestionSetItem) => {
    const exportData = {
      name: qs.name,
      description: qs.description ?? '',
      questions: qs.questions.map((tq: TriviaQuestion) => ({
        text: tq.question,
        options: tq.options,
        correctAnswer: tq.options[tq.correctIndex],
        category: tq.category ?? 'general_knowledge',
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${qs.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCategoryStatistics>>();
    for (const qs of questionSets) {
      const appQuestions = triviaQuestionsToQuestions(qs.questions);
      map.set(qs.id, getCategoryStatistics(appQuestions));
    }
    return map;
  }, [questionSets]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasQuestionSets = questionSets.length > 0;
  const isEmpty = questionSets.length === 0;

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            {hasQuestionSets ? 'My Question Sets' : 'Question Sets'}
          </h1>
          {hasQuestionSets && (
            <span className="text-base font-medium px-2 py-0.5 rounded-full bg-muted">
              {questionSets.length} set{questionSets.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {hasQuestionSets && (
            <button
              type="button"
              onClick={() => setShowAddPanel(!showAddPanel)}
              className="inline-flex items-center min-h-[44px] px-5 py-2 text-base font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {showAddPanel ? 'Hide Panel' : '+ Add Questions'}
            </button>
          )}
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] px-5 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* Empty state -- guided onboarding */}
      {isEmpty && (
        <EmptyStateOnboarding
          onSuccess={() => {
            setToast({ message: 'Question set saved successfully', type: 'success' });
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}

      {/* Has question sets -- add panel + grid */}
      {hasQuestionSets && (
        <>
          {/* Add Questions Panel (tabbed) */}
          {showAddPanel && (
            <AddQuestionsPanel
              onClose={() => setShowAddPanel(false)}
              onSuccess={() => {
                setToast({ message: 'Question set saved successfully', type: 'success' });
                setTimeout(() => setToast(null), 3000);
              }}
            />
          )}

          {/* Question set grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionSets.map((qs) => (
              <div
                key={qs.id}
                className="p-5 border border-border rounded-xl bg-card hover:shadow-md transition-shadow"
              >
                {/* Name */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  {editingId === qs.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(qs.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleRename(qs.id)}
                      autoFocus
                      className="flex-1 px-2 py-1 min-h-[44px] text-xl font-semibold border border-border rounded-lg bg-background"
                      aria-label="Rename question set"
                    />
                  ) : (
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {qs.name}
                      {qs.is_default && (
                        <span className="text-base font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          (Default)
                        </span>
                      )}
                    </h2>
                  )}
                </div>

                {/* Description */}
                {qs.description && (
                  <p className="text-base text-muted-foreground mb-3 line-clamp-2">
                    {qs.description}
                  </p>
                )}

                {/* Question count */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-base font-medium px-2 py-0.5 rounded-full bg-muted">
                    {qs.questions.length} question{qs.questions.length !== 1 ? 's' : ''}
                  </span>

                  {/* Category badges */}
                  {(categoryStatsMap.get(qs.id) ?? []).slice(0, 4).map((stat) => (
                    <span
                      key={stat.categoryId}
                      className={`text-base px-2 py-0.5 rounded-full border ${getCategoryBadgeClasses(stat.categoryId)}`}
                    >
                      {stat.categoryName} ({stat.questionCount})
                    </span>
                  ))}
                </div>

                {/* Created date */}
                <p className="text-base text-muted-foreground mb-4">
                  Created {formatDate(qs.created_at)}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(qs.id)}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    aria-label={`Edit ${qs.name}`}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(qs.id);
                      setEditingName(qs.name);
                    }}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    aria-label={`Rename ${qs.name}`}
                    title="Rename"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(qs)}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    aria-label={`Export ${qs.name}`}
                    title="Export as JSON"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(qs.id)}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 text-base font-medium rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
                    aria-label={`Delete ${qs.name}`}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>

                {/* Delete confirmation */}
                {deletingId === qs.id && (
                  <div className="mt-3 p-3 border border-red-300 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
                    <p className="text-base font-medium mb-2">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(qs.id)}
                        className="min-h-[44px] px-4 py-2 text-base font-medium rounded-lg bg-error text-white hover:bg-error/90 transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="min-h-[44px] px-4 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg border ${
            toast.type === 'success'
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-error/10 border-error/20 text-error'
          }`}
        >
          <p className="text-base font-medium">{toast.message}</p>
        </div>
      )}

      {/* Question Set Editor Modal (for editing existing sets) */}
      <QuestionSetEditorModal
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingQuestionSetId(null);
        }}
        onSuccess={handleEditorSuccess}
        questionSetId={editingQuestionSetId ?? undefined}
      />
    </main>
  );
}
