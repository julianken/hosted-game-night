import { describe, it, expect, beforeEach } from 'vitest';
import { createSyncStore } from '../store';

describe('createSyncStore', () => {
  let useSyncStore: ReturnType<typeof createSyncStore>;

  beforeEach(() => {
    useSyncStore = createSyncStore();
  });

  describe('creation', () => {
    it('should create a Zustand store', () => {
      expect(useSyncStore).toBeDefined();
      expect(typeof useSyncStore).toBe('function');
      expect(typeof useSyncStore.getState).toBe('function');
    });
  });

  describe('initial state', () => {
    it('should have role as null', () => {
      expect(useSyncStore.getState().role).toBeNull();
    });

    it('should have isConnected as false', () => {
      expect(useSyncStore.getState().isConnected).toBe(false);
    });

    it('should have lastSyncTimestamp as null', () => {
      expect(useSyncStore.getState().lastSyncTimestamp).toBeNull();
    });

    it('should have connectionError as null', () => {
      expect(useSyncStore.getState().connectionError).toBeNull();
    });
  });

  describe('setRole', () => {
    it('should update role to presenter', () => {
      useSyncStore.getState().setRole('presenter');
      expect(useSyncStore.getState().role).toBe('presenter');
    });

    it('should update role to audience', () => {
      useSyncStore.getState().setRole('audience');
      expect(useSyncStore.getState().role).toBe('audience');
    });
  });

  describe('setConnected', () => {
    it('should set isConnected to true', () => {
      useSyncStore.getState().setConnected(true);
      expect(useSyncStore.getState().isConnected).toBe(true);
    });

    it('should set isConnected to false', () => {
      useSyncStore.getState().setConnected(true);
      useSyncStore.getState().setConnected(false);
      expect(useSyncStore.getState().isConnected).toBe(false);
    });

    it('should clear connectionError when connected', () => {
      useSyncStore.getState().setConnectionError('Some error');
      expect(useSyncStore.getState().connectionError).toBe('Some error');

      useSyncStore.getState().setConnected(true);
      expect(useSyncStore.getState().connectionError).toBeNull();
    });
  });

  describe('updateLastSync', () => {
    it('should set lastSyncTimestamp to current time', () => {
      const beforeTime = Date.now();
      useSyncStore.getState().updateLastSync();
      const afterTime = Date.now();

      const timestamp = useSyncStore.getState().lastSyncTimestamp;
      expect(timestamp).not.toBeNull();
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('setConnectionError', () => {
    it('should set error message', () => {
      useSyncStore.getState().setConnectionError('Connection failed');
      expect(useSyncStore.getState().connectionError).toBe('Connection failed');
    });

    it('should set isConnected to false', () => {
      useSyncStore.getState().setConnected(true);
      expect(useSyncStore.getState().isConnected).toBe(true);

      useSyncStore.getState().setConnectionError('Error');
      expect(useSyncStore.getState().isConnected).toBe(false);
    });

    it('should accept null to clear error', () => {
      useSyncStore.getState().setConnectionError('Error');
      useSyncStore.getState().setConnectionError(null);
      expect(useSyncStore.getState().connectionError).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      // Set up some state
      useSyncStore.getState().setRole('presenter');
      useSyncStore.getState().setConnected(true);
      useSyncStore.getState().updateLastSync();
      useSyncStore.getState().setConnectionError('Error');

      // Reset
      useSyncStore.getState().reset();

      // Verify all state is cleared
      const state = useSyncStore.getState();
      expect(state.role).toBeNull();
      expect(state.isConnected).toBe(false);
      expect(state.lastSyncTimestamp).toBeNull();
      expect(state.connectionError).toBeNull();
    });
  });

  describe('store independence', () => {
    it('should create independent stores', () => {
      const store1 = createSyncStore();
      const store2 = createSyncStore();

      store1.getState().setRole('presenter');
      store2.getState().setRole('audience');

      expect(store1.getState().role).toBe('presenter');
      expect(store2.getState().role).toBe('audience');
    });
  });
});
