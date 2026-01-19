import { create } from 'zustand';

export type SyncRole = 'presenter' | 'audience';

export interface SyncStore {
  // State
  role: SyncRole | null;
  isConnected: boolean;
  lastSyncTimestamp: number | null;
  connectionError: string | null;

  // Actions
  setRole: (role: SyncRole) => void;
  setConnected: (connected: boolean) => void;
  updateLastSync: () => void;
  setConnectionError: (error: string | null) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncStore>()((set) => ({
  // Initial state
  role: null,
  isConnected: false,
  lastSyncTimestamp: null,
  connectionError: null,

  // Actions
  setRole: (role: SyncRole) => {
    set({ role });
  },

  setConnected: (connected: boolean) => {
    set({
      isConnected: connected,
      connectionError: null,
    });
  },

  updateLastSync: () => {
    set({ lastSyncTimestamp: Date.now() });
  },

  setConnectionError: (error: string | null) => {
    set({ connectionError: error, isConnected: false });
  },

  reset: () => {
    set({
      role: null,
      isConnected: false,
      lastSyncTimestamp: null,
      connectionError: null,
    });
  },
}));
