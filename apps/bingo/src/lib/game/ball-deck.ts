import {
  BallNumber,
  BingoBall,
  BingoColumn,
  BallDeck,
  DrawResult,
  COLUMN_RANGES,
  COLUMNS,
} from '@/types';

/**
 * Fisher-Yates shuffle algorithm for unbiased randomization.
 * O(n) complexity, in-place shuffle of a copied array.
 */
export function fisherYatesShuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get the column letter for a ball number (1-75).
 */
export function getColumnForNumber(num: number): BingoColumn {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  throw new Error(`Invalid ball number: ${num}`);
}

/**
 * Create a single bingo ball from a number.
 */
export function createBall(num: number): BingoBall {
  const column = getColumnForNumber(num);
  return {
    column,
    number: num as BallNumber,
    label: `${column}-${num}`,
  };
}

/**
 * Generate all 75 bingo balls in order.
 */
export function generateAllBalls(): BingoBall[] {
  const balls: BingoBall[] = [];
  for (const column of COLUMNS) {
    const [start, end] = COLUMN_RANGES[column];
    for (let num = start; num <= end; num++) {
      balls.push(createBall(num));
    }
  }
  return balls;
}

/**
 * Create a new shuffled ball deck.
 */
export function createDeck(): BallDeck {
  const allBalls = generateAllBalls();
  const shuffled = fisherYatesShuffle(allBalls);
  return {
    originalOrder: Object.freeze([...shuffled]),
    remaining: shuffled,
    drawn: [],
  };
}

/**
 * Draw the next ball from the deck.
 * Returns null if no balls remaining.
 */
export function drawBall(deck: BallDeck): DrawResult | null {
  if (deck.remaining.length === 0) {
    return null;
  }

  const [ball, ...remaining] = deck.remaining;
  return {
    ball,
    deck: {
      ...deck,
      remaining,
      drawn: [...deck.drawn, ball],
    },
  };
}

/**
 * Undo the last drawn ball, returning it to remaining.
 * Returns null if no balls have been drawn.
 */
export function undoDraw(deck: BallDeck): DrawResult | null {
  if (deck.drawn.length === 0) {
    return null;
  }

  const drawn = [...deck.drawn];
  const ball = drawn.pop()!;
  return {
    ball,
    deck: {
      ...deck,
      remaining: [ball, ...deck.remaining],
      drawn,
    },
  };
}

/**
 * Group balls by their column letter.
 */
export function getBallsByColumn(
  balls: BingoBall[]
): Record<BingoColumn, BallNumber[]> {
  const result: Record<BingoColumn, BallNumber[]> = {
    B: [],
    I: [],
    N: [],
    G: [],
    O: [],
  };

  for (const ball of balls) {
    result[ball.column].push(ball.number);
  }

  // Sort each column's numbers
  for (const column of COLUMNS) {
    result[column].sort((a, b) => a - b);
  }

  return result;
}

/**
 * Get the count of remaining balls in the deck.
 */
export function getRemainingCount(deck: BallDeck): number {
  return deck.remaining.length;
}

/**
 * Get the count of drawn balls in the deck.
 */
export function getDrawnCount(deck: BallDeck): number {
  return deck.drawn.length;
}
