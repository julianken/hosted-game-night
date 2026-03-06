import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore, useGameSelectors } from '../game-store';
import { renderHook, act } from '@testing-library/react';

// Mock sync module
vi.mock('@joolie-boolie/sync', () => ({
  createGameLifecycleLogger: () => ({
    emit: vi.fn(),
  }),
}));

describe('setup-flow-sync', () => {
  beforeEach(() => {
    // Reset store to initial state
    const { resetGame } = useGameStore.getState();
    resetGame();
  });

  it('useGameSelectors exposes validation with correct initial state', () => {
    const { result } = renderHook(() => useGameSelectors());

    // Initial state has SAMPLE_QUESTIONS but no teams = V4 BLOCK
    expect(result.current.validation).toBeDefined();
    expect(result.current.validation.canStart).toBe(false);
    expect(result.current.validation.blockCount).toBeGreaterThanOrEqual(1);
  });

  it('validation updates reactively when questions are imported', () => {
    const { result: selectorsResult } = renderHook(() => useGameSelectors());

    // Initially blocked
    expect(selectorsResult.current.validation.canStart).toBe(false);

    // Import questions
    act(() => {
      useGameStore.getState().importQuestions([
        {
          id: 'q1' as import('@/types').QuestionId,
          text: 'Test?',
          type: 'true_false',
          correctAnswers: ['True'],
          options: ['True', 'False'],
          optionTexts: ['True', 'False'],
          category: 'general_knowledge',
          roundIndex: 0,
        },
      ], 'replace');
    });

    // Still blocked (no teams)
    expect(selectorsResult.current.validation.canStart).toBe(false);
    // But V1 should be resolved
    const blockIssues = selectorsResult.current.validation.issues.filter(
      (i: { severity: string }) => i.severity === 'block'
    );
    // V4 (no teams) should still be present
    expect(blockIssues.some((i: { id: string }) => i.id === 'V4')).toBe(true);
    // V1 (no questions) should be gone
    expect(blockIssues.some((i: { id: string }) => i.id === 'V1')).toBe(false);
  });

  it('validation becomes canStart=true when both questions and teams exist', () => {
    const { result: selectorsResult } = renderHook(() => useGameSelectors());

    act(() => {
      const store = useGameStore.getState();
      // importQuestions no longer overrides roundsCount; set it explicitly
      // (in the real app, SetupGate syncs settings store → game store)
      store.updateSettings({ roundsCount: 1 });
      store.importQuestions([
        {
          id: 'q1' as import('@/types').QuestionId,
          text: 'Test?',
          type: 'true_false',
          correctAnswers: ['True'],
          options: ['True', 'False'],
          optionTexts: ['True', 'False'],
          category: 'general_knowledge',
          roundIndex: 0,
        },
      ], 'replace');
      store.addTeam('Team A');
    });

    expect(selectorsResult.current.validation.canStart).toBe(true);
    expect(selectorsResult.current.validation.blockCount).toBe(0);
  });
});
