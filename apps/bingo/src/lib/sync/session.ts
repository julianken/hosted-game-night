import { v4 as uuidv4 } from 'uuid';

const CHANNEL_PREFIX = 'beak-bingo-sync';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Offline session ID regex: 6 uppercase alphanumeric chars (excludes 0, O, 1, I)
const OFFLINE_SESSION_REGEX = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

/**
 * Generate a unique session ID for a presenter window.
 * Each presenter gets its own session to isolate sync channels.
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Validate that a session ID is either:
 * - A valid UUID v4 (for online sessions)
 * - A valid 6-character offline session ID
 */
export function isValidSessionId(sessionId: string): boolean {
  return UUID_REGEX.test(sessionId) || OFFLINE_SESSION_REGEX.test(sessionId);
}

/**
 * Get the BroadcastChannel name for a session.
 * Each session gets its own isolated channel.
 */
export function getChannelName(sessionId: string): string {
  return `${CHANNEL_PREFIX}-${sessionId}`;
}
