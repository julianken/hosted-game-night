'use client';

export { type ShareSessionProps } from '@joolie-boolie/ui';
import { ShareSession as SharedShareSession, type ShareSessionProps } from '@joolie-boolie/ui';

/**
 * Bingo-specific ShareSession wrapper.
 * Delegates to the shared @joolie-boolie/ui ShareSession with gameType="bingo".
 */
export function ShareSession({ sessionId, isConnected }: Omit<ShareSessionProps, 'gameType'>) {
  return (
    <SharedShareSession
      sessionId={sessionId}
      isConnected={isConnected}
      gameType="bingo"
    />
  );
}
