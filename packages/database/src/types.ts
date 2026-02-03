/**
 * Database types for the Beak Gaming Platform
 *
 * These types can be auto-generated using:
 * npx supabase gen types typescript --project-id <project-id> > src/types.ts
 *
 * For now, we define them manually based on the migrations.
 */

// =============================================================================
// Profile Types
// =============================================================================

export interface Profile {
  id: string; // UUID, references auth.users
  facility_name: string | null;
  default_game_title: string | null;
  logo_url: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

export interface ProfileInsert {
  id: string; // Required - must match auth.users id
  facility_name?: string | null;
  default_game_title?: string | null;
  logo_url?: string | null;
}

export interface ProfileUpdate {
  facility_name?: string | null;
  default_game_title?: string | null;
  logo_url?: string | null;
}

// =============================================================================
// Bingo Template Types
// =============================================================================

export interface BingoTemplate {
  id: string; // UUID
  user_id: string; // UUID, references profiles
  name: string;
  pattern_id: string;
  voice_pack: string;
  auto_call_enabled: boolean;
  auto_call_interval: number; // milliseconds, 1000-30000
  is_default: boolean;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

export interface BingoTemplateInsert {
  user_id: string; // Required
  name: string; // Required
  pattern_id: string; // Required
  voice_pack?: string;
  auto_call_enabled?: boolean;
  auto_call_interval?: number;
  is_default?: boolean;
}

export interface BingoTemplateUpdate {
  name?: string;
  pattern_id?: string;
  voice_pack?: string;
  auto_call_enabled?: boolean;
  auto_call_interval?: number;
  is_default?: boolean;
}

// =============================================================================
// Trivia Template Types
// =============================================================================

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category?: string;
}

export interface TriviaTemplate {
  id: string; // UUID
  user_id: string; // UUID, references profiles
  name: string;
  questions: TriviaQuestion[];
  rounds_count: number; // 1-20
  questions_per_round: number; // 1-50
  timer_duration: number; // seconds, 5-300
  is_default: boolean;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

export interface TriviaTemplateInsert {
  user_id: string; // Required
  name: string; // Required
  questions?: TriviaQuestion[];
  rounds_count?: number;
  questions_per_round?: number;
  timer_duration?: number;
  is_default?: boolean;
}

export interface TriviaTemplateUpdate {
  name?: string;
  questions?: TriviaQuestion[];
  rounds_count?: number;
  questions_per_round?: number;
  timer_duration?: number;
  is_default?: boolean;
}

// =============================================================================
// Bingo Preset Types
// =============================================================================

export interface BingoPreset {
  id: string;
  user_id: string;
  name: string;
  pattern_id: string;
  voice_pack: string;
  auto_call_enabled: boolean;
  auto_call_interval: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BingoPresetInsert {
  user_id: string;
  name: string;
  pattern_id: string;
  voice_pack?: string;
  auto_call_enabled?: boolean;
  auto_call_interval?: number;
  is_default?: boolean;
}

export interface BingoPresetUpdate {
  name?: string;
  pattern_id?: string;
  voice_pack?: string;
  auto_call_enabled?: boolean;
  auto_call_interval?: number;
  is_default?: boolean;
}

// =============================================================================
// Trivia Preset Types (settings only, no questions)
// =============================================================================

export interface TriviaPreset {
  id: string;
  user_id: string;
  name: string;
  rounds_count: number;
  questions_per_round: number;
  timer_duration: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriviaPresetInsert {
  user_id: string;
  name: string;
  rounds_count?: number;
  questions_per_round?: number;
  timer_duration?: number;
  is_default?: boolean;
}

export interface TriviaPresetUpdate {
  name?: string;
  rounds_count?: number;
  questions_per_round?: number;
  timer_duration?: number;
  is_default?: boolean;
}

// =============================================================================
// Trivia Question Set Types (questions only, no settings)
// =============================================================================

export interface TriviaQuestionSet {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  questions: TriviaQuestion[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriviaQuestionSetInsert {
  user_id: string;
  name: string;
  description?: string | null;
  questions?: TriviaQuestion[];
  is_default?: boolean;
}

export interface TriviaQuestionSetUpdate {
  name?: string;
  description?: string | null;
  questions?: TriviaQuestion[];
  is_default?: boolean;
}

// =============================================================================
// Game Session Types (Persistent Sessions)
// =============================================================================

export interface GameSession {
  id: string;
  room_code: string;
  session_id: string;
  game_type: 'bingo' | 'trivia';
  template_id: string | null;
  preset_id: string | null;
  question_set_id: string | null;
  pin_hash: string;
  pin_salt: string;
  failed_pin_attempts: number;
  last_failed_attempt_at: string | null;
  status: 'active' | 'paused' | 'completed' | 'expired';
  game_state: Record<string, unknown>;
  user_id: string | null;
  last_sync_at: string;
  sequence_number: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface GameSessionInsert {
  room_code: string;
  session_id: string;
  game_type: 'bingo' | 'trivia';
  template_id?: string | null;
  preset_id?: string | null;
  question_set_id?: string | null;
  pin_hash: string;
  pin_salt: string;
  status?: 'active' | 'paused' | 'completed' | 'expired';
  game_state?: Record<string, unknown>;
  user_id?: string | null;
  expires_at?: string;
}

export interface GameSessionUpdate {
  status?: 'active' | 'paused' | 'completed' | 'expired';
  game_state?: Record<string, unknown>;
  failed_pin_attempts?: number;
  last_failed_attempt_at?: string;
  last_sync_at?: string;
}

// =============================================================================
// Database Schema Type (for Supabase client)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      bingo_templates: {
        Row: BingoTemplate;
        Insert: BingoTemplateInsert;
        Update: BingoTemplateUpdate;
      };
      trivia_templates: {
        Row: TriviaTemplate;
        Insert: TriviaTemplateInsert;
        Update: TriviaTemplateUpdate;
      };
      bingo_presets: {
        Row: BingoPreset;
        Insert: BingoPresetInsert;
        Update: BingoPresetUpdate;
      };
      trivia_presets: {
        Row: TriviaPreset;
        Insert: TriviaPresetInsert;
        Update: TriviaPresetUpdate;
      };
      trivia_question_sets: {
        Row: TriviaQuestionSet;
        Insert: TriviaQuestionSetInsert;
        Update: TriviaQuestionSetUpdate;
      };
      game_sessions: {
        Row: GameSession;
        Insert: GameSessionInsert;
        Update: GameSessionUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// =============================================================================
// Utility Types
// =============================================================================

export type TableName = keyof Database['public']['Tables'];

export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// Type guard helpers
export function isProfile(obj: unknown): obj is Profile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'created_at' in obj &&
    'updated_at' in obj
  );
}

export function isBingoTemplate(obj: unknown): obj is BingoTemplate {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'pattern_id' in obj &&
    'voice_pack' in obj
  );
}

export function isTriviaTemplate(obj: unknown): obj is TriviaTemplate {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'questions' in obj &&
    'rounds_count' in obj
  );
}

export function isBingoPreset(obj: unknown): obj is BingoPreset {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'pattern_id' in obj &&
    'voice_pack' in obj &&
    !('questions' in obj)
  );
}

export function isTriviaPreset(obj: unknown): obj is TriviaPreset {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'rounds_count' in obj &&
    !('questions' in obj) &&
    !('pattern_id' in obj)
  );
}

export function isTriviaQuestionSet(obj: unknown): obj is TriviaQuestionSet {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'questions' in obj &&
    !('rounds_count' in obj) &&
    !('pattern_id' in obj)
  );
}

export function isGameSession(obj: unknown): obj is GameSession {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'room_code' in obj &&
    'session_id' in obj &&
    'game_type' in obj
  );
}
