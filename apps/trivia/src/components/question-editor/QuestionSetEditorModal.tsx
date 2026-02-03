'use client';

import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import type { TriviaQuestionSet, TriviaCategory } from '@beak-gaming/database/types';
import type { CategoryFormData } from './QuestionSetEditorModal.utils';
import { questionFormToTrivia, triviaToQuestionForm } from './QuestionSetEditorModal.utils';
import { RoundEditor } from './RoundEditor';

/**
 * QuestionSetEditorModal - Create or edit a question set
 *
 * Structure:
 * - Top level: Categories (+ Add Category button)
 * - Inside each category: Questions (+ Add Question button)
 *
 * Matches the nested JSON structure:
 * {
 *   name: string,
 *   description: string,
 *   categories: [{ id, name, questions: [...] }]
 * }
 */

// =============================================================================
// TYPES
// =============================================================================

interface EditorState {
  name: string;
  description: string;
  categories: CategoryFormData[];
}

type EditorAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'ADD_CATEGORY' }
  | { type: 'REMOVE_CATEGORY'; payload: number }
  | { type: 'UPDATE_CATEGORY'; payload: { index: number; category: CategoryFormData } }
  | { type: 'LOAD_QUESTION_SET'; payload: TriviaQuestionSet }
  | { type: 'RESET' };

interface QuestionSetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; categories: TriviaCategory[] }) => Promise<void>;
  questionSet?: TriviaQuestionSet | null; // If provided, edit mode
  title?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORY_OPTIONS = [
  { id: 'general_knowledge', name: 'General Knowledge' },
  { id: 'science', name: 'Science & Nature' },
  { id: 'history', name: 'History' },
  { id: 'geography', name: 'Geography' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'sports', name: 'Sports' },
  { id: 'art_literature', name: 'Art & Literature' },
];

// =============================================================================
// REDUCER
// =============================================================================

function createEmptyCategory(index: number): CategoryFormData {
  const category = CATEGORY_OPTIONS[index % CATEGORY_OPTIONS.length];
  return {
    id: category.id,
    name: category.name,
    questions: [],
  };
}

function createInitialState(): EditorState {
  return {
    name: '',
    description: '',
    categories: [createEmptyCategory(0)],
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.payload };

    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };

    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, createEmptyCategory(state.categories.length)],
      };

    case 'REMOVE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((_, i) => i !== action.payload),
      };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((cat, i) =>
          i === action.payload.index ? action.payload.category : cat
        ),
      };

    case 'LOAD_QUESTION_SET': {
      const qs = action.payload;
      return {
        name: qs.name,
        description: qs.description || '',
        categories: (qs.categories || []).map((cat) => ({
          id: cat.id,
          name: cat.name,
          questions: cat.questions.map(triviaToQuestionForm),
        })),
      };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function QuestionSetEditorModal({
  isOpen,
  onClose,
  onSave,
  questionSet,
  title,
}: QuestionSetEditorModalProps) {
  const [state, dispatch] = useReducer(editorReducer, null, createInitialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialStateRef = useRef<string>('');
  const hasCapturedInitialState = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!questionSet;
  const modalTitle = title || (isEditMode ? 'Edit Question Set' : 'Create Question Set');

  // Load question set when editing
  useEffect(() => {
    if (isOpen && questionSet) {
      dispatch({ type: 'LOAD_QUESTION_SET', payload: questionSet });
      hasCapturedInitialState.current = false;
    } else if (isOpen && !questionSet) {
      dispatch({ type: 'RESET' });
      hasCapturedInitialState.current = false;
    } else if (!isOpen) {
      // Reset capture flag when modal closes
      hasCapturedInitialState.current = false;
    }
  }, [isOpen, questionSet]);

  // Capture initial state once after state settles
  useEffect(() => {
    if (isOpen && !hasCapturedInitialState.current && state.name !== undefined) {
      // Small delay to ensure state has settled after loading
      const timer = setTimeout(() => {
        if (!hasCapturedInitialState.current) {
          initialStateRef.current = JSON.stringify(state);
          hasCapturedInitialState.current = true;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, state]);

  // Check if form has unsaved changes
  const isDirty = useCallback(() => {
    return JSON.stringify(state) !== initialStateRef.current;
  }, [state]);

  // Handle close with dirty check
  const handleClose = useCallback(() => {
    if (isDirty()) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  // Validate form
  const validate = useCallback((): string | null => {
    if (!state.name.trim()) {
      return 'Name is required';
    }

    if (state.categories.length === 0) {
      return 'At least one category is required';
    }

    for (let i = 0; i < state.categories.length; i++) {
      const cat = state.categories[i];
      if (cat.questions.length === 0) {
        return `Category "${cat.name}" must have at least one question`;
      }

      for (let j = 0; j < cat.questions.length; j++) {
        const q = cat.questions[j];
        if (!q.question.trim()) {
          return `Category "${cat.name}", Question ${j + 1}: Question text is required`;
        }
        if (q.options.some((opt) => !opt.trim())) {
          return `Category "${cat.name}", Question ${j + 1}: All options must have text`;
        }
      }
    }

    return null;
  }, [state]);

  // Handle save
  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert form data to TriviaCategory[]
      const categories: TriviaCategory[] = state.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        questions: cat.questions.map(questionFormToTrivia),
      }));

      await onSave({
        name: state.name.trim(),
        description: state.description.trim(),
        categories,
      });

      // Update initial state after successful save
      initialStateRef.current = JSON.stringify(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle add category
  const handleAddCategory = () => {
    dispatch({ type: 'ADD_CATEGORY' });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h1 id="editor-modal-title" className="text-2xl font-bold">
            {modalTitle}
          </h1>
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg" role="alert">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Name input */}
          <div className="space-y-2">
            <label htmlFor="qs-name" className="text-lg font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="qs-name"
              type="text"
              value={state.name}
              onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
              placeholder="e.g., History Trivia Night"
              className="w-full px-4 py-3 min-h-[var(--size-touch)] text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Description input */}
          <div className="space-y-2">
            <label htmlFor="qs-description" className="text-lg font-medium">
              Description
            </label>
            <textarea
              id="qs-description"
              value={state.description}
              onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
              placeholder="Optional description for this question set..."
              rows={2}
              className="w-full px-4 py-3 text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y"
            />
          </div>

          {/* Categories section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Categories ({state.categories.length})
              </h2>
            </div>

            {/* Categories list */}
            {state.categories.length > 0 ? (
              <div className="space-y-4">
                {state.categories.map((category, index) => (
                  <RoundEditor
                    key={index}
                    roundIndex={index}
                    round={category}
                    onUpdateRound={(updated) =>
                      dispatch({ type: 'UPDATE_CATEGORY', payload: { index, category: updated } })
                    }
                    onRemoveRound={() => dispatch({ type: 'REMOVE_CATEGORY', payload: index })}
                    canRemove={state.categories.length > 1}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-lg">
                <div className="text-4xl mb-3 opacity-20" aria-hidden="true">
                  📂
                </div>
                <p className="text-base text-muted-foreground">
                  No categories yet. Add your first category below.
                </p>
              </div>
            )}

            {/* Add category button */}
            <button
              type="button"
              onClick={handleAddCategory}
              className="w-full min-h-[var(--size-touch-lg)] px-4 py-4 text-lg font-semibold rounded-lg border-2 border-dashed border-primary text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">+</span>
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="min-h-[var(--size-touch)] px-6 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !state.name.trim()}
            className="min-h-[var(--size-touch)] px-6 py-2 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Question Set'}
          </button>
        </div>
      </div>
    </div>
  );
}
