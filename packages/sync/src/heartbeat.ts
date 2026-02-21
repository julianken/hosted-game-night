import { BroadcastSync, computeStateHash } from './broadcast';
import { SyncHeartbeatConfig, HeartbeatDivergence, SyncRole, SyncMessage } from './types';

/**
 * Default heartbeat interval (5 seconds).
 */
const DEFAULT_INTERVAL_MS = 5000;

/**
 * Default divergence threshold (5 seconds).
 * States must diverge for this long before a warning is emitted.
 */
const DEFAULT_DIVERGENCE_THRESHOLD_MS = 5000;

/**
 * The heartbeat message type constant.
 */
const HEARTBEAT_TYPE = 'HEARTBEAT';

/**
 * Shape of the heartbeat payload sent over BroadcastChannel.
 * We embed the hash in the payload since BroadcastSync.send() only
 * attaches stateHash for STATE_UPDATE messages.
 */
interface HeartbeatPayload {
  hash: string;
  role: SyncRole;
}

/**
 * SyncHeartbeat monitors state consistency between presenter and display
 * by periodically comparing state hashes via BroadcastChannel.
 *
 * How it works:
 * 1. Each side periodically sends a HEARTBEAT message containing its current state hash.
 * 2. When a HEARTBEAT is received, the local hash is compared to the remote hash.
 * 3. If hashes diverge for longer than the configured threshold, a warning is logged
 *    and the onDivergence callback is invoked.
 * 4. When hashes converge again, the onConvergence callback is invoked.
 *
 * Usage:
 * ```ts
 * const heartbeat = new SyncHeartbeat(
 *   broadcastSync,
 *   () => gameStore.getState(),
 *   'presenter',
 *   'jb-bingo-session-123',
 *   { divergenceThresholdMs: 5000 },
 * );
 * heartbeat.start();
 * // ... later
 * heartbeat.stop();
 * ```
 */
export class SyncHeartbeat<TPayload = unknown> {
  private readonly broadcastSync: BroadcastSync<TPayload>;
  private readonly getState: () => TPayload;
  private readonly role: SyncRole;
  private readonly channelName: string;
  private readonly config: Required<SyncHeartbeatConfig>;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;

  /** Timestamp when divergence was first detected (null = not diverged) */
  private divergenceStartedAt: number | null = null;
  /** Whether we have already fired the divergence callback for the current divergence */
  private divergenceReported = false;
  /** Whether the heartbeat is running */
  private _isRunning = false;

  constructor(
    broadcastSync: BroadcastSync<TPayload>,
    getState: () => TPayload,
    role: SyncRole,
    channelName: string,
    config: SyncHeartbeatConfig = {},
  ) {
    this.broadcastSync = broadcastSync;
    this.getState = getState;
    this.role = role;
    this.channelName = channelName;
    this.config = {
      intervalMs: config.intervalMs ?? DEFAULT_INTERVAL_MS,
      divergenceThresholdMs: config.divergenceThresholdMs ?? DEFAULT_DIVERGENCE_THRESHOLD_MS,
      onDivergence: config.onDivergence ?? (() => {}),
      onConvergence: config.onConvergence ?? (() => {}),
    };
  }

  /**
   * Whether the heartbeat monitor is currently running.
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Start the heartbeat monitor.
   * Begins sending periodic heartbeat messages and listening for remote heartbeats.
   */
  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;

    // Subscribe to incoming heartbeat messages
    this.unsubscribe = this.broadcastSync.subscribe((message: SyncMessage<TPayload>) => {
      if (message.type === HEARTBEAT_TYPE && message.payload != null) {
        const payload = message.payload as unknown as HeartbeatPayload;
        if (typeof payload.hash === 'string') {
          this.handleRemoteHeartbeat(payload.hash);
        }
      }
    });

    // Send heartbeats at the configured interval
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.intervalMs);

    // Send an initial heartbeat immediately
    this.sendHeartbeat();
  }

  /**
   * Stop the heartbeat monitor and clean up.
   */
  stop(): void {
    if (!this._isRunning) return;
    this._isRunning = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.unsubscribe !== null) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.divergenceStartedAt = null;
    this.divergenceReported = false;
  }

  /**
   * Send a heartbeat message containing the current state hash.
   */
  private sendHeartbeat(): void {
    if (!this.broadcastSync.connected) {
      return;
    }
    const state = this.getState();
    const hash = computeStateHash(state);

    // Embed the hash in the payload so it travels with the message.
    // We cast to TPayload since BroadcastSync is generic, but HEARTBEAT
    // messages always use HeartbeatPayload shape internally.
    const heartbeatPayload: HeartbeatPayload = { hash, role: this.role };
    this.broadcastSync.send(HEARTBEAT_TYPE, heartbeatPayload as unknown as TPayload);
  }

  /**
   * Handle a heartbeat received from the remote side.
   */
  private handleRemoteHeartbeat(remoteHash: string): void {
    const localHash = computeStateHash(this.getState());

    if (localHash === remoteHash) {
      // States match - if we were in a divergence, report convergence
      if (this.divergenceStartedAt !== null) {
        this.divergenceStartedAt = null;
        if (this.divergenceReported) {
          this.divergenceReported = false;
          console.debug(JSON.stringify({
            event: 'sync.heartbeat.converged',
            channel: this.channelName,
            role: this.role,
            hash: localHash,
            timestamp: new Date().toISOString(),
          }));
          this.config.onConvergence();
        }
      }
    } else {
      // States diverge
      const now = Date.now();
      if (this.divergenceStartedAt === null) {
        this.divergenceStartedAt = now;
      }

      const divergedForMs = now - this.divergenceStartedAt;
      if (divergedForMs >= this.config.divergenceThresholdMs && !this.divergenceReported) {
        this.divergenceReported = true;

        const details: HeartbeatDivergence = {
          localHash,
          remoteHash,
          divergedForMs,
          channel: this.channelName,
        };

        console.warn(JSON.stringify({
          event: 'sync.heartbeat.divergence',
          channel: this.channelName,
          role: this.role,
          localHash,
          remoteHash,
          divergedForMs,
          thresholdMs: this.config.divergenceThresholdMs,
          timestamp: new Date().toISOString(),
        }));

        this.config.onDivergence(details);
      }
    }
  }
}
