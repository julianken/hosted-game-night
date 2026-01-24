/**
 * Tests for template aggregation API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/templates', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch and combine templates from both games', async () => {
    // Mock Bingo API response
    const bingoTemplates = [
      {
        id: 'bingo-1',
        user_id: 'user-1',
        name: 'Bingo Template 1',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    // Mock Trivia API response
    const triviaTemplates = [
      {
        id: 'trivia-1',
        user_id: 'user-1',
        name: 'Trivia Template 1',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctIndex: 1,
          },
        ],
        rounds_count: 3,
        questions_per_round: 10,
        timer_duration: 30,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      },
    ];

    // Mock both API calls to succeed
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: bingoTemplates }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: triviaTemplates }),
      });

    const response = await GET();
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/templates',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/templates',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(data.templates).toHaveLength(2);

    // Should be sorted by updated_at descending (trivia is more recent)
    expect(data.templates[0].game).toBe('trivia');
    expect(data.templates[0].id).toBe('trivia-1');
    expect(data.templates[1].game).toBe('bingo');
    expect(data.templates[1].id).toBe('bingo-1');

    expect(data.errors).toBeUndefined();
  });

  it('should handle Bingo API failure gracefully', async () => {
    const triviaTemplates = [
      {
        id: 'trivia-1',
        user_id: 'user-1',
        name: 'Trivia Template 1',
        questions: [],
        rounds_count: 3,
        questions_per_round: 10,
        timer_duration: 30,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    // Mock Bingo API to fail
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: triviaTemplates }),
      });

    const response = await GET();
    const data = await response.json();

    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].game).toBe('trivia');
    expect(data.errors).toContain('Bingo API unavailable: Service Unavailable');
  });

  it('should handle Trivia API failure gracefully', async () => {
    const bingoTemplates = [
      {
        id: 'bingo-1',
        user_id: 'user-1',
        name: 'Bingo Template 1',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    // Mock Trivia API to fail
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: bingoTemplates }),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      });

    const response = await GET();
    const data = await response.json();

    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].game).toBe('bingo');
    expect(data.errors).toContain('Trivia API unavailable: Service Unavailable');
  });

  it('should handle both APIs failing', async () => {
    // Mock both APIs to fail
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      });

    const response = await GET();
    const data = await response.json();

    expect(data.templates).toHaveLength(0);
    expect(data.errors).toHaveLength(2);
    expect(data.errors[0]).toContain('Bingo API unavailable');
    expect(data.errors[1]).toContain('Trivia API unavailable');
  });

  it('should handle network errors', async () => {
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch templates');
    expect(data.templates).toEqual([]);
  });

  it('should sort templates by updated_at descending', async () => {
    const bingoTemplates = [
      {
        id: 'bingo-1',
        user_id: 'user-1',
        name: 'Older Bingo',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z', // Oldest
      },
      {
        id: 'bingo-2',
        user_id: 'user-1',
        name: 'Newer Bingo',
        pattern_id: 'blackout',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z', // Newest
      },
    ];

    const triviaTemplates = [
      {
        id: 'trivia-1',
        user_id: 'user-1',
        name: 'Middle Trivia',
        questions: [],
        rounds_count: 3,
        questions_per_round: 10,
        timer_duration: 30,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z', // Middle
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: bingoTemplates }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: triviaTemplates }),
      });

    const response = await GET();
    const data = await response.json();

    expect(data.templates).toHaveLength(3);
    expect(data.templates[0].id).toBe('bingo-2'); // Newest
    expect(data.templates[1].id).toBe('trivia-1'); // Middle
    expect(data.templates[2].id).toBe('bingo-1'); // Oldest
  });
});
