import { describe, it, expect, beforeEach } from 'vitest';

const skipIfDisabled = !process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS || process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS === 'false';
import {
  editorReducer,
  createInitialState,
  type EditorState,
  type EditorAction,
  type QuestionFormData,
} from '../QuestionSetEditorModal.utils';

// Helper to create a complete QuestionFormData object
const createQuestion = (partial: Partial<QuestionFormData>): QuestionFormData => ({
  id: partial.id ?? 'test-id',
  question: partial.question ?? '',
  type: partial.type ?? 'multiple_choice',
  options: partial.options ?? ['', '', '', ''],
  correctIndex: partial.correctIndex ?? 0,
  category: partial.category ?? 'general_knowledge',
  explanation: partial.explanation ?? '',
});

describe.skipIf(skipIfDisabled)('QuestionSetEditorModal.utils', () => {
  describe('createInitialState', () => {
    it('should create default initial state', () => {
      const state = createInitialState();
      expect(state).toEqual({
        name: '',
        description: '',
        categories: [],
      });
    });

    it('should create initial state with overrides', () => {
      const state = createInitialState({
        name: 'Test Set',
        description: 'Test Description',
      });
      expect(state).toEqual({
        name: 'Test Set',
        description: 'Test Description',
        categories: [],
      });
    });

    it('should allow partial overrides', () => {
      const state = createInitialState({ name: 'Partial' });
      expect(state.name).toBe('Partial');
      expect(state.description).toBe('');
      expect(state.categories).toEqual([]);
    });
  });

  describe('editorReducer', () => {
    let initialState: EditorState;

    beforeEach(() => {
      initialState = createInitialState();
    });

    describe('SET_NAME', () => {
      it('should set the name', () => {
        const action: EditorAction = { type: 'SET_NAME', payload: 'New Name' };
        const newState = editorReducer(initialState, action);
        expect(newState.name).toBe('New Name');
        expect(newState.description).toBe('');
        expect(newState.categories).toEqual([]);
      });

      it('should not mutate original state', () => {
        const action: EditorAction = { type: 'SET_NAME', payload: 'New Name' };
        editorReducer(initialState, action);
        expect(initialState.name).toBe('');
      });
    });

    describe('SET_DESCRIPTION', () => {
      it('should set the description', () => {
        const action: EditorAction = { type: 'SET_DESCRIPTION', payload: 'Test Description' };
        const newState = editorReducer(initialState, action);
        expect(newState.description).toBe('Test Description');
        expect(newState.name).toBe('');
        expect(newState.categories).toEqual([]);
      });

      it('should not mutate original state', () => {
        const action: EditorAction = { type: 'SET_DESCRIPTION', payload: 'Test' };
        editorReducer(initialState, action);
        expect(initialState.description).toBe('');
      });
    });

    describe('ADD_CATEGORY', () => {
      it('should add a category', () => {
        const action: EditorAction = {
          type: 'ADD_CATEGORY',
          payload: { id: 'science', name: 'Science' },
        };
        const newState = editorReducer(initialState, action);
        expect(newState.categories).toHaveLength(1);
        expect(newState.categories[0]).toEqual({
          id: 'science',
          name: 'Science',
          questions: [],
        });
      });

      it('should append to existing categories', () => {
        const stateWithCategory = editorReducer(initialState, {
          type: 'ADD_CATEGORY',
          payload: { id: 'science', name: 'Science' },
        });
        const newState = editorReducer(stateWithCategory, {
          type: 'ADD_CATEGORY',
          payload: { id: 'history', name: 'History' },
        });
        expect(newState.categories).toHaveLength(2);
        expect(newState.categories[0].id).toBe('science');
        expect(newState.categories[1].id).toBe('history');
      });

      it('should not mutate original state', () => {
        const action: EditorAction = {
          type: 'ADD_CATEGORY',
          payload: { id: 'science', name: 'Science' },
        };
        editorReducer(initialState, action);
        expect(initialState.categories).toHaveLength(0);
      });
    });

    describe('REMOVE_CATEGORY', () => {
      it('should remove a category by index', () => {
        const stateWithCategories = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [] },
            { id: 'history' as const, name: 'History', questions: [] },
            { id: 'geography' as const, name: 'Geography', questions: [] },
          ],
        };
        const newState = editorReducer(stateWithCategories, {
          type: 'REMOVE_CATEGORY',
          payload: 1,
        });
        expect(newState.categories).toHaveLength(2);
        expect(newState.categories[0].id).toBe('science');
        expect(newState.categories[1].id).toBe('geography');
      });

      it('should handle removing the first category', () => {
        const stateWithCategories = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [] },
            { id: 'history' as const, name: 'History', questions: [] },
          ],
        };
        const newState = editorReducer(stateWithCategories, {
          type: 'REMOVE_CATEGORY',
          payload: 0,
        });
        expect(newState.categories).toHaveLength(1);
        expect(newState.categories[0].id).toBe('history');
      });

      it('should handle removing the last category', () => {
        const stateWithCategories = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [] },
            { id: 'history' as const, name: 'History', questions: [] },
          ],
        };
        const newState = editorReducer(stateWithCategories, {
          type: 'REMOVE_CATEGORY',
          payload: 1,
        });
        expect(newState.categories).toHaveLength(1);
        expect(newState.categories[0].id).toBe('science');
      });
    });

    describe('UPDATE_CATEGORY_NAME', () => {
      it('should update category name by index', () => {
        const stateWithCategories = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [] },
            { id: 'history' as const, name: 'History', questions: [] },
          ],
        };
        const newState = editorReducer(stateWithCategories, {
          type: 'UPDATE_CATEGORY_NAME',
          payload: { index: 1, name: 'World History' },
        });
        expect(newState.categories[1].name).toBe('World History');
        expect(newState.categories[0].name).toBe('Science');
      });

      it('should not mutate original state', () => {
        const stateWithCategories = {
          ...initialState,
          categories: [{ id: 'science' as const, name: 'Science', questions: [] }],
        };
        editorReducer(stateWithCategories, {
          type: 'UPDATE_CATEGORY_NAME',
          payload: { index: 0, name: 'New Name' },
        });
        expect(stateWithCategories.categories[0].name).toBe('Science');
      });
    });

    describe('ADD_QUESTION', () => {
      it('should add a question to specified category', () => {
        const stateWithCategory = {
          ...initialState,
          categories: [{ id: 'science' as const, name: 'Science', questions: [] }],
        };
        const newState = editorReducer(stateWithCategory, {
          type: 'ADD_QUESTION',
          payload: 0,
        });
        expect(newState.categories[0].questions).toHaveLength(1);
        expect(newState.categories[0].questions[0]).toMatchObject({
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
        });
        expect(newState.categories[0].questions[0].id).toBeDefined();
      });

      it('should generate unique IDs for questions', () => {
        const stateWithCategory = {
          ...initialState,
          categories: [{ id: 'science' as const, name: 'Science', questions: [] }],
        };
        const state1 = editorReducer(stateWithCategory, { type: 'ADD_QUESTION', payload: 0 });
        const state2 = editorReducer(state1, { type: 'ADD_QUESTION', payload: 0 });
        const id1 = state2.categories[0].questions[0].id;
        const id2 = state2.categories[0].questions[1].id;
        expect(id1).not.toBe(id2);
      });

      it('should not affect other categories', () => {
        const stateWithCategories = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [] },
            { id: 'history' as const, name: 'History', questions: [] },
          ],
        };
        const newState = editorReducer(stateWithCategories, {
          type: 'ADD_QUESTION',
          payload: 0,
        });
        expect(newState.categories[0].questions).toHaveLength(1);
        expect(newState.categories[1].questions).toHaveLength(0);
      });
    });

    describe('REMOVE_QUESTION', () => {
      it('should remove a question from specified category', () => {
        const question1 = createQuestion({
          id: 'q1',
          question: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        });
        const question2 = createQuestion({
          id: 'q2',
          question: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
        });
        const stateWithQuestions = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [question1, question2] },
          ],
        };
        const newState = editorReducer(stateWithQuestions, {
          type: 'REMOVE_QUESTION',
          payload: { categoryIndex: 0, questionIndex: 0 },
        });
        expect(newState.categories[0].questions).toHaveLength(1);
        expect(newState.categories[0].questions[0].id).toBe('q2');
      });

      it('should handle removing the last question', () => {
        const question1 = createQuestion({
          id: 'q1',
          question: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        });
        const question2 = createQuestion({
          id: 'q2',
          question: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
        });
        const stateWithQuestions = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [question1, question2] },
          ],
        };
        const newState = editorReducer(stateWithQuestions, {
          type: 'REMOVE_QUESTION',
          payload: { categoryIndex: 0, questionIndex: 1 },
        });
        expect(newState.categories[0].questions).toHaveLength(1);
        expect(newState.categories[0].questions[0].id).toBe('q1');
      });
    });

    describe('UPDATE_QUESTION', () => {
      it('should update question text', () => {
        const question = createQuestion({
          id: 'q1',
          question: 'Old Question',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        });
        const stateWithQuestion = {
          ...initialState,
          categories: [{ id: 'science' as const, name: 'Science', questions: [question] }],
        };
        const newState = editorReducer(stateWithQuestion, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'question',
            value: 'New Question',
          },
        });
        expect(newState.categories[0].questions[0].question).toBe('New Question');
      });

      it('should update correctIndex', () => {
        const question = createQuestion({
          id: 'q1',
          question: 'Question',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        });
        const stateWithQuestion = {
          ...initialState,
          categories: [{ id: 'science' as const, name: 'Science', questions: [question] }],
        };
        const newState = editorReducer(stateWithQuestion, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'correctIndex',
            value: 2,
          },
        });
        expect(newState.categories[0].questions[0].correctIndex).toBe(2);
      });

      it('should update options array', () => {
        const question = createQuestion({
          id: 'q1',
          question: 'Question',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        });
        const stateWithQuestion = {
          ...initialState,
          categories: [{ id: 'science' as const, name: 'Science', questions: [question] }],
        };
        const newOptions = ['W', 'X', 'Y', 'Z'];
        const newState = editorReducer(stateWithQuestion, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'options',
            value: newOptions,
          },
        });
        expect(newState.categories[0].questions[0].options).toEqual(newOptions);
      });

      it('should not affect other questions in the same category', () => {
        const question1 = createQuestion({
          id: 'q1',
          question: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        });
        const question2 = createQuestion({
          id: 'q2',
          question: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
        });
        const stateWithQuestions = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [question1, question2] },
          ],
        };
        const newState = editorReducer(stateWithQuestions, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'question',
            value: 'Updated Question',
          },
        });
        expect(newState.categories[0].questions[0].question).toBe('Updated Question');
        expect(newState.categories[0].questions[1].question).toBe('Question 2');
      });

      it('should not affect other categories', () => {
        const question = createQuestion({
          id: 'q1',
          question: 'Science Question',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        });
        const stateWithCategories = {
          ...initialState,
          categories: [
            { id: 'science' as const, name: 'Science', questions: [question] },
            { id: 'history' as const, name: 'History', questions: [] },
          ],
        };
        const newState = editorReducer(stateWithCategories, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'question',
            value: 'Updated',
          },
        });
        expect(newState.categories[1].questions).toHaveLength(0);
      });
    });

    describe('RESET', () => {
      it('should reset to provided state', () => {
        const currentState = {
          name: 'Current',
          description: 'Current Desc',
          categories: [{ id: 'science' as const, name: 'Science', questions: [] }],
        };
        const resetState = createInitialState({ name: 'Reset' });
        const newState = editorReducer(currentState, { type: 'RESET', payload: resetState });
        expect(newState).toEqual(resetState);
      });

      it('should handle resetting to empty state', () => {
        const currentState = {
          name: 'Current',
          description: 'Current Desc',
          categories: [{ id: 'science' as const, name: 'Science', questions: [] }],
        };
        const newState = editorReducer(currentState, {
          type: 'RESET',
          payload: createInitialState(),
        });
        expect(newState).toEqual(createInitialState());
      });
    });

    describe('unknown action', () => {
      it('should return the same state for unknown action', () => {
        const action = { type: 'UNKNOWN_ACTION' } as unknown as EditorAction;
        const newState = editorReducer(initialState, action);
        expect(newState).toBe(initialState);
      });
    });

    describe('complex workflows', () => {
      it('should handle a complete workflow: add category, add questions, update, remove', () => {
        let state = createInitialState();

        // Set metadata
        state = editorReducer(state, { type: 'SET_NAME', payload: 'My Quiz' });
        state = editorReducer(state, {
          type: 'SET_DESCRIPTION',
          payload: 'A comprehensive quiz',
        });

        // Add category
        state = editorReducer(state, {
          type: 'ADD_CATEGORY',
          payload: { id: 'science', name: 'Science' },
        });

        // Add questions
        state = editorReducer(state, { type: 'ADD_QUESTION', payload: 0 });
        state = editorReducer(state, { type: 'ADD_QUESTION', payload: 0 });

        // Update first question
        state = editorReducer(state, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'question',
            value: 'What is H2O?',
          },
        });
        state = editorReducer(state, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'options',
            value: ['Water', 'Hydrogen', 'Oxygen', 'Carbon'],
          },
        });

        // Remove second question
        state = editorReducer(state, {
          type: 'REMOVE_QUESTION',
          payload: { categoryIndex: 0, questionIndex: 1 },
        });

        expect(state.name).toBe('My Quiz');
        expect(state.description).toBe('A comprehensive quiz');
        expect(state.categories).toHaveLength(1);
        expect(state.categories[0].questions).toHaveLength(1);
        expect(state.categories[0].questions[0].question).toBe('What is H2O?');
        expect(state.categories[0].questions[0].options).toEqual([
          'Water',
          'Hydrogen',
          'Oxygen',
          'Carbon',
        ]);
      });

      it('should handle multiple categories with questions', () => {
        let state = createInitialState();

        // Add categories
        state = editorReducer(state, {
          type: 'ADD_CATEGORY',
          payload: { id: 'science', name: 'Science' },
        });
        state = editorReducer(state, {
          type: 'ADD_CATEGORY',
          payload: { id: 'history', name: 'History' },
        });

        // Add questions to both categories
        state = editorReducer(state, { type: 'ADD_QUESTION', payload: 0 });
        state = editorReducer(state, { type: 'ADD_QUESTION', payload: 1 });

        // Update questions in different categories
        state = editorReducer(state, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 0,
            questionIndex: 0,
            field: 'question',
            value: 'Science Q',
          },
        });
        state = editorReducer(state, {
          type: 'UPDATE_QUESTION',
          payload: {
            categoryIndex: 1,
            questionIndex: 0,
            field: 'question',
            value: 'History Q',
          },
        });

        expect(state.categories[0].questions[0].question).toBe('Science Q');
        expect(state.categories[1].questions[0].question).toBe('History Q');
      });
    });
  });
});
