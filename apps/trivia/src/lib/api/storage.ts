/**
 * In-memory storage for trivia game sessions, question sets, and session history.
 * This is a temporary solution until Supabase integration is ready.
 */

import type { TriviaGameSession, QuestionSet, Question, Team, TriviaSessionHistory } from '@/types';

// In-memory stores
const gameSessionsStore = new Map<string, TriviaGameSession>();
const questionSetsStore = new Map<string, QuestionSet>();
const sessionHistoryStore = new Map<string, TriviaSessionHistory>();

// Sample questions for default question sets
const sampleMusicQuestions: Omit<Question, 'roundIndex'>[] = [
  {
    id: 'q1',
    text: 'Which band performed "Hotel California"?',
    type: 'multiple_choice',
    correctAnswers: ['A'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Eagles', 'Fleetwood Mac', 'Led Zeppelin', 'The Beach Boys'],
    category: 'music',
  },
  {
    id: 'q2',
    text: 'Elvis Presley was known as the King of Rock and Roll.',
    type: 'true_false',
    correctAnswers: ['True'],
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    category: 'music',
  },
  {
    id: 'q3',
    text: 'Who is the lead singer of The Rolling Stones?',
    type: 'multiple_choice',
    correctAnswers: ['B'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Paul McCartney', 'Mick Jagger', 'Roger Daltrey', 'Robert Plant'],
    category: 'music',
  },
];

const sampleHistoryQuestions: Omit<Question, 'roundIndex'>[] = [
  {
    id: 'q4',
    text: 'In which year did World War II end?',
    type: 'multiple_choice',
    correctAnswers: ['C'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['1943', '1944', '1945', '1946'],
    category: 'history',
  },
  {
    id: 'q5',
    text: 'The Great Wall of China was built in a single dynasty.',
    type: 'true_false',
    correctAnswers: ['False'],
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    category: 'history',
  },
];

// Default question sets for initialization
const defaultQuestionSets: QuestionSet[] = [
  {
    id: 'default-music',
    name: 'Classic Music Trivia',
    description: 'Test your knowledge of classic rock and pop music',
    questions: sampleMusicQuestions.map((q, i) => ({ ...q, roundIndex: Math.floor(i / 2) })),
    category: 'music',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-history',
    name: 'World History',
    description: 'Questions about important historical events',
    questions: sampleHistoryQuestions.map((q, i) => ({ ...q, roundIndex: Math.floor(i / 2) })),
    category: 'history',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Initialize default question sets
defaultQuestionSets.forEach(qs => {
  questionSetsStore.set(qs.id, qs);
});

// Game Session Storage Operations
export const gameSessionStorage = {
  getAll(): TriviaGameSession[] {
    return Array.from(gameSessionsStore.values());
  },

  getById(id: string): TriviaGameSession | undefined {
    return gameSessionsStore.get(id);
  },

  create(session: TriviaGameSession): TriviaGameSession {
    gameSessionsStore.set(session.id, session);
    return session;
  },

  update(id: string, updates: Partial<TriviaGameSession>): TriviaGameSession | undefined {
    const existing = gameSessionsStore.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    gameSessionsStore.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return gameSessionsStore.delete(id);
  },

  clear(): void {
    gameSessionsStore.clear();
  },
};

// Question Set Storage Operations
export const questionSetStorage = {
  getAll(): QuestionSet[] {
    return Array.from(questionSetsStore.values());
  },

  getById(id: string): QuestionSet | undefined {
    return questionSetsStore.get(id);
  },

  create(questionSet: QuestionSet): QuestionSet {
    questionSetsStore.set(questionSet.id, questionSet);
    return questionSet;
  },

  update(id: string, updates: Partial<QuestionSet>): QuestionSet | undefined {
    const existing = questionSetsStore.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    questionSetsStore.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return questionSetsStore.delete(id);
  },

  clear(): void {
    questionSetsStore.clear();
    // Re-add default question sets
    defaultQuestionSets.forEach(qs => {
      questionSetsStore.set(qs.id, qs);
    });
  },

  isDefault(id: string): boolean {
    return id.startsWith('default-');
  },
};

// Helper to create default teams
export function createDefaultTeams(count: number = 4): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    name: `Table ${i + 1}`,
    score: 0,
    tableNumber: i + 1,
    roundScores: [],
  }));
}

// Utility to generate UUIDs
export function generateId(): string {
  return crypto.randomUUID();
}

// Session History Storage Operations
export const sessionHistoryStorage = {
  getAll(): TriviaSessionHistory[] {
    // Return sorted by startedAt descending (most recent first)
    return Array.from(sessionHistoryStore.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  },

  getById(id: string): TriviaSessionHistory | undefined {
    return sessionHistoryStore.get(id);
  },

  create(session: TriviaSessionHistory): TriviaSessionHistory {
    sessionHistoryStore.set(session.id, session);
    return session;
  },

  update(id: string, updates: Partial<TriviaSessionHistory>): TriviaSessionHistory | undefined {
    const existing = sessionHistoryStore.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    sessionHistoryStore.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return sessionHistoryStore.delete(id);
  },

  clear(): void {
    sessionHistoryStore.clear();
  },

  // Get sessions by user ID (for future auth integration)
  getByUserId(userId: string): TriviaSessionHistory[] {
    return Array.from(sessionHistoryStore.values())
      .filter((session) => session.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  },

  // Get recent sessions (limited)
  getRecent(limit: number = 10): TriviaSessionHistory[] {
    return this.getAll().slice(0, limit);
  },
};
