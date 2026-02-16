'use client';

import { useEffect, useState, useCallback } from 'react';

interface UpdatePromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

function UpdatePrompt({ onUpdate, onDismiss }: UpdatePromptProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-indigo-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <p className="font-medium mb-2">New version available</p>
      <p className="text-base text-indigo-100 mb-3">
        A new version of Beak Bingo is ready. Update now for the latest features.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onUpdate}
          className="min-h-[var(--size-touch)] px-4 py-3 bg-white text-indigo-600 rounded font-medium hover:bg-indigo-50 transition-colors"
        >
          Update
        </button>
        <button
          onClick={onDismiss}
          className="min-h-[var(--size-touch)] px-4 py-3 text-indigo-100 hover:text-white transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}

export function ServiceWorkerRegistration() {
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

  return <UpdatePrompt onUpdate={handleUpdate} onDismiss={handleDismiss} />;
}
