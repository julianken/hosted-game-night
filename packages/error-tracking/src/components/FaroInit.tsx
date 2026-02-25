'use client';

import { useEffect } from 'react';

interface FaroInitProps {
  appName: string;
}

export function FaroInit({ appName }: FaroInitProps) {
  useEffect(() => {
    import('@joolie-boolie/error-tracking/faro')
      .then(({ initFaro }) => {
        initFaro({ appName });
      })
      .catch(() => {
        // Non-critical
      });
  }, [appName]);

  return null;
}
