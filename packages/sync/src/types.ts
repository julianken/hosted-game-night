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
  code: 'INIT_FAILED' | 'SEND_FAILED' | 'HANDLER_ERROR' | 'CHANNEL_UNAVAILABLE' | 'MESSAGE_TIMEOUT';
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
  /**
   * Timeout in milliseconds for detecting when no messages are received.
   * After initialization, if no message arrives within this window, a timeout
   * event is logged and the onTimeout callback is invoked.
   * Set to 0 to disable. @default 0 (disabled)
   */
  messageTimeoutMs?: number;
  /**
   * Called when no messages are received within the messageTimeoutMs window.
   * Provides the elapsed time since the last received message.
   */
  onTimeout?: (elapsedMs: number) => void;
  /** Called whenever connection state transitions (e.g. connected, disconnected, error). */
  onConnectionChange?: (state: ConnectionState) => void;
}

/**
 * Heartbeat message type used for periodic state hash comparison.
 */
export interface HeartbeatMessage {
  type: 'HEARTBEAT';
  stateHash: string;
  timestamp: number;
  originId: string;
  role: SyncRole;
}

/**
 * Configuration for SyncHeartbeat.
 */
export interface SyncHeartbeatConfig {
  /** Interval in milliseconds between heartbeat checks. @default 5000 */
  intervalMs?: number;
  /** Duration in milliseconds of sustained divergence before logging a warning. @default 5000 */
  divergenceThresholdMs?: number;
  /** Called when state divergence is detected and persists beyond the threshold. */
  onDivergence?: (details: HeartbeatDivergence) => void;
  /** Called when a previously diverged state converges back. */
  onConvergence?: () => void;
}

/**
 * Details about a detected heartbeat divergence.
 */
export interface HeartbeatDivergence {
  localHash: string;
  remoteHash: string;
  divergedForMs: number;
  channel: string;
}
