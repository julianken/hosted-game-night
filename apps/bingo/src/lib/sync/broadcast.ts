// @canonical - Using local implementation (packages/sync has different API)
import { GameState, BingoBall, BingoPattern, SyncMessage, SyncMessageType } from '@/types';

const CHANNEL_NAME = 'beak-bingo-sync';

export type MessageHandler = (message: SyncMessage) => void;

/**
 * BroadcastChannel wrapper for dual-screen synchronization.
 * Handles same-device communication between presenter and audience windows.
 */
export class BroadcastSync {
  private channel: BroadcastChannel | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isInitialized = false;

  /**
   * Initialize the broadcast channel.
   * Safe to call multiple times - will only initialize once.
   */
  initialize(): boolean {
    if (this.isInitialized) {
      return true;
    }

    // Check if BroadcastChannel is available (not available in SSR)
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      // TODO: Add proper logger
      return false;
    }

    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        this.notifyHandlers(event.data);
      };
      this.isInitialized = true;
      return true;
    } catch {
      // TODO: Add proper logger
      return false;
    }
  }

  /**
   * Subscribe to incoming messages.
   * Returns an unsubscribe function.
   */
  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Broadcast the full game state.
   */
  broadcastState(state: GameState): void {
    this.send('GAME_STATE_UPDATE', state);
  }

  /**
   * Broadcast a ball called event.
   */
  broadcastBallCalled(ball: BingoBall): void {
    this.send('BALL_CALLED', ball);
  }

  /**
   * Broadcast a game reset event.
   */
  broadcastReset(): void {
    this.send('GAME_RESET', null);
  }

  /**
   * Broadcast a pattern change event.
   */
  broadcastPatternChanged(pattern: BingoPattern): void {
    this.send('PATTERN_CHANGED', pattern);
  }

  /**
   * Request a sync from the presenter.
   * Used by audience windows when they first connect.
   */
  requestSync(): void {
    this.send('REQUEST_SYNC', null);
  }

  /**
   * Close the broadcast channel and clean up.
   */
  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.handlers.clear();
    this.isInitialized = false;
  }

  /**
   * Check if the channel is initialized.
   */
  get connected(): boolean {
    return this.isInitialized && this.channel !== null;
  }

  /**
   * Send a message on the channel.
   */
  private send(
    type: SyncMessageType,
    payload: GameState | BingoBall | BingoPattern | null
  ): void {
    if (!this.channel) {
      // TODO: Add proper logger
      return;
    }

    const message: SyncMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    try {
      this.channel.postMessage(message);
    } catch {
      // TODO: Add proper logger
    }
  }

  /**
   * Notify all handlers of an incoming message.
   */
  private notifyHandlers(message: SyncMessage): void {
    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch {
        // TODO: Add proper logger
      }
    }
  }
}

// Singleton instance for the app
export const broadcastSync = new BroadcastSync();

/**
 * Create a message handler that routes messages by type.
 */
export function createMessageRouter(handlers: Partial<{
  onStateUpdate: (state: GameState) => void;
  onBallCalled: (ball: BingoBall) => void;
  onReset: () => void;
  onPatternChanged: (pattern: BingoPattern) => void;
  onSyncRequest: () => void;
}>): MessageHandler {
  return (message: SyncMessage) => {
    switch (message.type) {
      case 'GAME_STATE_UPDATE':
        handlers.onStateUpdate?.(message.payload as GameState);
        break;
      case 'BALL_CALLED':
        handlers.onBallCalled?.(message.payload as BingoBall);
        break;
      case 'GAME_RESET':
        handlers.onReset?.();
        break;
      case 'PATTERN_CHANGED':
        handlers.onPatternChanged?.(message.payload as BingoPattern);
        break;
      case 'REQUEST_SYNC':
        handlers.onSyncRequest?.();
        break;
    }
  };
}
