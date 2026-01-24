/**
 * Tests for Template Detail Page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notFound } from 'next/navigation';
import TemplateDetailPage from '../page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('TemplateDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBingoTemplate = {
    id: 'bingo-1',
    user_id: 'user-1',
    name: 'Standard Bingo',
    pattern_id: 'four-corners',
    voice_pack: 'Standard',
    auto_call_enabled: true,
    auto_call_interval: 5,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  };

  const mockTriviaTemplate = {
    id: 'trivia-1',
    user_id: 'user-1',
    name: 'General Knowledge',
    questions: [
      { question: 'What is 2+2?', answer: '4' },
      { question: 'What is the capital of France?', answer: 'Paris' },
    ],
    rounds_count: 3,
    questions_per_round: 5,
    timer_duration: 30,
    is_default: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  };

  it('should call notFound when game parameter is missing', async () => {
    await TemplateDetailPage({
      params: Promise.resolve({ id: 'test-1' }),
      searchParams: Promise.resolve({}),
    });

    expect(notFound).toHaveBeenCalled();
  });

  it('should call notFound when game parameter is invalid', async () => {
    await TemplateDetailPage({
      params: Promise.resolve({ id: 'test-1' }),
      searchParams: Promise.resolve({ game: 'invalid' }),
    });

    expect(notFound).toHaveBeenCalled();
  });

  it('should call notFound when template is not found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    await TemplateDetailPage({
      params: Promise.resolve({ id: 'test-1' }),
      searchParams: Promise.resolve({ game: 'bingo' }),
    });

    expect(notFound).toHaveBeenCalled();
  });

  it('should fetch Bingo template from correct API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ template: mockBingoTemplate }),
    } as Response);

    await TemplateDetailPage({
      params: Promise.resolve({ id: 'bingo-1' }),
      searchParams: Promise.resolve({ game: 'bingo' }),
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/templates/bingo-1',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
    );
  });

  it('should fetch Trivia template from correct API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ template: mockTriviaTemplate }),
    } as Response);

    await TemplateDetailPage({
      params: Promise.resolve({ id: 'trivia-1' }),
      searchParams: Promise.resolve({ game: 'trivia' }),
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/templates/trivia-1',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
    );
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    await TemplateDetailPage({
      params: Promise.resolve({ id: 'test-1' }),
      searchParams: Promise.resolve({ game: 'bingo' }),
    });

    expect(notFound).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to fetch bingo template:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});
