import { describe, it, expect } from 'vitest';
import {
  createInitialBuzzInState,
  activateBuzzIn,
  deactivateBuzzIn,
  recordBuzz,
  lockBuzzIn,
  unlockBuzzIn,
  resetBuzzIn,
  clearBuzzIn,
  isFirstBuzz,
  getBuzzPosition,
  hasBuzzed,
  keyToTeamIndex,
  getTeamKey,
  getBuzzOrderWithDeltas,
} from '../buzz-in';

describe('buzz-in', () => {
  describe('createInitialBuzzInState', () => {
    it('should create initial state with correct defaults', () => {
      const state = createInitialBuzzInState();

      expect(state.isActive).toBe(false);
      expect(state.firstBuzzTeamId).toBeNull();
      expect(state.buzzTimestamp).toBeNull();
      expect(state.isLocked).toBe(true);
      expect(state.buzzOrder).toEqual([]);
    });
  });

  describe('activateBuzzIn', () => {
    it('should activate buzz-in mode and unlock', () => {
      const initial = createInitialBuzzInState();
      const state = activateBuzzIn(initial);

      expect(state.isActive).toBe(true);
      expect(state.isLocked).toBe(false);
      expect(state.firstBuzzTeamId).toBeNull();
      expect(state.buzzOrder).toEqual([]);
    });

    it('should clear previous buzz data when activating', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      const { state: buzzedState } = recordBuzz(state, 'team-1', 1000);
      const reactivated = activateBuzzIn(buzzedState);

      expect(reactivated.firstBuzzTeamId).toBeNull();
      expect(reactivated.buzzOrder).toEqual([]);
    });
  });

  describe('deactivateBuzzIn', () => {
    it('should deactivate buzz-in mode and lock', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      state = deactivateBuzzIn(state);

      expect(state.isActive).toBe(false);
      expect(state.isLocked).toBe(true);
    });
  });

  describe('recordBuzz', () => {
    it('should record first buzz successfully', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);

      const { state: newState, result } = recordBuzz(state, 'team-1', 1000);

      expect(result.accepted).toBe(true);
      expect(result.isFirst).toBe(true);
      expect(result.position).toBe(1);
      expect(newState.firstBuzzTeamId).toBe('team-1');
      expect(newState.buzzTimestamp).toBe(1000);
      expect(newState.isLocked).toBe(true);
      expect(newState.buzzOrder).toHaveLength(1);
    });

    it('should reject buzz when not active', () => {
      const state = createInitialBuzzInState();
      const { state: newState, result } = recordBuzz(state, 'team-1', 1000);

      expect(result.accepted).toBe(false);
      expect(result.isFirst).toBe(false);
      expect(newState.firstBuzzTeamId).toBeNull();
    });

    it('should reject buzz when locked', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      const { state: buzzedState } = recordBuzz(state, 'team-1', 1000);

      // Try to buzz again while locked
      const { result } = recordBuzz(buzzedState, 'team-2', 1100);

      expect(result.accepted).toBe(false);
    });

    it('should reject duplicate buzz from same team', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);

      // First buzz
      const { state: firstState } = recordBuzz(state, 'team-1', 1000);

      // Unlock and try to buzz again
      const unlockedState = unlockBuzzIn(firstState);
      const { result } = recordBuzz(unlockedState, 'team-1', 1100);

      expect(result.accepted).toBe(false);
      expect(result.isFirst).toBe(true); // They were first originally
      expect(result.position).toBe(1);
    });

    it('should record multiple buzzes in order when unlocked', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);

      // First buzz
      const { state: state1 } = recordBuzz(state, 'team-1', 1000);
      expect(state1.isLocked).toBe(true);

      // Unlock for more buzzes
      let state2 = unlockBuzzIn(state1);

      // Second buzz
      const { state: state3, result: result2 } = recordBuzz(state2, 'team-2', 1050);
      expect(result2.accepted).toBe(true);
      expect(result2.isFirst).toBe(false);
      expect(result2.position).toBe(2);

      // Still locked after second buzz (only first buzz locks)
      expect(state3.isLocked).toBe(false);

      // Third buzz
      const { state: state4, result: result3 } = recordBuzz(state3, 'team-3', 1100);
      expect(result3.accepted).toBe(true);
      expect(result3.position).toBe(3);

      expect(state4.buzzOrder).toHaveLength(3);
      expect(state4.firstBuzzTeamId).toBe('team-1');
    });
  });

  describe('lockBuzzIn', () => {
    it('should lock buzz-in', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      state = lockBuzzIn(state);

      expect(state.isLocked).toBe(true);
    });
  });

  describe('unlockBuzzIn', () => {
    it('should unlock buzz-in when active', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      const { state: buzzedState } = recordBuzz(state, 'team-1', 1000);
      const unlockedState = unlockBuzzIn(buzzedState);

      expect(unlockedState.isLocked).toBe(false);
    });

    it('should not unlock when not active', () => {
      const state = createInitialBuzzInState();
      const unlockedState = unlockBuzzIn(state);

      expect(unlockedState.isLocked).toBe(true);
    });
  });

  describe('resetBuzzIn', () => {
    it('should clear buzz data but keep active state', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      const { state: buzzedState } = recordBuzz(state, 'team-1', 1000);
      const resetState = resetBuzzIn(buzzedState);

      expect(resetState.isActive).toBe(true);
      expect(resetState.firstBuzzTeamId).toBeNull();
      expect(resetState.buzzTimestamp).toBeNull();
      expect(resetState.buzzOrder).toEqual([]);
      expect(resetState.isLocked).toBe(false); // Unlocked because active
    });

    it('should keep locked if not active', () => {
      const state = createInitialBuzzInState();
      const resetState = resetBuzzIn(state);

      expect(resetState.isLocked).toBe(true);
    });
  });

  describe('clearBuzzIn', () => {
    it('should return to initial state', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      const { state: buzzedState } = recordBuzz(state, 'team-1', 1000);
      const clearedState = clearBuzzIn();

      expect(clearedState).toEqual(createInitialBuzzInState());
      expect(clearedState.isActive).toBe(false);
    });
  });

  describe('isFirstBuzz', () => {
    it('should return true for first buzz team', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      const { state: buzzedState } = recordBuzz(state, 'team-1', 1000);

      expect(isFirstBuzz(buzzedState, 'team-1')).toBe(true);
      expect(isFirstBuzz(buzzedState, 'team-2')).toBe(false);
    });

    it('should return false when no buzz yet', () => {
      const state = activateBuzzIn(createInitialBuzzInState());
      expect(isFirstBuzz(state, 'team-1')).toBe(false);
    });
  });

  describe('getBuzzPosition', () => {
    it('should return correct position for each team', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);

      const { state: s1 } = recordBuzz(state, 'team-1', 1000);
      const s2 = unlockBuzzIn(s1);
      const { state: s3 } = recordBuzz(s2, 'team-2', 1050);
      const { state: s4 } = recordBuzz(s3, 'team-3', 1100);

      expect(getBuzzPosition(s4, 'team-1')).toBe(1);
      expect(getBuzzPosition(s4, 'team-2')).toBe(2);
      expect(getBuzzPosition(s4, 'team-3')).toBe(3);
      expect(getBuzzPosition(s4, 'team-4')).toBe(0); // Not buzzed
    });
  });

  describe('hasBuzzed', () => {
    it('should return true for teams that buzzed', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);
      const { state: buzzedState } = recordBuzz(state, 'team-1', 1000);

      expect(hasBuzzed(buzzedState, 'team-1')).toBe(true);
      expect(hasBuzzed(buzzedState, 'team-2')).toBe(false);
    });
  });

  describe('getBuzzOrderWithDeltas', () => {
    it('should return buzz order with time deltas from first buzz', () => {
      let state = createInitialBuzzInState();
      state = activateBuzzIn(state);

      const { state: s1 } = recordBuzz(state, 'team-1', 1000);
      const s2 = unlockBuzzIn(s1);
      const { state: s3 } = recordBuzz(s2, 'team-2', 1050);
      const { state: s4 } = recordBuzz(s3, 'team-3', 1150);

      const order = getBuzzOrderWithDeltas(s4);

      expect(order).toHaveLength(3);
      expect(order[0]).toEqual({ teamId: 'team-1', delta: 0 });
      expect(order[1]).toEqual({ teamId: 'team-2', delta: 50 });
      expect(order[2]).toEqual({ teamId: 'team-3', delta: 150 });
    });

    it('should return empty array when no buzzes', () => {
      const state = activateBuzzIn(createInitialBuzzInState());
      expect(getBuzzOrderWithDeltas(state)).toEqual([]);
    });
  });

  describe('keyToTeamIndex', () => {
    it('should map digit keys 1-9 to indices 0-8', () => {
      expect(keyToTeamIndex('1')).toBe(0);
      expect(keyToTeamIndex('2')).toBe(1);
      expect(keyToTeamIndex('3')).toBe(2);
      expect(keyToTeamIndex('4')).toBe(3);
      expect(keyToTeamIndex('5')).toBe(4);
      expect(keyToTeamIndex('6')).toBe(5);
      expect(keyToTeamIndex('7')).toBe(6);
      expect(keyToTeamIndex('8')).toBe(7);
      expect(keyToTeamIndex('9')).toBe(8);
    });

    it('should map digit key 0 to index 9', () => {
      expect(keyToTeamIndex('0')).toBe(9);
    });

    it('should map numpad keys', () => {
      expect(keyToTeamIndex('Numpad1')).toBe(0);
      expect(keyToTeamIndex('Numpad0')).toBe(9);
    });

    it('should return null for non-digit keys', () => {
      expect(keyToTeamIndex('a')).toBeNull();
      expect(keyToTeamIndex('Space')).toBeNull();
      expect(keyToTeamIndex('Enter')).toBeNull();
    });
  });

  describe('getTeamKey', () => {
    it('should return correct key for each team index', () => {
      expect(getTeamKey(0)).toBe('1');
      expect(getTeamKey(1)).toBe('2');
      expect(getTeamKey(8)).toBe('9');
      expect(getTeamKey(9)).toBe('0');
    });

    it('should return null for invalid indices', () => {
      expect(getTeamKey(-1)).toBeNull();
      expect(getTeamKey(10)).toBeNull();
      expect(getTeamKey(100)).toBeNull();
    });
  });
});
