'use client';

import { useId, useReducer, useState, useEffect, useRef } from 'react';
import { Modal } from '@joolie-boolie/ui';
import { useToast } from '@joolie-boolie/ui';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import type { QuestionCategory } from '@/types';
import type { TriviaQuestion } from '@/types/trivia-question';
import { useTriviaQuestionSetStore } from '@/stores/question-set-store';
import type { TriviaQuestionSetItem } from '@/stores/question-set-store';
import {
  editorReducer,
  createInitialState,
  type QuestionFormData,
  type CategoryFormData,
  type EditorState,
} from './QuestionSetEditorModal.utils';
import { DiscardChangesDialog } from './DiscardChangesDialog';

export interface QuestionSetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  questionSetId?: string;
}

/**
 * Modal for creating/editing question sets with nested categories and questions.
 * Uses useReducer for complex nested state management.
 * Categories = Rounds (category index = round number).
 */
export function QuestionSetEditorModal({
  isOpen,
  onClose,
  onSuccess,
  questionSetId,
}: QuestionSetEditorModalProps) {
  const nameId = useId();
  const descriptionId = useId();
  const { success, error: errorToast } = useToast();

  const [state, dispatch] = useReducer(editorReducer, createInitialState());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Track initial state for dirty detection
  const initialStateRef = useRef<EditorState>(createInitialState());

  // Compute dirty state (has changes from initial)
  const isDirty = JSON.stringify(state) !== JSON.stringify(initialStateRef.current);

  // Reset to fresh state when modal opens in create mode
  useEffect(() => {
    if (isOpen && !questionSetId) {
      const freshState = createInitialState();
      dispatch({ type: 'RESET', payload: freshState });
      initialStateRef.current = freshState;
      setExpandedCategories(new Set());
      setError(null);
    }
  }, [isOpen, questionSetId]);

  // Read store for loading/saving
  const questionSetItems = useTriviaQuestionSetStore((state) => state.items);
  const questionSetStoreUpdate = useTriviaQuestionSetStore((state) => state.update);
  const questionSetStoreCreate = useTriviaQuestionSetStore((state) => state.create);

  // Load existing question set data when in edit mode
  useEffect(() => {
    if (!isOpen || !questionSetId) {
      return;
    }

    const loadQuestionSet = () => {
      setIsLoading(true);
      setError(null);

      try {
        const questionSet: TriviaQuestionSetItem | undefined = questionSetItems.find(
          (item) => item.id === questionSetId
        );

        if (!questionSet) {
          throw new Error('Question set not found');
        }

        // Convert TriviaQuestionSet to EditorState
        const categoriesMap = new Map<QuestionCategory, CategoryFormData>();

        for (const tq of questionSet.questions) {
          // Ensure category is a valid QuestionCategory type
          const rawCategory = tq.category ?? 'general_knowledge';
          const category = DEFAULT_CATEGORIES.find((c) => c.id === rawCategory);
          const categoryId: QuestionCategory = category?.id ?? 'general_knowledge';

          if (!categoriesMap.has(categoryId)) {
            categoriesMap.set(categoryId, {
              id: categoryId,
              name: category?.name ?? 'General Knowledge',
              questions: [],
            });
          }

          const questionFormData: QuestionFormData = {
            id: `q-${Date.now()}-${Math.random()}`,
            question: tq.question,
            type: 'multiple_choice',
            options: [...tq.options],
            correctIndex: tq.correctIndex,
            category: categoryId,
            explanation: tq.explanation ?? '',
          };

          categoriesMap.get(categoryId)!.questions.push(questionFormData);
        }

        const loadedState = createInitialState({
          name: questionSet.name,
          description: questionSet.description ?? '',
          categories: Array.from(categoriesMap.values()),
        });

        dispatch({ type: 'RESET', payload: loadedState });
        // Store initial state for dirty detection
        initialStateRef.current = loadedState;

        // Auto-expand all categories
        setExpandedCategories(new Set(Array.from({ length: categoriesMap.size }, (_, i) => i)));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load question set';
        setError(message);
        errorToast(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestionSet();
  }, [isOpen, questionSetId, questionSetItems, errorToast]);

  // Browser beforeunload warning when dirty
  useEffect(() => {
    if (!isOpen || !isDirty) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers require returnValue to be set
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, isDirty]);

  // Available categories for selection (not yet added)
  const availableCategories = DEFAULT_CATEGORIES.filter(
    (cat) => !state.categories.some((c) => c.id === cat.id)
  );

  const toggleCategory = (index: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddCategory = (categoryId: QuestionCategory) => {
    const category = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
    if (category) {
      dispatch({
        type: 'ADD_CATEGORY',
        payload: { id: category.id, name: category.name },
      });
      // Auto-expand the newly added category
      setExpandedCategories((prev) => new Set([...prev, state.categories.length]));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!state.name.trim()) {
      setError('Question set name is required');
      return;
    }

    if (state.categories.length === 0) {
      setError('At least one category is required');
      return;
    }

    // Check if any category has questions
    const hasQuestions = state.categories.some((cat) => cat.questions.length > 0);
    if (!hasQuestions) {
      setError('At least one question is required');
      return;
    }

    // Validate questions
    for (let catIdx = 0; catIdx < state.categories.length; catIdx++) {
      const category = state.categories[catIdx];
      for (let qIdx = 0; qIdx < category.questions.length; qIdx++) {
        const q = category.questions[qIdx];
        if (!q.question.trim()) {
          setError(`${category.name}: Question ${qIdx + 1} text is required`);
          return;
        }
        if (q.options.some((opt) => !opt.trim())) {
          setError(`${category.name}: Question ${qIdx + 1} has empty options`);
          return;
        }
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert to TriviaQuestion[] format
      const dbQuestions: TriviaQuestion[] = [];

      for (const category of state.categories) {
        for (const question of category.questions) {
          dbQuestions.push({
            question: question.question.trim(),
            options: question.options.map((opt) => opt.trim()),
            correctIndex: question.correctIndex,
            category: question.category,
            explanation: question.explanation.trim() || undefined,
          });
        }
      }

      const isEditMode = !!questionSetId;

      if (isEditMode) {
        questionSetStoreUpdate(questionSetId, {
          name: state.name.trim(),
          description: state.description.trim() || null,
          questions: dbQuestions,
        });
      } else {
        questionSetStoreCreate({
          name: state.name.trim(),
          description: state.description.trim() || null,
          questions: dbQuestions,
          is_default: false,
        });
      }

      success(`Question set "${state.name.trim()}" ${isEditMode ? 'updated' : 'created'} successfully`);
      const freshState = createInitialState();
      dispatch({ type: 'RESET', payload: freshState });
      initialStateRef.current = freshState;
      setExpandedCategories(new Set());
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save question set';
      setError(message);
      errorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    // If dirty, show confirmation dialog
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }

    // Otherwise, close immediately
    const freshState = createInitialState();
    dispatch({ type: 'RESET', payload: freshState });
    initialStateRef.current = freshState;
    setExpandedCategories(new Set());
    setError(null);
    onClose();
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    const freshState = createInitialState();
    dispatch({ type: 'RESET', payload: freshState });
    initialStateRef.current = freshState;
    setExpandedCategories(new Set());
    setError(null);
    onClose();
  };

  const handleKeepEditing = () => {
    setShowDiscardDialog(false);
  };

  return (
    <>
      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={questionSetId ? 'Edit Question Set' : 'Create Question Set'}
        confirmLabel={isSaving ? 'Saving...' : 'Save'}
        cancelLabel="Cancel"
        onConfirm={handleSave}
        variant="default"
        showFooter
      >
      <div className="flex flex-col gap-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <p className="text-lg text-muted-foreground">Loading question set...</p>
          </div>
        )}

        {/* Form (hidden when loading) */}
        {!isLoading && (
          <>
            {/* Name Input */}
            <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-lg font-medium">
            Question Set Name
          </label>
          <input
            id={nameId}
            type="text"
            value={state.name}
            onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
            disabled={isSaving}
            placeholder="e.g., Science & History Mix"
            maxLength={100}
            className={`
              min-h-[56px] px-4 py-3
              text-lg rounded-lg
              bg-background border-2 border-border
              focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-muted-foreground
            `}
            aria-describedby={error ? `${nameId}-error` : undefined}
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>

        {/* Description Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor={descriptionId} className="text-lg font-medium">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id={descriptionId}
            value={state.description}
            onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
            disabled={isSaving}
            placeholder="Brief description of this question set..."
            maxLength={500}
            rows={2}
            className={`
              min-h-[56px] px-4 py-3
              text-lg rounded-lg
              bg-background border-2 border-border
              focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-muted-foreground
              resize-none
            `}
          />
        </div>

        {/* Add Category Button */}
        {availableCategories.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium">Categories</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleAddCategory(category.id)}
                  disabled={isSaving}
                  className={`
                    min-h-[44px] min-w-[44px] px-4 py-2
                    text-base font-medium rounded-lg
                    bg-primary text-primary-foreground
                    hover:bg-primary/90
                    focus:outline-none focus:ring-4 focus:ring-primary/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  `}
                >
                  + {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category List */}
        {state.categories.length > 0 && (
          <div className="flex flex-col gap-3">
            <label className="text-lg font-medium">
              Added Categories ({state.categories.length})
            </label>
            {state.categories.map((category, catIdx) => (
              <CategorySection
                key={catIdx}
                category={category}
                isExpanded={expandedCategories.has(catIdx)}
                onToggle={() => toggleCategory(catIdx)}
                onRemove={() => dispatch({ type: 'REMOVE_CATEGORY', payload: catIdx })}
                onAddQuestion={() => dispatch({ type: 'ADD_QUESTION', payload: catIdx })}
                onRemoveQuestion={(qIdx) =>
                  dispatch({
                    type: 'REMOVE_QUESTION',
                    payload: { categoryIndex: catIdx, questionIndex: qIdx },
                  })
                }
                onUpdateQuestion={(qIdx, field, value) =>
                  dispatch({
                    type: 'UPDATE_QUESTION',
                    payload: { categoryIndex: catIdx, questionIndex: qIdx, field, value },
                  })
                }
                disabled={isSaving}
              />
            ))}
          </div>
        )}

        {/* Preview Summary */}
        <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="text-base font-semibold text-muted-foreground">Summary</h3>
          <ul className="text-base space-y-1">
            <li>
              <span className="font-medium">Categories:</span> {state.categories.length}
            </li>
            <li>
              <span className="font-medium">Total Questions:</span>{' '}
              {state.categories.reduce((sum, cat) => sum + cat.questions.length, 0)}
            </li>
          </ul>
        </div>

            {/* Error */}
            {error && (
              <div
                id={`${nameId}-error`}
                role="alert"
                className="p-4 bg-destructive/10 border border-destructive rounded-lg"
              >
                <p className="text-base text-destructive font-medium">{error}</p>
              </div>
            )}
          </>
        )}
      </div>
      </Modal>
    </>
  );
}

// =============================================================================
// CATEGORY SECTION COMPONENT
// =============================================================================

interface CategorySectionProps {
  category: { id: QuestionCategory; name: string; questions: QuestionFormData[] };
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (questionIndex: number) => void;
  onUpdateQuestion: (
    questionIndex: number,
    field: keyof QuestionFormData,
    value: string | number | string[]
  ) => void;
  disabled: boolean;
}

function CategorySection({
  category,
  isExpanded,
  onToggle,
  onRemove,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  disabled,
}: CategorySectionProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Category Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="flex-1 min-h-[44px] text-left text-base font-medium flex items-center gap-2 hover:bg-muted/70 transition-colors rounded px-2 -mx-2"
          aria-expanded={isExpanded}
        >
          <span aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
          <span>
            {category.name} ({category.questions.length} questions)
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className={`
            min-h-[44px] min-w-[44px] px-3
            text-base font-medium rounded-lg
            text-destructive hover:bg-destructive/10
            focus:outline-none focus:ring-4 focus:ring-destructive/50
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={`Remove ${category.name} category`}
        >
          Remove
        </button>
      </div>

      {/* Category Content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Questions */}
          {category.questions.map((question, qIdx) => (
            <QuestionForm
              key={question.id}
              question={question}
              questionIndex={qIdx}
              onUpdate={(field, value) => onUpdateQuestion(qIdx, field, value)}
              onRemove={() => onRemoveQuestion(qIdx)}
              disabled={disabled}
            />
          ))}

          {/* Add Question Button */}
          <button
            type="button"
            onClick={onAddQuestion}
            disabled={disabled}
            className={`
              w-full min-h-[44px] px-4 py-2
              text-base font-medium rounded-lg
              border-2 border-dashed border-border
              hover:border-primary hover:bg-primary/5
              focus:outline-none focus:ring-4 focus:ring-primary/50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            + Add Question
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// QUESTION FORM COMPONENT
// =============================================================================

interface QuestionFormProps {
  question: QuestionFormData;
  questionIndex: number;
  onUpdate: (field: keyof QuestionFormData, value: string | number | string[]) => void;
  onRemove: () => void;
  disabled: boolean;
}

function QuestionForm({ question, questionIndex, onUpdate, onRemove, disabled }: QuestionFormProps) {
  const questionId = useId();

  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    onUpdate('options', newOptions);
  };

  return (
    <div className="p-4 border border-border rounded-lg bg-background space-y-3">
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <span className="text-base font-medium">Question {questionIndex + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className={`
            min-h-[44px] min-w-[44px] px-3
            text-base text-destructive hover:bg-destructive/10
            rounded-lg
            focus:outline-none focus:ring-4 focus:ring-destructive/50
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={`Remove question ${questionIndex + 1}`}
        >
          Remove
        </button>
      </div>

      {/* Question Text */}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${questionId}-text`} className="text-base font-medium">
          Question Text
        </label>
        <input
          id={`${questionId}-text`}
          type="text"
          value={question.question}
          onChange={(e) => onUpdate('question', e.target.value)}
          disabled={disabled}
          placeholder="Enter your question..."
          className={`
            min-h-[48px] px-3 py-2
            text-base rounded-lg
            bg-background border-2 border-border
            focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-muted-foreground
          `}
        />
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        <label className="text-base font-medium">Options</label>
        {question.options.map((option, optIdx) => (
          <div key={optIdx} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${questionId}-correct`}
              checked={question.correctIndex === optIdx}
              onChange={() => onUpdate('correctIndex', optIdx)}
              disabled={disabled}
              className={`
                w-5 h-5
                text-primary focus:ring-4 focus:ring-primary/50
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer
              `}
              aria-label={`Mark option ${optIdx + 1} as correct`}
            />
            <input
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(optIdx, e.target.value)}
              disabled={disabled}
              placeholder={`Option ${optIdx + 1}`}
              className={`
                flex-1 min-h-[44px] px-3 py-2
                text-base rounded-lg
                bg-background border-2 border-border
                focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                placeholder:text-muted-foreground
              `}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
