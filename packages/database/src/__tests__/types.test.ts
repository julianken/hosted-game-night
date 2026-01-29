import { describe, it, expect } from 'vitest';
import { isProfile } from '../types';

describe('type guards', () => {
  describe('isProfile', () => {
    it('returns true for valid profile object', () => {
      const profile = {
        id: '123',
        facility_name: 'Test Facility',
        default_game_title: null,
        logo_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(isProfile(profile)).toBe(true);
    });

    it('returns false for object missing required fields', () => {
      expect(isProfile({ id: '123' })).toBe(false);
      expect(isProfile({ created_at: '2024-01-01' })).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isProfile(null)).toBe(false);
      expect(isProfile(undefined)).toBe(false);
      expect(isProfile('string')).toBe(false);
      expect(isProfile(123)).toBe(false);
    });
  });

});
