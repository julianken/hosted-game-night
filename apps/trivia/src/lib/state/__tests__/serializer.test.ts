import { describe, it, expect } from 'vitest';
import {
  serializeTriviaState,
  deserializeTriviaState,
  SerializationError,
  SerializedTriviaState,
} from '../serializer';
import {
  TriviaGameState,
  Question,
  Team,
  TeamAnswer,
  Timer,
  GameSettings,
  DEFAULT_ROUNDS,
  QUESTIONS_PER_ROUND,
  DEFAULT_TIMER_DURATION,
} from '@/types';

describe('serializer', () => {
  // Test data fixtures
  const mockQuestion1: Question = {
    id: 'q1',
    text: 'What is the capital of France?',
    type: 'multiple_choice',
    correctAnswers: ['A'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Paris', 'London', 'Berlin', 'Madrid'],
    category: 'geography',
    roundIndex: 0,
  };

  const mockQuestion2: Question = {
    id: 'q2',
    text: 'The Earth is flat.',
    type: 'true_false',
    correctAnswers: ['False'],
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    category: 'science',
    roundIndex: 0,
  };

  const mockTeam1: Team = {
    id: 't1',
    name: 'Table 1',
    score: 10,
    tableNumber: 1,
    roundScores: [5, 3, 2],
  };

  const mockTeam2: Team = {
    id: 't2',
    name: 'Table 2',
    score: 8,
    tableNumber: 2,
    roundScores: [4, 2, 2],
  };

  const mockTeamAnswer1: TeamAnswer = {
    teamId: 't1',
    questionId: 'q1',
    answer: 'A',
    isCorrect: true,
    pointsAwarded: 1,
  };

  const mockTimer: Timer = {
    duration: DEFAULT_TIMER_DURATION,
    remaining: DEFAULT_TIMER_DURATION,
    isRunning: false,
  };

  const mockSettings: GameSettings = {
    roundsCount: DEFAULT_ROUNDS,
    questionsPerRound: QUESTIONS_PER_ROUND,
    timerDuration: DEFAULT_TIMER_DURATION,
    timerAutoStart: false,
    timerVisible: true,
    ttsEnabled: false,
  };

  const createMockGameState = (
    overrides?: Partial<TriviaGameState>
  ): TriviaGameState => ({
    sessionId: 'test-session',
    status: 'setup',
    statusBeforePause: null,
    questions: [],
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    currentRound: 0,
    totalRounds: DEFAULT_ROUNDS,
    teams: [],
    teamAnswers: [],
    timer: mockTimer,
    settings: mockSettings,
    showScoreboard: false,
    emergencyBlank: false,
    ttsEnabled: false,
    ...overrides,
  });

  describe('serializeTriviaState', () => {
    it('serializes setup state correctly', () => {
      const state = createMockGameState();
      const serialized = serializeTriviaState(state);

      expect(serialized).toEqual({
        sessionId: 'test-session',
        status: 'setup',
        statusBeforePause: null,
        questions: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: DEFAULT_ROUNDS,
        teams: [],
        teamAnswers: [],
        timer: mockTimer,
        settings: mockSettings,
        showScoreboard: false,
        emergencyBlank: false,
        ttsEnabled: false,
      });
    });

    it('serializes playing state with questions and teams', () => {
      const state = createMockGameState({
        status: 'playing',
        questions: [mockQuestion1, mockQuestion2],
        selectedQuestionIndex: 1,
        displayQuestionIndex: 1,
        currentRound: 1,
        teams: [mockTeam1, mockTeam2],
        teamAnswers: [mockTeamAnswer1],
        showScoreboard: true,
      });
      const serialized = serializeTriviaState(state);

      expect(serialized.status).toBe('playing');
      expect(serialized.questions).toEqual([mockQuestion1, mockQuestion2]);
      expect(serialized.selectedQuestionIndex).toBe(1);
      expect(serialized.displayQuestionIndex).toBe(1);
      expect(serialized.currentRound).toBe(1);
      expect(serialized.teams).toEqual([mockTeam1, mockTeam2]);
      expect(serialized.teamAnswers).toEqual([mockTeamAnswer1]);
      expect(serialized.showScoreboard).toBe(true);
    });

    it('serializes paused state with statusBeforePause', () => {
      const state = createMockGameState({
        status: 'paused',
        statusBeforePause: 'playing',
        questions: [mockQuestion1],
        selectedQuestionIndex: 0,
        displayQuestionIndex: 0,
      });
      const serialized = serializeTriviaState(state);

      expect(serialized.status).toBe('paused');
      expect(serialized.statusBeforePause).toBe('playing');
    });

    it('serializes ended state', () => {
      const state = createMockGameState({
        status: 'ended',
        currentRound: 3,
        teams: [mockTeam1, mockTeam2],
      });
      const serialized = serializeTriviaState(state);

      expect(serialized.status).toBe('ended');
      expect(serialized.currentRound).toBe(3);
    });

    it('preserves emergency blank state', () => {
      const state = createMockGameState({
        emergencyBlank: true,
      });
      const serialized = serializeTriviaState(state);

      expect(serialized.emergencyBlank).toBe(true);
    });

    it('preserves TTS enabled setting', () => {
      const state = createMockGameState({
        ttsEnabled: true,
      });
      const serialized = serializeTriviaState(state);

      expect(serialized.ttsEnabled).toBe(true);
    });

    it('preserves timer state', () => {
      const customTimer: Timer = {
        duration: 45,
        remaining: 30,
        isRunning: true,
      };
      const state = createMockGameState({
        timer: customTimer,
      });
      const serialized = serializeTriviaState(state);

      expect(serialized.timer).toEqual(customTimer);
    });

    it('preserves custom settings', () => {
      const customSettings: GameSettings = {
        roundsCount: 5,
        questionsPerRound: 10,
        timerDuration: 60,
        timerAutoStart: true,
        timerVisible: false,
        ttsEnabled: true,
      };
      const state = createMockGameState({
        settings: customSettings,
      });
      const serialized = serializeTriviaState(state);

      expect(serialized.settings).toEqual(customSettings);
    });
  });

  describe('deserializeTriviaState', () => {
    it('deserializes valid setup state', () => {
      const serialized: SerializedTriviaState = {
        sessionId: 'test-session',
        status: 'setup',
        statusBeforePause: null,
        questions: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: DEFAULT_ROUNDS,
        teams: [],
        teamAnswers: [],
        timer: mockTimer,
        settings: mockSettings,
        showScoreboard: false,
        emergencyBlank: false,
        ttsEnabled: false,
      };

      const deserialized = deserializeTriviaState(serialized);

      expect(deserialized.sessionId).toBe('test-session');
      expect(deserialized.status).toBe('setup');
      expect(deserialized.statusBeforePause).toBeNull();
      expect(deserialized.questions).toEqual([]);
      expect(deserialized.selectedQuestionIndex).toBe(0);
      expect(deserialized.displayQuestionIndex).toBeNull();
      expect(deserialized.currentRound).toBe(0);
      expect(deserialized.totalRounds).toBe(DEFAULT_ROUNDS);
      expect(deserialized.teams).toEqual([]);
      expect(deserialized.teamAnswers).toEqual([]);
      expect(deserialized.timer).toEqual(mockTimer);
      expect(deserialized.settings).toEqual(mockSettings);
      expect(deserialized.showScoreboard).toBe(false);
      expect(deserialized.emergencyBlank).toBe(false);
      expect(deserialized.ttsEnabled).toBe(false);
    });

    it('deserializes playing state with questions and teams', () => {
      const serialized: SerializedTriviaState = {
        sessionId: 'test-session',
        status: 'playing',
        statusBeforePause: null,
        questions: [mockQuestion1, mockQuestion2],
        selectedQuestionIndex: 1,
        displayQuestionIndex: 1,
        currentRound: 1,
        totalRounds: DEFAULT_ROUNDS,
        teams: [mockTeam1, mockTeam2],
        teamAnswers: [mockTeamAnswer1],
        timer: mockTimer,
        settings: mockSettings,
        showScoreboard: true,
        emergencyBlank: false,
        ttsEnabled: false,
      };

      const deserialized = deserializeTriviaState(serialized);

      expect(deserialized.status).toBe('playing');
      expect(deserialized.questions).toEqual([mockQuestion1, mockQuestion2]);
      expect(deserialized.selectedQuestionIndex).toBe(1);
      expect(deserialized.displayQuestionIndex).toBe(1);
      expect(deserialized.currentRound).toBe(1);
      expect(deserialized.teams).toEqual([mockTeam1, mockTeam2]);
      expect(deserialized.teamAnswers).toEqual([mockTeamAnswer1]);
      expect(deserialized.showScoreboard).toBe(true);
    });

    it('applies default for missing showScoreboard', () => {
      const serialized = {
        sessionId: 'test-session',
        status: 'setup',
        statusBeforePause: null,
        questions: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: DEFAULT_ROUNDS,
        teams: [],
        teamAnswers: [],
        timer: mockTimer,
        settings: mockSettings,
        emergencyBlank: false,
        ttsEnabled: false,
      };

      const deserialized = deserializeTriviaState(serialized);

      expect(deserialized.showScoreboard).toBe(false);
    });

    it('applies default for missing emergencyBlank', () => {
      const serialized = {
        sessionId: 'test-session',
        status: 'setup',
        statusBeforePause: null,
        questions: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: DEFAULT_ROUNDS,
        teams: [],
        teamAnswers: [],
        timer: mockTimer,
        settings: mockSettings,
        showScoreboard: false,
        ttsEnabled: false,
      };

      const deserialized = deserializeTriviaState(serialized);

      expect(deserialized.emergencyBlank).toBe(false);
    });

    it('applies default for missing ttsEnabled', () => {
      const serialized = {
        sessionId: 'test-session',
        status: 'setup',
        statusBeforePause: null,
        questions: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: DEFAULT_ROUNDS,
        teams: [],
        teamAnswers: [],
        timer: mockTimer,
        settings: mockSettings,
        showScoreboard: false,
        emergencyBlank: false,
      };

      const deserialized = deserializeTriviaState(serialized);

      expect(deserialized.ttsEnabled).toBe(false);
    });

    describe('error cases', () => {
      it('throws for null data', () => {
        expect(() => deserializeTriviaState(null)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(null)).toThrow('expected object');
      });

      it('throws for undefined data', () => {
        expect(() => deserializeTriviaState(undefined)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(undefined)).toThrow('expected object');
      });

      it('throws for non-object data', () => {
        expect(() => deserializeTriviaState('invalid')).toThrow(SerializationError);
        expect(() => deserializeTriviaState(123)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(true)).toThrow(SerializationError);
      });

      it('throws for missing sessionId', () => {
        const serialized = {
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid sessionId');
      });

      it('throws for missing status', () => {
        const serialized = {
          sessionId: 'test-session',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid status');
      });

      it('throws for invalid status value', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'invalid-status',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid status');
      });

      it('throws for invalid questions (not array)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: 'not-an-array',
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid questions');
      });

      it('throws for invalid questions (invalid question object)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [{ invalid: 'question' }],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid questions');
      });

      it('throws for invalid selectedQuestionIndex (negative)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: -1,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid selectedQuestionIndex');
      });

      it('throws for invalid displayQuestionIndex', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: -1,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid displayQuestionIndex');
      });

      it('throws for invalid currentRound (negative)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: -1,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid currentRound');
      });

      it('throws for invalid totalRounds (zero)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: 0,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid totalRounds');
      });

      it('throws for invalid teams (not array)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: 'not-an-array',
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid teams');
      });

      it('throws for invalid teams (invalid team object)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [{ invalid: 'team' }],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid teams');
      });

      it('throws for invalid team tableNumber (out of range)', () => {
        const invalidTeam = {
          id: 't1',
          name: 'Invalid Table',
          score: 0,
          tableNumber: 21, // Out of range
          roundScores: [],
        };

        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [invalidTeam],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
      });

      it('throws for invalid teamAnswers (not array)', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: 'not-an-array',
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid teamAnswers');
      });

      it('throws for invalid timer', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: { invalid: 'timer' },
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid timer');
      });

      it('throws for invalid settings', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'setup',
          statusBeforePause: null,
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: { invalid: 'settings' },
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid settings');
      });

      it('throws for invalid statusBeforePause', () => {
        const serialized = {
          sessionId: 'test-session',
          status: 'paused',
          statusBeforePause: 'invalid-status',
          questions: [],
          selectedQuestionIndex: 0,
          displayQuestionIndex: null,
          currentRound: 0,
          totalRounds: DEFAULT_ROUNDS,
          teams: [],
          teamAnswers: [],
          timer: mockTimer,
          settings: mockSettings,
          showScoreboard: false,
          emergencyBlank: false,
          ttsEnabled: false,
        };

        expect(() => deserializeTriviaState(serialized)).toThrow(SerializationError);
        expect(() => deserializeTriviaState(serialized)).toThrow('Invalid statusBeforePause');
      });
    });
  });

  describe('round-trip serialization', () => {
    it('preserves state through serialize -> deserialize cycle', () => {
      const originalState = createMockGameState({
        sessionId: 'round-trip-test',
        status: 'playing',
        statusBeforePause: null,
        questions: [mockQuestion1, mockQuestion2],
        selectedQuestionIndex: 1,
        displayQuestionIndex: 1,
        currentRound: 2,
        totalRounds: 5,
        teams: [mockTeam1, mockTeam2],
        teamAnswers: [mockTeamAnswer1],
        timer: {
          duration: 45,
          remaining: 30,
          isRunning: true,
        },
        settings: {
          roundsCount: 5,
          questionsPerRound: 10,
          timerDuration: 45,
          timerAutoStart: true,
          timerVisible: true,
          ttsEnabled: true,
        },
        showScoreboard: true,
        emergencyBlank: false,
        ttsEnabled: true,
      });

      const serialized = serializeTriviaState(originalState);
      const deserialized = deserializeTriviaState(serialized);

      // Compare all serializable fields
      expect(deserialized.sessionId).toBe(originalState.sessionId);
      expect(deserialized.status).toBe(originalState.status);
      expect(deserialized.statusBeforePause).toBe(originalState.statusBeforePause);
      expect(deserialized.questions).toEqual(originalState.questions);
      expect(deserialized.selectedQuestionIndex).toBe(originalState.selectedQuestionIndex);
      expect(deserialized.displayQuestionIndex).toBe(originalState.displayQuestionIndex);
      expect(deserialized.currentRound).toBe(originalState.currentRound);
      expect(deserialized.totalRounds).toBe(originalState.totalRounds);
      expect(deserialized.teams).toEqual(originalState.teams);
      expect(deserialized.teamAnswers).toEqual(originalState.teamAnswers);
      expect(deserialized.timer).toEqual(originalState.timer);
      expect(deserialized.settings).toEqual(originalState.settings);
      expect(deserialized.showScoreboard).toBe(originalState.showScoreboard);
      expect(deserialized.emergencyBlank).toBe(originalState.emergencyBlank);
      expect(deserialized.ttsEnabled).toBe(originalState.ttsEnabled);
    });

    it('preserves state with paused status', () => {
      const originalState = createMockGameState({
        sessionId: 'paused-test',
        status: 'paused',
        statusBeforePause: 'playing',
        questions: [mockQuestion1],
        selectedQuestionIndex: 0,
        displayQuestionIndex: 0,
        currentRound: 1,
        totalRounds: 3,
        teams: [mockTeam1],
        teamAnswers: [],
        timer: mockTimer,
        settings: mockSettings,
        showScoreboard: false,
        emergencyBlank: true,
        ttsEnabled: false,
      });

      const serialized = serializeTriviaState(originalState);
      const deserialized = deserializeTriviaState(serialized);

      expect(deserialized.status).toBe('paused');
      expect(deserialized.statusBeforePause).toBe('playing');
      expect(deserialized.emergencyBlank).toBe(true);
    });
  });
});
