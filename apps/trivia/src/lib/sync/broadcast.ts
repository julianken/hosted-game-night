import type { TriviaGameState, SyncMessage, SyncMessageType } from '@/types';
import { getChannelName } from './session';

export type MessageHandler = (message: SyncMessage) => void;

/**
 * BroadcastChannel wrapper for dual-screen synchronization.
 * Handles same-device communication between presenter and audience windows.
 */
export class BroadcastSync {
  private channel: BroadcastChannel | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isInitialized = false;
  private channelName: string;

  constructor(channelName: string) {
    this.channelName = channelName;
  }

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
      return false;
    }

    try {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        this.notifyHandlers(event.data);
      };
      this.isInitialized = true;
      return true;
    } catch {
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
  broadcastState(state: TriviaGameState): void {
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
  private send(type: SyncMessageType, payload: TriviaGameState | null): void {
    if (!this.channel) {
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
      // Silently fail - channel may be closed
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
        // Silently fail - handler may throw
      }
    }
  }
}

/**
 * Factory function to create a session-scoped BroadcastSync instance.
 * Each session ID creates an isolated broadcast channel.
 */
export function createTriviaBroadcastSync(sessionId: string): BroadcastSync {
  const channelName = getChannelName(sessionId);
  return new BroadcastSync(channelName);
}

/**
 * Create a message handler that routes messages by type.
 */
export function createMessageRouter(handlers: Partial<{
  onStateUpdate: (state: TriviaGameState) => void;
  onSyncRequest: () => void;
}>): MessageHandler {
  return (message: SyncMessage) => {
    switch (message.type) {
      case 'STATE_UPDATE':
        handlers.onStateUpdate?.(message.payload as TriviaGameState);
        break;
      case 'REQUEST_SYNC':
        handlers.onSyncRequest?.();
        break;
    }
  };
}
