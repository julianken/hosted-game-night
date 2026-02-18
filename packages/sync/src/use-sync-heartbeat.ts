'use client';

import { useEffect, useRef, useState } from 'react';
import { BroadcastSync } from './broadcast';
import { SyncHeartbeat } from './heartbeat';
import type { SyncRole, SyncHeartbeatConfig } from './types';

export interface UseSyncHeartbeatOptions<TPayload = unknown> {
  /** The BroadcastSync instance used for communication. */
  broadcastSync: BroadcastSync<TPayload>;
  /** Function that returns the current game state (should not require React subscription). */
  getState: () => TPayload;
  /** The sync role of this instance ('presenter' or 'audience'). */
  role: SyncRole;
  /** The BroadcastChannel name (e.g., 'jb-bingo-sync-<sessionId>'). */
  channelName: string;
  /** Optional heartbeat configuration overrides. */
  config?: SyncHeartbeatConfig;
}

export interface UseSyncHeartbeatReturn {
  /** Whether the heartbeat monitor is currently running. */
  isRunning: boolean;
}

/**
 * React hook that wraps the SyncHeartbeat class for lifecycle management.
 *
 * Creates a SyncHeartbeat instance, starts it on mount, and stops it on unmount.
 * Follows the same ref-based lifecycle pattern used by the app-level useSync hooks.
 *
 * @example
 * ```tsx
 * useSyncHeartbeat({
 *   broadcastSync,
 *   getState: () => useGameStore.getState(),
 *   role: 'presenter',
 *   channelName: 'jb-bingo-sync-abc123',
 * });
 * ```
 */
export function useSyncHeartbeat<TPayload = unknown>({
  broadcastSync,
  getState,
  role,
  channelName,
  config,
}: UseSyncHeartbeatOptions<TPayload>): UseSyncHeartbeatReturn {
  const heartbeatRef = useRef<SyncHeartbeat<TPayload> | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const heartbeat = new SyncHeartbeat<TPayload>(
      broadcastSync,
      getState,
      role,
      channelName,
      config,
    );
    heartbeatRef.current = heartbeat;

    heartbeat.start();
    setIsRunning(true);

    return () => {
      heartbeat.stop();
      heartbeatRef.current = null;
      setIsRunning(false);
    };
  }, [broadcastSync, getState, role, channelName, config]);

  return { isRunning };
}
