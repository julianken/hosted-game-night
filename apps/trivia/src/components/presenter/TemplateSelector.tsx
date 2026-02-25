'use client';

import { useId, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useToast } from "@joolie-boolie/ui";
import type { TriviaTemplate, TriviaQuestion } from '@joolie-boolie/database/types';
import type { Question, QuestionId } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/** List item type (questions JSONB stripped from list response) */
type TemplateListItem = Omit<TriviaTemplate, 'questions'>;

export interface TemplateSelectorProps {
  disabled?: boolean;
  onTemplateLoad?: (template: TriviaTemplate) => void;
}

/**
 * Convert database TriviaQuestion to app Question format
 */
function convertTemplateQuestion(
  dbQuestion: TriviaQuestion,
  roundIndex: number
): Question {
  // Determine question type based on number of options
  const type = dbQuestion.options.length === 2 ? 'true_false' : 'multiple_choice';

  // Generate option labels (A, B, C, D or True, False)
  const options = type === 'true_false'
    ? ['True', 'False']
    : dbQuestion.options.map((_, i) => String.fromCharCode(65 + i)); // A, B, C, D

  // Get correct answer from correctIndex
  const correctAnswer = options[dbQuestion.correctIndex];

  return {
    id: uuidv4() as QuestionId,
    text: dbQuestion.question,
    type,
    correctAnswers: [correctAnswer],
    options,
    optionTexts: dbQuestion.options,
    category: (dbQuestion.category as Question['category']) || 'general_knowledge',
    roundIndex,
  };
}

export function TemplateSelector({
  disabled = false,
  onTemplateLoad,
}: TemplateSelectorProps) {
  const id = useId();
  const { success, error: errorToast } = useToast();

  // Store actions
  const importQuestions = useGameStore((state) => state.importQuestions);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const gameStatus = useGameStore((state) => state.status);

  // Component state
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/templates');

        if (!response.ok) {
          // Gracefully handle missing/unavailable template API (BEA-420)
          console.warn('Templates unavailable:', response.status);
          setTemplates([]);
          return;
        }

        const data = await response.json();
        setTemplates(data.data || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
        // Toast removed - inline error message is sufficient (BEA-347)
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [errorToast]);

  // Load template into stores (fetches full data including questions from detail endpoint)
  const loadTemplate = useCallback(async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) {
        errorToast('Failed to load template');
        return;
      }

      const data = await response.json();
      const template: TriviaTemplate = data.template;

      // Convert template questions to app Question format
      const convertedQuestions: Question[] = [];
      const questionsPerRound = template.questions_per_round;

      template.questions.forEach((dbQuestion, index) => {
        const roundIndex = Math.floor(index / questionsPerRound);
        convertedQuestions.push(convertTemplateQuestion(dbQuestion, roundIndex));
      });

      // 1. Import questions (this updates totalRounds automatically)
      importQuestions(convertedQuestions, 'replace');

      // 2. Update settings
      updateSettings({
        timerDuration: template.timer_duration,
        roundsCount: template.rounds_count,
        questionsPerRound: template.questions_per_round,
      });

      success(`Loaded template "${template.name}"`);

      // Notify parent component
      onTemplateLoad?.(template);
    } catch (err) {
      console.error('Error loading template:', err);
      errorToast('Failed to apply template settings');
    }
  }, [importQuestions, updateSettings, success, errorToast, onTemplateLoad]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);

    if (templateId) {
      await loadTemplate(templateId);
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
        value={selectedTemplateId}
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
          {isLoading ? 'Loading templates...' : 'Select a template...'}
        </option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.is_default ? ' (Default)' : ''}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      )}
      {templates.length === 0 && !isLoading && !error && (
        <p className="text-base text-muted-foreground">
          No saved question sets. Save your first set below.
        </p>
      )}
      {gameStatus !== 'setup' && (
        <p className="text-base text-warning" role="alert">
          Templates can only be loaded during setup.
        </p>
      )}
    </div>
  );
}
