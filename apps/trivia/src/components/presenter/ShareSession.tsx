'use client';

export { type ShareSessionProps } from '@joolie-boolie/ui';
import { ShareSession as SharedShareSession, type ShareSessionProps } from '@joolie-boolie/ui';

/**
 * Trivia-specific ShareSession wrapper.
 * Delegates to the shared @joolie-boolie/ui ShareSession with gameType="trivia".
 */
export function ShareSession({ sessionId, isConnected }: Omit<ShareSessionProps, 'gameType'>) {
  return (
    <SharedShareSession
      sessionId={sessionId}
      isConnected={isConnected}
      gameType="trivia"
    />
  );
}
