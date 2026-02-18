'use client';

import { useEffect } from 'react';

export function FaroInit() {
  useEffect(() => {
    import('@joolie-boolie/error-tracking/faro')
      .then(({ initFaro }) => {
        initFaro({ appName: 'bingo' });
      })
      .catch(() => {
        // Non-critical
      });
  }, []);

  return null;
}
