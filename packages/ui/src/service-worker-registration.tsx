'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ServiceWorkerRegistrationProps {
  appName: string;
}

interface UpdatePromptProps {
  appName: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

function UpdatePrompt({ appName, onUpdate, onDismiss }: UpdatePromptProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg max-w-sm z-50">
      <p className="font-medium mb-2">New version available</p>
      <p className="text-base opacity-80 mb-3">
        A new version of {appName} is ready. Update now for the latest features.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onUpdate}
          className="min-h-[var(--size-touch)] px-4 py-3 bg-background text-foreground rounded font-medium hover:bg-background/90 transition-colors"
        >
          Update
        </button>
        <button
          onClick={onDismiss}
          className="min-h-[var(--size-touch)] px-4 py-3 opacity-80 hover:opacity-100 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}

export function ServiceWorkerRegistration({ appName }: ServiceWorkerRegistrationProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
      window.location.reload();
    }
  }, [waitingWorker]);

  const handleDismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Only register in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // Skip registration under E2E so tests aren't disrupted by the
    // controllerchange reload. `__E2E_TESTING__` is injected per browser
    // context by `e2e/utils/e2e-flags.ts::applyE2ERuntimeFlags` and is never
    // set in real user sessions.
    if ((window as Window & { __E2E_TESTING__?: boolean }).__E2E_TESTING__) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates on page load
        registration.update();

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });

        // Handle controller change (after skipWaiting)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  }, []);

  if (!updateAvailable) {
    return null;
  }

  return <UpdatePrompt appName={appName} onUpdate={handleUpdate} onDismiss={handleDismiss} />;
}
