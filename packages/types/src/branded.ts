/**
 * Branded types for compile-time ID safety.
 *
 * Branded types prevent accidental mixing of structurally identical types
 * (e.g., passing a TeamId where a QuestionId is expected). They are purely
 * compile-time constructs with zero runtime cost.
 *
 * @example
 * ```ts
 * import type { TeamId, QuestionId } from '@joolie-boolie/types/branded';
 * import { makeTeamId, makeQuestionId } from '@joolie-boolie/types/branded';
 *
 * const tid = makeTeamId('team-1');
 * const qid = makeQuestionId('q-1');
 *
 * // Type error: TeamId is not assignable to QuestionId
 * const wrong: QuestionId = tid;
 * ```
 *
 * @module
 */

// =============================================================================
// BRAND UTILITY
// =============================================================================

/**
 * Unique symbol used as the branding key.
 * Declared but never assigned at runtime, so it has zero cost.
 */
declare const __brand: unique symbol;

/**
 * Brand tag type. Attaches a phantom type label to a base type.
 * @template B - The brand label (a string literal type)
 */
type Brand<B> = { [__brand]: B };

/**
 * Create a branded type by intersecting a base type with a brand tag.
 *
 * The resulting type is structurally compatible with the base type for
 * reading, but cannot be assigned from a plain value of the base type
 * without going through the corresponding constructor function.
 *
 * @template T - The underlying runtime type (e.g., string, number)
 * @template B - The brand label (e.g., 'SessionId', 'TeamId')
 */
export type Branded<T, B> = T & Brand<B>;

// =============================================================================
// BRANDED ID TYPES
// =============================================================================

/**
 * A trivia team identifier.
 *
 * Generated when teams are created in the trivia game.
 * Prevents confusion with other string IDs like QuestionId or SessionId.
 */
export type TeamId = Branded<string, 'TeamId'>;

/**
 * A trivia question identifier.
 *
 * Assigned to each question in a trivia game.
 * Prevents confusion with TeamId or other string-based IDs.
 */
export type QuestionId = Branded<string, 'QuestionId'>;

/**
 * A bingo ball number (1-75).
 *
 * Constrains the number type to signal that this value must be
 * within the valid bingo ball range. The runtime constraint
 * (1-75) is enforced by the constructor function.
 */
export type BallNumber = Branded<number, 'BallNumber'>;

// =============================================================================
// CONSTRUCTOR FUNCTIONS
// =============================================================================
//
// These are simple identity functions with type assertions.
// They serve as the runtime bridge between plain values and branded types.
// After compilation, they are zero-cost (just return the input).
// =============================================================================

/**
 * Create a TeamId from a plain string.
 *
 * @param value - The raw team identifier string
 * @returns The value branded as a TeamId
 */
export function makeTeamId(value: string): TeamId {
  return value as TeamId;
}

/**
 * Create a QuestionId from a plain string.
 *
 * @param value - The raw question identifier string
 * @returns The value branded as a QuestionId
 */
export function makeQuestionId(value: string): QuestionId {
  return value as QuestionId;
}

/**
 * Create a BallNumber from a plain number.
 *
 * @param value - The ball number (should be 1-75 for standard bingo)
 * @returns The value branded as a BallNumber
 */
export function makeBallNumber(value: number): BallNumber {
  return value as BallNumber;
}
