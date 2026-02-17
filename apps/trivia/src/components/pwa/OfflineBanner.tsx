'use client';

import { OfflineBanner as SharedOfflineBanner } from '@joolie-boolie/ui';

/**
 * Trivia offline banner.
 * Informs users that trivia game continues with cached questions.
 */
export function OfflineBanner() {
  return (
    <SharedOfflineBanner message="You're offline. Game continues with cached questions." />
  );
}
