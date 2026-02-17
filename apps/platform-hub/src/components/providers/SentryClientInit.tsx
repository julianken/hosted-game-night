'use client';

import { useEffect } from 'react';

export function SentryClientInit() {
  useEffect(() => {
    import('../../../sentry.client.config').catch(() => {
      // Silently fail -- Sentry is not critical to app function.
    });
  }, []);

  return null;
}
