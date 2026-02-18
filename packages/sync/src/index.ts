// Types
export type {
  SyncRole,
  SyncMessage,
  SyncState,
  SyncActions,
  SyncStore,
  UseSyncConfig,
  MessageHandler,
  ConnectionState,
  BroadcastError,
  BroadcastSyncOptions,
  HeartbeatMessage,
  SyncHeartbeatConfig,
  HeartbeatDivergence,
} from './types';

// Broadcast channel
export {
  BroadcastSync,
  createBroadcastSync,
  createDebugBroadcastSync,
  createSyncDebugger,
  computeStateHash,
} from './broadcast';

// Store
export { createSyncStore, useSyncStore, type UseSyncStore } from './store';

// Hooks
export { useSync } from './use-sync';

// Heartbeat monitoring
export { SyncHeartbeat } from './heartbeat';
export type { UseSyncHeartbeatOptions, UseSyncHeartbeatReturn } from './use-sync-heartbeat';
export { useSyncHeartbeat } from './use-sync-heartbeat';

// Observability
export {
  createGameLifecycleLogger,
  type GameObservabilityContext,
  type GameLifecycleLogger,
} from './observability';

// Session link utilities
export type {
  GameType,
  SessionLinkData,
  GenerateSessionLinkOptions,
  ParseSessionLinkResult,
} from './session-link';

export {
  SESSION_LINK_PARAMS,
  GAME_PATHS,
  VALID_GAME_TYPES,
  VALID_ROLES,
  generateSessionId,
  isValidSessionId,
  isValidGameType,
  isValidRole,
  generateSessionLink,
  parseSessionLink,
  parseCurrentUrlSession,
  hasSessionParams,
  getSessionIdFromUrl,
  getRoleFromUrl,
  createChannelName,
} from './session-link';

// Session storage
export type {
  SessionParticipant,
  SessionState,
  RecentSession,
} from './session-storage';

export {
  getSessionState,
  saveSessionState,
  clearSessionState,
  createSession,
  joinSession,
  leaveSession,
  isInSession,
  updateActivity,
  addParticipant,
  removeParticipant,
  updateParticipant,
  getParticipantCounts,
  getRecentSessions,
  addToRecentSessions,
  updateRecentSessionActivity,
  clearRecentSessions,
  removeFromRecentSessions,
} from './session-storage';

// Room code generator
export {
  BIRD_WORDS,
  generateRoomCode,
  isValidRoomCode,
  parseRoomCode,
} from './room-code';

// Auto-sync hook
export type { AutoSyncConfig, UseAutoSyncReturn } from './use-auto-sync';
export { useAutoSync } from './use-auto-sync';

// Session recovery hook
export type {
  SessionToken,
  SessionRecoveryHookOptions,
  SessionRecoveryState,
} from './use-session-recovery';
export { useSessionRecovery } from './use-session-recovery';

// Presenter session hook
export type {
  PresenterSessionMode,
  CreateRoomOptions,
  UsePresenterSessionOptions,
  UsePresenterSessionReturn,
} from './use-presenter-session';
export {
  usePresenterSession,
  generateSecurePin,
  generateShortSessionId,
} from './use-presenter-session';
