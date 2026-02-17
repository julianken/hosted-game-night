import { describe, it, expect } from 'vitest';
import { resolveDisplayName } from '../resolve-display-name';

describe('resolveDisplayName', () => {
  describe('metadata field priority', () => {
    it('prefers display_name over all other fields', () => {
      const metadata = {
        display_name: 'Display Name',
        full_name: 'Full Name',
        name: 'Name',
      };
      expect(resolveDisplayName(metadata, 'user@example.com')).toBe('Display Name');
    });

    it('falls back to full_name when display_name is missing', () => {
      const metadata = {
        full_name: 'Full Name',
        name: 'Name',
      };
      expect(resolveDisplayName(metadata, 'user@example.com')).toBe('Full Name');
    });

    it('falls back to name when display_name and full_name are missing', () => {
      const metadata = {
        name: 'OAuth Name',
      };
      expect(resolveDisplayName(metadata, 'user@example.com')).toBe('OAuth Name');
    });

    it('falls back to email prefix when no metadata name fields exist', () => {
      const metadata = { some_other_field: 'value' };
      expect(resolveDisplayName(metadata, 'jane.doe@example.com')).toBe('jane.doe');
    });
  });

  describe('edge cases with metadata values', () => {
    it('skips empty string display_name', () => {
      const metadata = { display_name: '', full_name: 'Fallback' };
      expect(resolveDisplayName(metadata, 'user@example.com')).toBe('Fallback');
    });

    it('skips whitespace-only display_name', () => {
      const metadata = { display_name: '   ', full_name: 'Fallback' };
      expect(resolveDisplayName(metadata, 'user@example.com')).toBe('Fallback');
    });

    it('trims whitespace from metadata values', () => {
      const metadata = { display_name: '  Prod Test Account  ' };
      expect(resolveDisplayName(metadata, 'user@example.com')).toBe('Prod Test Account');
    });

    it('skips non-string metadata values', () => {
      const metadata = { display_name: 123, full_name: true, name: null };
      expect(resolveDisplayName(metadata as Record<string, unknown>, 'user@example.com')).toBe('user');
    });
  });

  describe('null/undefined metadata', () => {
    it('handles null metadata', () => {
      expect(resolveDisplayName(null, 'user@example.com')).toBe('user');
    });

    it('handles undefined metadata', () => {
      expect(resolveDisplayName(undefined, 'user@example.com')).toBe('user');
    });
  });

  describe('email fallback', () => {
    it('extracts email prefix as fallback', () => {
      expect(resolveDisplayName(null, 'e2e-test@joolie-boolie.test')).toBe('e2e-test');
    });

    it('handles null email', () => {
      expect(resolveDisplayName(null, null)).toBe('Guest');
    });

    it('handles undefined email', () => {
      expect(resolveDisplayName(null, undefined)).toBe('Guest');
    });
  });

  describe('default name', () => {
    it('uses "Guest" as default when nothing is available', () => {
      expect(resolveDisplayName(null, null)).toBe('Guest');
    });

    it('uses custom default name when provided', () => {
      expect(resolveDisplayName(null, null, 'Activity Director')).toBe('Activity Director');
    });
  });

  describe('real-world scenarios', () => {
    it('handles Supabase email signup with full_name', () => {
      // This is what our SignupForm sets
      const metadata = { full_name: 'Jane Doe' };
      expect(resolveDisplayName(metadata, 'jane@example.com')).toBe('Jane Doe');
    });

    it('handles user with display_name set via profile update', () => {
      // This is the production test account scenario (BEA-530)
      const metadata = { display_name: 'Prod Test Account' };
      expect(resolveDisplayName(metadata, 'e2e-test@joolie-boolie.test')).toBe('Prod Test Account');
    });

    it('handles Google OAuth user with name field', () => {
      const metadata = { name: 'Google User', avatar_url: 'https://...' };
      expect(resolveDisplayName(metadata, 'googleuser@gmail.com')).toBe('Google User');
    });

    it('handles user with empty metadata object', () => {
      expect(resolveDisplayName({}, 'fallback@example.com')).toBe('fallback');
    });
  });
});
