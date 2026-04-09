import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionCategory, QuestionId } from '@/types';
import type { TriviaQuestion } from '@/types/trivia-question';

/**
 * Letter-to-index mapping for correctAnswers conversion.
 */
const LETTER_TO_INDEX: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

/**
 * Convert an app Question to a database TriviaQuestion.
 *
 * - `text` -> `question`
 * - `optionTexts` -> `options`
 * - `correctAnswers[0]` letter label -> `correctIndex`
 * - `category` -> `category`
 */
export function questionToTriviaQuestion(q: Question): TriviaQuestion {
  const correctAnswer = q.correctAnswers[0];

  // For true/false, options are ['True', 'False'] so use indexOf
  // For multiple choice, options are ['A', 'B', 'C', 'D'] so use letter mapping
  const correctIndex =
    q.type === 'true_false'
      ? q.options.indexOf(correctAnswer)
      : (LETTER_TO_INDEX[correctAnswer] ?? q.options.indexOf(correctAnswer));

  return {
    question: q.text,
    options: q.optionTexts,
    correctIndex,
    category: q.category,
  };
}

/**
 * Convert a database TriviaQuestion back to an app Question.
 *
 * - `question` -> `text`
 * - `options` -> `optionTexts`
 * - `correctIndex` -> letter label in `correctAnswers`
 * - `category` -> `category` (defaults to 'general_knowledge')
 * - `type` auto-detected from options length (2 = true_false)
 * - `roundIndex` defaults to provided index or 0
 */
export function triviaQuestionToQuestion(
  tq: TriviaQuestion,
  index?: number
): Question {
  const type = tq.options.length === 2 ? 'true_false' : 'multiple_choice';

  const options =
    type === 'true_false'
      ? ['True', 'False']
      : tq.options.map((_, i) => String.fromCharCode(65 + i));

  const correctAnswer = options[tq.correctIndex];

  return {
    id: uuidv4() as QuestionId,
    text: tq.question,
    type,
    correctAnswers: [correctAnswer],
    options,
    optionTexts: tq.options,
    category: (tq.category as QuestionCategory) || 'general_knowledge',
    roundIndex: index ?? 0,
  };
}

/**
 * Batch convert app Questions to database TriviaQuestions.
 */
export function questionsToTriviaQuestions(qs: Question[]): TriviaQuestion[] {
  return qs.map(questionToTriviaQuestion);
}

/**
 * Batch convert database TriviaQuestions to app Questions.
 */
export function triviaQuestionsToQuestions(tqs: TriviaQuestion[]): Question[] {
  return tqs.map((tq, i) => triviaQuestionToQuestion(tq, i));
}
