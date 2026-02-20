'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/stores/game-store';

/**
 * Return type for useQuickScore hook.
 */
export interface UseQuickScoreReturn {
  /** Whether the given teamId has been scored for the current question. */
  isTeamScored: (teamId: string) => boolean;
  /**
   * Toggle a team's score for the current question.
   * If team is not yet scored: adds +1 and records in set.
   * If team is already scored: removes -1 and removes from set.
   * Pushes to history stack for undo support.
   */
  toggleTeam: (teamId: string) => void;
  /**
   * Undo the last toggleTeam action.
   * Reverses the score adjustment and removes from history.
   */
  undo: () => void;
  /**
   * Clear all scored teams and reset history for the current question.
   * Does NOT reverse score adjustments — only resets tracking state.
   */
  clear: () => void;
  /** Set of teamIds that have been scored for the current question. */
  scoredTeamIds: Set<string>;
}

interface HistoryEntry {
  teamId: string;
  action: 'add' | 'remove';
}

/**
 * useQuickScore (T2.1)
 *
 * Per-question team scoring via keyboard (1-9 keys) with toggle, undo, and clear.
 * Maintains a Set<string> of scored team IDs per question. Resets when
 * selectedQuestionIndex changes.
 *
 * Score adjustments are applied directly to the game store via adjustTeamScore().
 * The history stack enables Ctrl+Z undo of individual toggles.
 *
 * State is local (not synced) — this is presenter-only quick-score state.
 */
export function useQuickScore(selectedQuestionIndex: number | null): UseQuickScoreReturn {
  const adjustTeamScore = useGameStore((state) => state.adjustTeamScore);

  const [scoredTeamIds, setScoredTeamIds] = useState<Set<string>>(new Set());
  const historyRef = useRef<HistoryEntry[]>([]);
  const prevQuestionIndexRef = useRef<number | null>(selectedQuestionIndex);

  // Reset when question changes
  useEffect(() => {
    if (prevQuestionIndexRef.current !== selectedQuestionIndex) {
      prevQuestionIndexRef.current = selectedQuestionIndex;
      setScoredTeamIds(new Set());
      historyRef.current = [];
    }
  }, [selectedQuestionIndex]);

  const isTeamScored = useCallback(
    (teamId: string) => scoredTeamIds.has(teamId),
    [scoredTeamIds],
  );

  const toggleTeam = useCallback(
    (teamId: string) => {
      setScoredTeamIds((prev) => {
        const next = new Set(prev);
        if (prev.has(teamId)) {
          // Team already scored — remove and decrement
          next.delete(teamId);
          adjustTeamScore(teamId, -1);
          historyRef.current.push({ teamId, action: 'remove' });
        } else {
          // Team not yet scored — add and increment
          next.add(teamId);
          adjustTeamScore(teamId, 1);
          historyRef.current.push({ teamId, action: 'add' });
        }
        return next;
      });
    },
    [adjustTeamScore],
  );

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.length === 0) return;

    const last = history[history.length - 1];
    history.pop();

    if (last.action === 'add') {
      // Undo an add: remove from set and decrement score
      setScoredTeamIds((prev) => {
        const next = new Set(prev);
        next.delete(last.teamId);
        return next;
      });
      adjustTeamScore(last.teamId, -1);
    } else {
      // Undo a remove: add back to set and increment score
      setScoredTeamIds((prev) => {
        const next = new Set(prev);
        next.add(last.teamId);
        return next;
      });
      adjustTeamScore(last.teamId, 1);
    }
  }, [adjustTeamScore]);

  const clear = useCallback(() => {
    setScoredTeamIds(new Set());
    historyRef.current = [];
  }, []);

  return { isTeamScored, toggleTeam, undo, clear, scoredTeamIds };
}
