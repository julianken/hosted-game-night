// Game Engine package - Shared game types and statistics
// Base types for all games

export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface BaseGameState {
  status: GameStatus;
  audioEnabled: boolean;
}

// Export statistics module
export * from './stats';
