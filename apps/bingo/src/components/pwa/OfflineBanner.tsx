'use client';

import { OfflineBanner as SharedOfflineBanner } from '@joolie-boolie/ui';

/**
 * Bingo offline banner.
 * Informs users that bingo game continues with cached audio.
 */
export function OfflineBanner() {
  return (
    <SharedOfflineBanner message="You're offline. Game continues with cached audio." />
  );
}
