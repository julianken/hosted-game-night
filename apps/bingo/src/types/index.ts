import type { BallNumber as BrandedBallNumber } from '@joolie-boolie/types/branded';
import type { GameStatus } from '@joolie-boolie/game-stats';

// Bingo column letters
export type BingoColumn = 'B' | 'I' | 'N' | 'G' | 'O';

/**
 * Ball number range is 1-75.
 * Re-exported as a branded type for compile-time safety.
 */
export type BallNumber = BrandedBallNumber;

// A bingo ball with its letter and number
export interface BingoBall {
  column: BingoColumn;
  number: BallNumber;
  label: string; // e.g., "B-1", "O-75"
}

// Game state (re-exported from @joolie-boolie/game-stats)
export type { GameStatus };

export interface GameState {
  status: GameStatus;
  calledBalls: BingoBall[];
  currentBall: BingoBall | null;
  previousBall: BingoBall | null;
  remainingBalls: BingoBall[];
  pattern: BingoPattern | null;
  autoCallEnabled: boolean;
  autoCallSpeed: number; // seconds between calls (5-30)
  audioEnabled: boolean;
}

// Pattern definitions
export interface PatternCell {
  row: number; // 0-4
  col: number; // 0-4
}

export interface BingoPattern {
  id: string;
  name: string;
  category: PatternCategory;
  cells: PatternCell[]; // Required cells for pattern (free space auto-included)
  description?: string;
}

export type PatternCategory =
  | 'lines'
  | 'corners'
  | 'frames'
  | 'shapes'
  | 'letters'
  | 'coverage'
  | 'combo'
  | 'custom';

// User profile (extends Supabase auth.users)
export interface UserProfile {
  id: string; // UUID
  facilityName: string | null;
  logoUrl: string | null;
  defaultGameTitle: string;
  createdAt: string;
  updatedAt: string;
}

// Saved game template
export interface GameTemplate {
  id: string; // UUID
  userId: string;
  name: string;
  patternId: string;
  autoCallSpeed: number;
  audioEnabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// API request/response types
export interface CreateTemplateRequest {
  name: string;
  patternId: string;
  autoCallSpeed: number;
  audioEnabled: boolean;
  isDefault?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  patternId?: string;
  autoCallSpeed?: number;
  audioEnabled?: boolean;
  isDefault?: boolean;
}

export interface UpdateProfileRequest {
  facilityName?: string;
  defaultGameTitle?: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  facilityName?: string;
}

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

// Voice pack types
export type VoicePackId = 'standard' | 'standard-hall' | 'british' | 'british-hall';

export interface VoicePackMetadata {
  id: VoicePackId;
  name: string;
  description: string;
  basePath: string;
  filePattern: string;
  slangMappings?: Record<string, string | null>;
}

export interface VoiceManifest {
  voicePacks: Record<VoicePackId, VoicePackMetadata>;
  defaultPack: VoicePackId;
}

// Audio types
export interface AudioState {
  audioEnabled: boolean;
  voicePack: VoicePackId;
  volume: number; // 0-1
  isPlaying: boolean;
  preloadProgress: number; // 0-100
  preloadError: string | null;
}

// Theme mode types
export type ThemeMode = 'light' | 'dark' | 'system';

// BroadcastChannel message types for window sync
export type SyncMessageType =
  | 'GAME_STATE_UPDATE'
  | 'BALL_CALLED'
  | 'GAME_RESET'
  | 'PATTERN_CHANGED'
  | 'REQUEST_SYNC'
  | 'AUDIO_SETTINGS_CHANGED'
  | 'DISPLAY_THEME_CHANGED'
  | 'CHANNEL_READY'
  | 'PLAY_ROLL_SOUND'
  | 'PLAY_REVEAL_CHIME'
  | 'PLAY_BALL_VOICE'
  | 'AUDIO_UNLOCKED'
  | 'DISPLAY_CLOSING';

export interface AudioSettingsPayload {
  voicePack: VoicePackId;
  volume: number;
  enabled: boolean;
  rollSoundVolume: number;
  chimeVolume: number;
  rollSoundType: RollSoundType;
  rollDuration: RollDuration;
  revealChime: RevealChimeType;
}

export interface ThemePayload {
  theme: ThemeMode;
}

/** Base fields shared by all sync messages */
interface SyncMessageBase {
  timestamp: number;
  originId?: string;
  sequenceNumber?: number;
}

/**
 * Discriminated union of all Bingo sync messages.
 * Each variant maps a `type` to its exact `payload` type, enabling
 * exhaustive `switch` blocks with full type narrowing and zero casts.
 */
export type BingoSyncMessage =
  | (SyncMessageBase & { type: 'GAME_STATE_UPDATE'; payload: GameState })
  | (SyncMessageBase & { type: 'BALL_CALLED'; payload: BingoBall })
  | (SyncMessageBase & { type: 'GAME_RESET'; payload: null })
  | (SyncMessageBase & { type: 'PATTERN_CHANGED'; payload: BingoPattern })
  | (SyncMessageBase & { type: 'REQUEST_SYNC'; payload: null })
  | (SyncMessageBase & { type: 'AUDIO_SETTINGS_CHANGED'; payload: AudioSettingsPayload })
  | (SyncMessageBase & { type: 'DISPLAY_THEME_CHANGED'; payload: ThemePayload })
  | (SyncMessageBase & { type: 'CHANNEL_READY'; payload: null })
  | (SyncMessageBase & { type: 'PLAY_ROLL_SOUND'; payload: null })
  | (SyncMessageBase & { type: 'PLAY_REVEAL_CHIME'; payload: null })
  | (SyncMessageBase & { type: 'PLAY_BALL_VOICE'; payload: BingoBall })
  | (SyncMessageBase & { type: 'AUDIO_UNLOCKED'; payload: null })
  | (SyncMessageBase & { type: 'DISPLAY_CLOSING'; payload: null });

/**
 * @deprecated Use `BingoSyncMessage` instead. Kept for backwards compatibility.
 */
export type SyncMessage = BingoSyncMessage;

// Ball deck types
export interface BallDeck {
  readonly originalOrder: readonly BingoBall[];
  remaining: BingoBall[];
  drawn: BingoBall[];
}

export interface DrawResult {
  ball: BingoBall;
  deck: BallDeck;
}

// Column ranges for ball generation
export const COLUMN_RANGES = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
} as const satisfies Record<BingoColumn, readonly [number, number]>;

export const COLUMNS: BingoColumn[] = ['B', 'I', 'N', 'G', 'O'];

// Roll sound types
export type RollSoundType = 'metal-cage' | 'plastic-cage' | 'plastic-swirl' | 'lottery-balls';
export type RollDuration = '2s' | '4s' | '6s' | '8s';

export interface RollSoundConfig {
  type: RollSoundType;
  duration: RollDuration;
}

export const ROLL_SOUND_OPTIONS = {
  'metal-cage': { name: 'Metal Cage', durations: ['2s', '4s', '6s', '8s'] },
  'plastic-cage': { name: 'Plastic Cage', durations: ['2s', '4s'] },
  'plastic-swirl': { name: 'Plastic Swirl', durations: ['2s', '4s', '6s', '8s'] },
  'lottery-balls': { name: 'Lottery Balls', durations: ['2s', '4s', '6s', '8s'] },
} as const satisfies Record<RollSoundType, { name: string; durations: readonly RollDuration[] }>;

// Reveal chime types (sound that plays when ball number is revealed)
export type RevealChimeType = 'none' | 'positive-notification' | 'gold-coin-prize';

export const REVEAL_CHIME_OPTIONS = {
  'none': { name: 'None' },
  'positive-notification': { name: 'Positive Notification' },
  'gold-coin-prize': { name: 'Gold Coin Prize' },
} as const satisfies Record<RevealChimeType, { name: string }>;

// =============================================================================
// GAME SESSION TYPES (API)
// =============================================================================

export type BingoGameSessionStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface BingoGameSession {
  id: string;
  name: string;
  status: BingoGameSessionStatus;
  patternId: string | null;
  calledBalls: BingoBall[];
  currentBall: BingoBall | null;
  autoCallEnabled: boolean;
  autoCallSpeed: number;
  audioEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBingoGameRequest {
  name: string;
  patternId?: string;
  autoCallSpeed?: number;
  audioEnabled?: boolean;
}

export interface UpdateBingoGameRequest {
  name?: string;
  status?: BingoGameSessionStatus;
  patternId?: string;
  calledBalls?: BingoBall[];
  currentBall?: BingoBall | null;
  autoCallEnabled?: boolean;
  autoCallSpeed?: number;
  audioEnabled?: boolean;
}

// =============================================================================
// SESSION HISTORY TYPES (API)
// =============================================================================

/**
 * Winner information for a completed bingo game session
 */
export interface BingoSessionWinner {
  name: string;
  cardNumber?: string;
  verifiedAt: string;
}

/**
 * A completed or in-progress game session record for history tracking
 */
export interface BingoSession {
  id: string;
  userId: string | null; // For future auth integration
  patternId: string;
  patternName: string;
  calledBalls: BingoBall[];
  totalBallsCalled: number;
  winner: BingoSessionWinner | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBingoSessionRequest {
  patternId: string;
  patternName: string;
  userId?: string;
}

export interface UpdateBingoSessionRequest {
  calledBalls?: BingoBall[];
  winner?: BingoSessionWinner | null;
  endedAt?: string | null;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
}
