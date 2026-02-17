// =============================================================================
// SHARED HELPERS
// =============================================================================

/**
 * Deeply freezes an object to prevent mutations in development.
 * Only runs in non-production environments to avoid performance impact.
 *
 * @param obj - The object to freeze
 * @returns The frozen object
 */
export function deepFreeze<T>(obj: T): T {
  // Skip freezing in production for performance
  if (process.env.NODE_ENV === 'production') {
    return obj;
  }

  // Handle null, undefined, and primitives
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all properties
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    if (value !== null && typeof value === 'object' && typeof value !== 'function') {
      deepFreeze(value);
    }
  });

  return obj;
}

/**
 * Ensures a roundScores array is padded to the required length with zeros.
 */
export function padRoundScores(roundScores: number[], totalRounds: number): number[] {
  const padded = [...roundScores];
  while (padded.length < totalRounds) {
    padded.push(0);
  }
  return padded;
}
