import { v4 as uuidv4 } from 'uuid';

const CHANNEL_PREFIX = 'jb-bingo-sync';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a unique session ID for a presenter window.
 * Each presenter gets its own session to isolate sync channels.
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Validate that a session ID is a valid UUID v4.
 */
export function isValidSessionId(sessionId: string): boolean {
  return UUID_REGEX.test(sessionId);
}

/**
 * Get the BroadcastChannel name for a session.
 * Each session gets its own isolated channel.
 */
export function getChannelName(sessionId: string): string {
  return `${CHANNEL_PREFIX}-${sessionId}`;
}
