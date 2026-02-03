/**
 * Utilities and types for QuestionSetEditorModal.
 * Manages complex nested state for categories and questions.
 */

import type { QuestionCategory } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Form data for a question within the editor.
 */
export interface QuestionFormData {
  id: string; // Unique ID for React key
  question: string;
  options: string[];
  correctIndex: number;
}

/**
 * Form data for a category (round) within the editor.
 */
export interface CategoryFormData {
  id: QuestionCategory; // Category ID (science, history, etc.)
  name: string; // Display name
  questions: QuestionFormData[];
}

/**
 * Complete editor state.
 */
export interface EditorState {
  name: string;
  description: string;
  categories: CategoryFormData[];
}

// =============================================================================
// REDUCER ACTIONS
// =============================================================================

export type EditorAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: { id: QuestionCategory; name: string } }
  | { type: 'REMOVE_CATEGORY'; payload: number } // category index
  | { type: 'UPDATE_CATEGORY_NAME'; payload: { index: number; name: string } }
  | { type: 'ADD_QUESTION'; payload: number } // category index
  | { type: 'REMOVE_QUESTION'; payload: { categoryIndex: number; questionIndex: number } }
  | {
      type: 'UPDATE_QUESTION';
      payload: {
        categoryIndex: number;
        questionIndex: number;
        field: keyof QuestionFormData;
        value: string | number | string[];
      };
    }
  | { type: 'RESET'; payload: EditorState };

// =============================================================================
// REDUCER
// =============================================================================

/**
 * Reducer for managing editor state.
 */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.payload };

    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };

    case 'ADD_CATEGORY': {
      const newCategory: CategoryFormData = {
        id: action.payload.id,
        name: action.payload.name,
        questions: [],
      };
      return {
        ...state,
        categories: [...state.categories, newCategory],
      };
    }

    case 'REMOVE_CATEGORY': {
      const categories = state.categories.filter((_, idx) => idx !== action.payload);
      return { ...state, categories };
    }

    case 'UPDATE_CATEGORY_NAME': {
      const categories = state.categories.map((cat, idx) =>
        idx === action.payload.index ? { ...cat, name: action.payload.name } : cat
      );
      return { ...state, categories };
    }

    case 'ADD_QUESTION': {
      const categoryIndex = action.payload;
      const newQuestion: QuestionFormData = {
        id: `q-${Date.now()}-${Math.random()}`,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
      };

      const categories = state.categories.map((cat, idx) =>
        idx === categoryIndex
          ? { ...cat, questions: [...cat.questions, newQuestion] }
          : cat
      );

      return { ...state, categories };
    }

    case 'REMOVE_QUESTION': {
      const { categoryIndex, questionIndex } = action.payload;
      const categories = state.categories.map((cat, catIdx) =>
        catIdx === categoryIndex
          ? {
              ...cat,
              questions: cat.questions.filter((_, qIdx) => qIdx !== questionIndex),
            }
          : cat
      );

      return { ...state, categories };
    }

    case 'UPDATE_QUESTION': {
      const { categoryIndex, questionIndex, field, value } = action.payload;
      const categories = state.categories.map((cat, catIdx) =>
        catIdx === categoryIndex
          ? {
              ...cat,
              questions: cat.questions.map((q, qIdx) =>
                qIdx === questionIndex ? { ...q, [field]: value } : q
              ),
            }
          : cat
      );

      return { ...state, categories };
    }

    case 'RESET':
      return action.payload;

    default:
      return state;
  }
}

// =============================================================================
// INITIAL STATE FACTORY
// =============================================================================

/**
 * Create initial editor state.
 */
export function createInitialState(overrides?: Partial<EditorState>): EditorState {
  return {
    name: '',
    description: '',
    categories: [],
    ...overrides,
  };
}
