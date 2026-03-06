'use client';

import { useId, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useToast } from "@joolie-boolie/ui";
import type { TriviaQuestionSet } from '@joolie-boolie/database/types';
import type { Question } from '@/types';
import { triviaQuestionToQuestion } from '@/lib/questions/conversion';

/** List item type (questions JSONB stripped from list response) */
type QuestionSetListItem = Omit<TriviaQuestionSet, 'questions'>;

export interface QuestionSetSelectorProps {
  disabled?: boolean;
  onQuestionSetLoad?: (questionSet: TriviaQuestionSet) => void;
}

/**
 * Fetches question sets from /api/question-sets and loads ONLY questions
 * into the game store via importQuestions. Does NOT touch settings.
 */
export function QuestionSetSelector({
  disabled = false,
  onQuestionSetLoad,
}: QuestionSetSelectorProps) {
  const id = useId();
  const { success, error: errorToast } = useToast();

  // Store actions
  const importQuestions = useGameStore((state) => state.importQuestions);
  const gameStatus = useGameStore((state) => state.status);

  // Component state
  const [questionSets, setQuestionSets] = useState<QuestionSetListItem[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch question sets on mount
  useEffect(() => {
    const fetchQuestionSets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/question-sets');

        if (!response.ok) {
          console.warn('Question sets unavailable:', response.status);
          setQuestionSets([]);
          return;
        }

        const data = await response.json();
        setQuestionSets(data.data || []);
      } catch (err) {
        console.error('Error fetching question sets:', err);
        setError('Failed to load question sets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionSets();
  }, []);

  // Load question set into store (fetches full data including questions from detail endpoint)
  const loadQuestionSet = useCallback(async (setId: string) => {
    try {
      const response = await fetch(`/api/question-sets/${setId}`);
      if (!response.ok) {
        errorToast('Failed to load question set');
        return;
      }

      const data = await response.json();
      const questionSet: TriviaQuestionSet = data.questionSet;

      // Import with roundIndex=0; the redistributeQuestions effect in SetupGate
      // will assign proper round indices based on settings store config.
      const convertedQuestions: Question[] = questionSet.questions.map(
        (dbQuestion) => triviaQuestionToQuestion(dbQuestion, 0)
      );

      importQuestions(convertedQuestions, 'replace');

      success(`Loaded question set "${questionSet.name}" (${questionSet.questions.length} questions)`);
      onQuestionSetLoad?.(questionSet);
    } catch (err) {
      console.error('Error loading question set:', err);
      errorToast('Failed to load question set');
    }
  }, [importQuestions, success, errorToast, onQuestionSetLoad]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const setId = e.target.value;
    setSelectedSetId(setId);

    if (setId) {
      await loadQuestionSet(setId);
    }
  };

  const isDisabled = disabled || isLoading || gameStatus !== 'setup';

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-lg font-medium ${isDisabled ? 'opacity-50' : ''}`}
      >
        Load Question Set
      </label>
      <select
        id={id}
        value={selectedSetId}
        onChange={handleChange}
        disabled={isDisabled}
        className={`
          min-h-[56px] px-4 py-3
          text-lg rounded-lg
          bg-background border-2 border-border
          focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
        `}
      >
        <option value="">
          {isLoading ? 'Loading question sets...' : 'Select a question set...'}
        </option>
        {questionSets.map((qs) => (
          <option key={qs.id} value={qs.id}>
            {qs.name}
            {qs.is_default ? ' (Default)' : ''}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      )}
      {questionSets.length === 0 && !isLoading && !error && (
        <p className="text-base text-muted-foreground">
          No saved question sets. Save your first set below.
        </p>
      )}
      {gameStatus !== 'setup' && (
        <p className="text-base text-warning" role="alert">
          Question sets can only be loaded during setup.
        </p>
      )}
    </div>
  );
}
