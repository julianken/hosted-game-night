'use client';

import { WaitingDisplay } from '@/components/audience/WaitingDisplay';

export interface WaitingSceneProps {
  message?: string;
}

/**
 * WaitingScene (T1.9)
 *
 * Wraps the existing WaitingDisplay component for use in SceneRouter.
 * Renders the cinematic "Trivia" wordmark with a configurable status message.
 */
export function WaitingScene({ message = 'Waiting for presenter...' }: WaitingSceneProps) {
  return <WaitingDisplay message={message} />;
}
