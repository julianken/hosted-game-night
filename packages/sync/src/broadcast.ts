import { SyncMessage, MessageHandler, ConnectionState, BroadcastError, BroadcastSyncOptions } from './types';

/**
 * Generate a unique instance ID for this BroadcastSync instance.
 * Used to identify the origin of messages and prevent sync loops.
 */
function generateInstanceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Latency threshold in milliseconds.
 * Messages taking longer than this to arrive trigger a warning.
 */
const LATENCY_THRESHOLD_MS = 1000;

/**
 * Compute a simple hash of a state payload for divergence detection.
 * Uses a basic string-based approach suitable for client-side use.
 */
function computeStateHash(payload: unknown): string {
  try {
    const str = JSON.stringify(payload);
    // Simple DJB2 hash - fast, good distribution for string comparison
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(36);
  } catch {
    return 'hash-error';
  }
}

/**
 * Configuration for deduplication behavior.
 */
const DEDUP_CONFIG = {
  /** Maximum number of recent message timestamps to track */
  MAX_RECENT_MESSAGES: 100,
  /** Time window in ms to consider messages as duplicates */
  DEDUP_WINDOW_MS: 100,
} as const satisfies Record<string, number>;

/**
 * BroadcastChannel wrapper for dual-screen synchronization.
 * Handles same-device communication between presenter and audience windows.
 *
 * Generic over TPayload - the type of data being synced.
 *
 * Includes protection against sync loops via:
 * 1. Origin tracking - each instance has a unique ID, messages from self are ignored
 * 2. Message deduplication - recent messages within a time window are deduplicated
 *
 * Error observability:
 * - Provides configurable error callbacks via options.onError
 * - Supports debug mode with verbose logging via options.debug
 * - Tracks connection state (disconnected, connected, error)
 *
 * Sync observability:
 * - State hash divergence detection on STATE_UPDATE messages
 * - Message latency monitoring with configurable threshold
 */
export class BroadcastSync<TPayload = unknown> {
  private channel: BroadcastChannel | null = null;
  private handlers: Set<MessageHandler<TPayload>> = new Set();
  private isInitialized = false;
  private channelName: string;
  /** Unique identifier for this instance to prevent processing own messages */
  private readonly instanceId: string;
  /** Track recent message timestamps for deduplication */
  private recentMessageKeys: Set<string> = new Set();
  /** Configuration options for error handling and debugging */
  private readonly options: BroadcastSyncOptions;
  /** Current connection state */
  private _connectionState: ConnectionState = 'disconnected';
  /** Monotonically increasing sequence counter for message uniqueness */
  private sequenceCounter = 0;
  /** Last known state hash for divergence detection */
  private lastStateHash: string | null = null;

  constructor(channelName: string, options: BroadcastSyncOptions = {}) {
    this.channelName = channelName;
    this.instanceId = generateInstanceId();
    this.options = options;
  }

  /**
   * Get the current connection state.
   */
  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Update connection state and log if in debug mode.
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this._connectionState;
    this._connectionState = state;
    this.log(`Connection state changed: ${previousState} -> ${state}`);
  }

  /**
   * Log a message if debug mode is enabled.
   */
  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      const timestamp = new Date().toISOString();
      const prefix = `[BroadcastSync:${this.channelName}]`;
      if (data !== undefined) {
        console.log(`${timestamp} ${prefix} ${message}`, data);
      } else {
        console.log(`${timestamp} ${prefix} ${message}`);
      }
    }
  }

  /**
   * Handle an error by calling the error callback or logging in debug mode.
   */
  private handleError(error: BroadcastError): void {
    this.log(`Error: ${error.code} - ${error.message}`, error.context);
    if (this.options.onError) {
      this.options.onError(error);
    } else if (this.options.debug) {
      console.error(`[BroadcastSync:${this.channelName}] ${error.code}:`, error.message, error.originalError);
    }
  }

  /**
   * Check message latency and warn if it exceeds the threshold.
   */
  private checkMessageLatency(message: SyncMessage<TPayload>): void {
    if (message.sentAt == null) return;

    const latency = Date.now() - message.sentAt;
    if (latency > LATENCY_THRESHOLD_MS) {
      console.warn(JSON.stringify({
        event: 'sync.message.high_latency',
        channel: this.channelName,
        messageType: message.type,
        latencyMs: latency,
        threshold: LATENCY_THRESHOLD_MS,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  /**
   * Check for state hash divergence after applying a STATE_UPDATE.
   * Compares the received hash against a locally computed hash of the payload.
   */
  private checkStateDivergence(message: SyncMessage<TPayload>): void {
    if (message.type !== 'STATE_UPDATE' || message.payload == null || message.stateHash == null) {
      return;
    }

    const localHash = computeStateHash(message.payload);
    this.lastStateHash = localHash;

    if (localHash !== message.stateHash) {
      console.warn(JSON.stringify({
        event: 'sync.state.divergence_detected',
        channel: this.channelName,
        receivedHash: message.stateHash,
        localHash,
        sequenceNumber: message.sequenceNumber,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  /**
   * Get the unique instance ID for this BroadcastSync.
   * Useful for testing and debugging.
   */
  get origin(): string {
    return this.instanceId;
  }

  /**
   * Initialize the broadcast channel.
   * Safe to call multiple times - will only initialize once.
   */
  initialize(): boolean {
    if (this.isInitialized) {
      this.log('Already initialized, skipping');
      return true;
    }

    // Check if BroadcastChannel is available (not available in SSR)
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      this.handleError({
        code: 'CHANNEL_UNAVAILABLE',
        message: 'BroadcastChannel API is not available (SSR or unsupported browser)',
      });
      this.setConnectionState('error');
      return false;
    }

    try {
      this.log('Initializing channel');
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event: MessageEvent<SyncMessage<TPayload>>) => {
        const message = event.data;
        this.log('Message received', { type: message.type, timestamp: message.timestamp });

        // SYNC LOOP PROTECTION 1: Ignore messages from self
        if (message.originId === this.instanceId) {
          this.log('Ignoring message from self');
          return;
        }

        // SYNC LOOP PROTECTION 2: Deduplicate recent messages
        if (this.isDuplicateMessage(message)) {
          this.log('Ignoring duplicate message');
          return;
        }

        // Observability: check message latency
        this.checkMessageLatency(message);

        // Observability: check state divergence for STATE_UPDATE messages
        this.checkStateDivergence(message);

        this.notifyHandlers(message);
      };
      this.channel.onmessageerror = (event: MessageEvent) => {
        this.handleError({
          code: 'HANDLER_ERROR',
          message: 'Failed to deserialize incoming message',
          originalError: event,
        });
      };
      this.isInitialized = true;
      this.setConnectionState('connected');
      return true;
    } catch (err) {
      this.handleError({
        code: 'INIT_FAILED',
        message: 'Failed to create BroadcastChannel',
        originalError: err,
        context: { channelName: this.channelName },
      });
      this.setConnectionState('error');
      return false;
    }
  }

  /**
   * Check if a message is a duplicate based on type, timestamp, and sequence number.
   * This prevents processing the same logical message multiple times
   * within a short time window (e.g., from rapid state changes).
   */
  private isDuplicateMessage(message: SyncMessage<TPayload>): boolean {
    const key = `${message.type}-${message.timestamp}-${message.sequenceNumber ?? ''}`;

    if (this.recentMessageKeys.has(key)) {
      return true;
    }

    // Add to recent messages
    this.recentMessageKeys.add(key);

    // Clean up old entries if we have too many
    if (this.recentMessageKeys.size > DEDUP_CONFIG.MAX_RECENT_MESSAGES) {
      // Convert to array, remove oldest entries (first half)
      const keys = Array.from(this.recentMessageKeys);
      const toRemove = keys.slice(0, Math.floor(keys.length / 2));
      toRemove.forEach((k) => this.recentMessageKeys.delete(k));
    }

    // Schedule cleanup for this specific key after the dedup window
    setTimeout(() => {
      this.recentMessageKeys.delete(key);
    }, DEDUP_CONFIG.DEDUP_WINDOW_MS);

    return false;
  }

  /**
   * Subscribe to incoming messages.
   * Returns an unsubscribe function.
   */
  subscribe(handler: MessageHandler<TPayload>): () => void {
    this.handlers.add(handler);
    this.log('Handler subscribed', { totalHandlers: this.handlers.size });
    return () => {
      this.handlers.delete(handler);
      this.log('Handler unsubscribed', { totalHandlers: this.handlers.size });
    };
  }

  /**
   * Send a typed message on the channel.
   * Includes the instance's originId to enable sync loop prevention.
   */
  send(type: string, payload: TPayload | null): void {
    if (!this.channel) {
      this.handleError({
        code: 'CHANNEL_UNAVAILABLE',
        message: 'Cannot send message: channel not initialized',
        context: { messageType: type },
      });
      return;
    }

    const message: SyncMessage<TPayload> = {
      type,
      payload,
      timestamp: Date.now(),
      originId: this.instanceId,
      sequenceNumber: ++this.sequenceCounter,
      sentAt: Date.now(),
    };

    // Attach state hash for STATE_UPDATE messages
    if (type === 'STATE_UPDATE' && payload != null) {
      message.stateHash = computeStateHash(payload);
      this.lastStateHash = message.stateHash;
    }

    try {
      this.log('Sending message', { type, timestamp: message.timestamp, sequenceNumber: message.sequenceNumber });
      this.channel.postMessage(message);
    } catch (err) {
      this.handleError({
        code: 'SEND_FAILED',
        message: `Failed to send message of type ${type}`,
        originalError: err,
        context: { messageType: type },
      });
    }
  }

  /**
   * Broadcast the full game state.
   */
  broadcastState(state: TPayload): void {
    this.send('STATE_UPDATE', state);
  }

  /**
   * Request a sync from the presenter.
   * Used by audience windows when they first connect.
   */
  requestSync(): void {
    this.send('REQUEST_SYNC', null);
  }

  /**
   * Broadcast CHANNEL_READY signal.
   * Used by presenter to signal that handlers are ready to receive messages.
   */
  broadcastChannelReady(): void {
    this.send('CHANNEL_READY', null);
    this.log('CHANNEL_READY broadcast');
  }

  /**
   * Close the broadcast channel and clean up.
   */
  close(): void {
    this.log('Closing channel');
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.handlers.clear();
    this.recentMessageKeys.clear();
    this.sequenceCounter = 0;
    this.lastStateHash = null;
    this.isInitialized = false;
    this.setConnectionState('disconnected');
  }

  /**
   * Check if the channel is initialized.
   */
  get connected(): boolean {
    return this.isInitialized && this.channel !== null;
  }

  /**
   * Notify all handlers of an incoming message.
   */
  private notifyHandlers(message: SyncMessage<TPayload>): void {
    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch (err) {
        this.handleError({
          code: 'HANDLER_ERROR',
          message: 'Message handler threw an exception',
          originalError: err,
          context: { messageType: message.type },
        });
      }
    }
  }
}

/**
 * Create a BroadcastSync instance for a specific channel.
 */
export function createBroadcastSync<TPayload = unknown>(
  channelName: string,
  options?: BroadcastSyncOptions
): BroadcastSync<TPayload> {
  return new BroadcastSync<TPayload>(channelName, options);
}

/**
 * Create a BroadcastSync instance with debug mode enabled.
 * Useful for development and troubleshooting.
 */
export function createDebugBroadcastSync<TPayload = unknown>(
  channelName: string,
  onError?: (error: BroadcastError) => void
): BroadcastSync<TPayload> {
  return createBroadcastSync<TPayload>(channelName, {
    debug: true,
    onError: onError ?? ((error) => {
      console.error('[BroadcastSync Debug]', error.code, error.message, error);
    }),
  });
}

/**
 * Utility to inspect current sync state for debugging.
 */
export function createSyncDebugger<TPayload>(sync: BroadcastSync<TPayload>): {
  getState: () => { connected: boolean; connectionState: ConnectionState };
  logState: () => void;
} {
  return {
    getState: () => ({
      connected: sync.connected,
      connectionState: sync.connectionState,
    }),
    logState: () => {
      console.log('[BroadcastSync State]', {
        connected: sync.connected,
        connectionState: sync.connectionState,
      });
    },
  };
}
