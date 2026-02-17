import { useState, useEffect, useSyncExternalStore } from 'react';

/**
 * Subscribe to online/offline events.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/**
 * Get current online status.
 */
function getSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Server-side snapshot - assume online.
 */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * SSR-safe hook to track online/offline status.
 * Uses useSyncExternalStore for proper hydration handling.
 *
 * @returns true if online, false if offline
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to track connection quality changes.
 * Provides more detailed network information when available.
 */
export function useConnectionInfo() {
  const isOnline = useOnlineStatus();
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation })?.connection;
    if (!connection) return;

    const updateConnection = () => {
      setConnectionType(connection.type ?? null);
      setEffectiveType(connection.effectiveType ?? null);
    };

    updateConnection();
    connection.addEventListener('change', updateConnection);
    return () => connection.removeEventListener('change', updateConnection);
  }, []);

  return {
    isOnline,
    connectionType,
    effectiveType,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
  };
}

/**
 * Network Information API types.
 */
interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}
