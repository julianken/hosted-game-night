/**
 * Sync role in the dual-screen system.
 * - presenter: Controls the game, broadcasts state changes
 * - audience: Receives and displays state from presenter
 */
export type SyncRole = 'presenter' | 'audience';

/**
 * Generic sync message wrapper.
 * TPayload is the game-specific payload type.
 */
export interface SyncMessage<TPayload = unknown> {
  type: string;
  payload: TPayload | null;
  timestamp: number;
  /** Unique identifier of the sender instance to prevent echo/loop issues */
  originId?: string;
  /** Monotonically increasing sequence number to ensure message uniqueness */
  sequenceNumber?: number;
  /** Timestamp when message was sent, used for latency detection */
  sentAt?: number;
  /** Hash of the state payload for divergence detection */
  stateHash?: string;
}

/**
 * Sync store state interface.
 */
export interface SyncState {
  role: SyncRole | null;
  isConnected: boolean;
  lastSyncTimestamp: number | null;
  connectionError: string | null;
}

/**
 * Sync store actions interface.
 */
export interface SyncActions {
  setRole: (role: SyncRole) => void;
  setConnected: (connected: boolean) => void;
  updateLastSync: () => void;
  setConnectionError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Complete sync store interface.
 */
export type SyncStore = SyncState & SyncActions;

/**
 * Configuration for the useSync hook.
 */
export interface UseSyncConfig<TState> {
  /** Role of this window in the sync system */
  role: SyncRole;
  /** Channel name for BroadcastChannel (should be unique per game) */
  channelName: string;
  /** Get the current game state to broadcast */
  getCurrentState: () => TState;
  /** Apply received state from presenter */
  onStateUpdate: (state: TState) => void;
  /** Optional: Handle sync request (presenter only) */
  onSyncRequest?: () => void;
}

/**
 * Message handler function type.
 */
export type MessageHandler<TPayload = unknown> = (
  message: SyncMessage<TPayload>
) => void;

/**
 * Connection state for the broadcast channel.
 */
export type ConnectionState = 'disconnected' | 'connected' | 'error';

/**
 * Error context provided to error callbacks.
 */
export interface BroadcastError {
  code: 'INIT_FAILED' | 'SEND_FAILED' | 'HANDLER_ERROR' | 'CHANNEL_UNAVAILABLE';
  message: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

/**
 * Configuration options for BroadcastSync.
 */
export interface BroadcastSyncOptions {
  /** Called when an error occurs. If not provided, errors are logged in debug mode. */
  onError?: (error: BroadcastError) => void;
  /** Enable verbose logging of all messages and state changes. */
  debug?: boolean;
}
