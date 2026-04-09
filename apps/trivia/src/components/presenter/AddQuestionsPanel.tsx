'use client';

import { useId, useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useToast } from '@joolie-boolie/ui';
import { triviaQuestionsToQuestions } from '@/lib/questions/conversion';
import { TriviaApiImporter } from './TriviaApiImporter';
import { QuestionSetImporter } from './QuestionSetImporter';
import { QuestionSetEditorModal } from '@/components/question-editor/QuestionSetEditorModal';
import type { TriviaQuestion } from '@/types/trivia-question';

type TabId = 'api' | 'upload' | 'manual';

const TABS: { id: TabId; label: string; shortLabel: string }[] = [
  { id: 'api', label: 'Fetch from API', shortLabel: 'API' },
  { id: 'upload', label: 'Upload File', shortLabel: 'Upload' },
  { id: 'manual', label: 'Create Manually', shortLabel: 'Manual' },
];

export interface AddQuestionsPanelProps {
  defaultTab?: TabId;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Tabbed panel for adding questions via three methods:
 * - Fetch from API (default, pre-selected)
 * - Upload File (JSON import)
 * - Create Manually (opens modal editor)
 *
 * Uses proper ARIA tab semantics for accessibility.
 */
export function AddQuestionsPanel({
  defaultTab = 'api',
  onClose,
  onSuccess,
}: AddQuestionsPanelProps) {
  const tablistId = useId();
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [showEditor, setShowEditor] = useState(false);
  const tabRefs = useRef<Map<TabId, HTMLButtonElement | null>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);

  const importQuestions = useGameStore((state) => state.importQuestions);
  const { success } = useToast();

  // Focus first tab on mount
  useEffect(() => {
    const firstTab = tabRefs.current.get(defaultTab);
    firstTab?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTabRef = useCallback(
    (tabId: TabId) => (el: HTMLButtonElement | null) => {
      tabRefs.current.set(tabId, el);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      let newIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft') {
        newIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        newIndex = 0;
      } else if (e.key === 'End') {
        newIndex = TABS.length - 1;
      }

      if (newIndex !== null) {
        e.preventDefault();
        const newTab = TABS[newIndex];
        setActiveTab(newTab.id);
        tabRefs.current.get(newTab.id)?.focus();
      }
    },
    [activeTab]
  );

  const handleEditorSave = useCallback(
    (questions: TriviaQuestion[]) => {
      // Convert TriviaQuestion[] -> Question[] and import into game
      const appQuestions = triviaQuestionsToQuestions(questions);
      importQuestions(appQuestions, 'replace');
      success(`Loaded ${questions.length} questions into game`);
      setShowEditor(false);
      onSuccess();
      onClose();
    },
    [importQuestions, success, onSuccess, onClose]
  );

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden mb-8">
      {/* Header with close button */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-lg font-semibold">Add Questions</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close add questions panel"
        >
          <span aria-hidden="true" className="text-xl leading-none">&times;</span>
        </button>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Question import methods"
        id={tablistId}
        className="flex border-b border-border px-2"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={setTabRef(tab.id)}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`
                min-h-[44px] px-5 py-3 text-base font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset
                ${isActive
                  ? 'border-b-2 border-primary text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
                }
              `}
            >
              {/* Full label on md+, short label on mobile */}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden" aria-label={tab.label}>{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div ref={panelRef} className="p-5">
        {/* API tab */}
        <div
          role="tabpanel"
          id="tabpanel-api"
          aria-labelledby="tab-api"
          hidden={activeTab !== 'api'}
        >
          {activeTab === 'api' && (
            <TriviaApiImporter
              onLoadSuccess={() => {
                onSuccess();
                onClose();
              }}
            />
          )}
        </div>

        {/* Upload tab */}
        <div
          role="tabpanel"
          id="tabpanel-upload"
          aria-labelledby="tab-upload"
          hidden={activeTab !== 'upload'}
        >
          {activeTab === 'upload' && (
            <QuestionSetImporter
              onImportSuccess={() => {
                onSuccess();
                onClose();
              }}
            />
          )}
        </div>

        {/* Manual tab */}
        <div
          role="tabpanel"
          id="tabpanel-manual"
          aria-labelledby="tab-manual"
          hidden={activeTab !== 'manual'}
        >
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <p className="text-base text-muted-foreground">
                Create questions from scratch. Write your own trivia questions one by one,
                organized into rounds.
              </p>
              <button
                type="button"
                onClick={() => setShowEditor(true)}
                className="min-h-[44px] px-5 py-2 text-base font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create Questions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Question Editor Modal */}
      <QuestionSetEditorModal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleEditorSave}
      />
    </div>
  );
}
