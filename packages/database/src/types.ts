/**
 * Database types for the Joolie Boolie
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
  explanation?: string;
  /** Source system that produced this question (e.g., 'the-trivia-api', 'manual'). */
  source?: string;
  /** External ID from the source system, for deduplication and provenance tracking. */
  externalId?: string;
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

// =============================================================================
// Zod Schemas for Runtime Validation
// =============================================================================

import { z } from 'zod';

const ProfileSchema = z.object({
  id: z.string(),
  facility_name: z.string().nullable(),
  default_game_title: z.string().nullable(),
  logo_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const BingoTemplateSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  pattern_id: z.string(),
  voice_pack: z.string(),
  auto_call_enabled: z.boolean(),
  auto_call_interval: z.number(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const TriviaQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number(),
  category: z.string().optional(),
  explanation: z.string().optional(),
  source: z.string().optional(),
  externalId: z.string().optional(),
});

const TriviaTemplateSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  questions: z.array(TriviaQuestionSchema),
  rounds_count: z.number(),
  questions_per_round: z.number(),
  timer_duration: z.number(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const BingoPresetSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  pattern_id: z.string(),
  voice_pack: z.string(),
  auto_call_enabled: z.boolean(),
  auto_call_interval: z.number(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const TriviaPresetSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  rounds_count: z.number(),
  questions_per_round: z.number(),
  timer_duration: z.number(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const TriviaQuestionSetSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  questions: z.array(TriviaQuestionSchema),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Type guard helpers
export function isProfile(obj: unknown): obj is Profile {
  return ProfileSchema.safeParse(obj).success;
}

export function isBingoTemplate(obj: unknown): obj is BingoTemplate {
  return BingoTemplateSchema.safeParse(obj).success;
}

export function isTriviaTemplate(obj: unknown): obj is TriviaTemplate {
  return TriviaTemplateSchema.safeParse(obj).success;
}

export function isBingoPreset(obj: unknown): obj is BingoPreset {
  return BingoPresetSchema.safeParse(obj).success;
}

export function isTriviaPreset(obj: unknown): obj is TriviaPreset {
  return TriviaPresetSchema.safeParse(obj).success;
}

export function isTriviaQuestionSet(obj: unknown): obj is TriviaQuestionSet {
  return TriviaQuestionSetSchema.safeParse(obj).success;
}
