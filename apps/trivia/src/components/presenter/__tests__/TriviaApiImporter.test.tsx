import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TriviaApiImporter } from '../TriviaApiImporter';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockImportQuestions = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      status: 'setup' as const,
      settings: { questionsPerRound: 5 },
      importQuestions: mockImportQuestions,
    };
    return selector(store);
  }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@joolie-boolie/ui', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('@/lib/questions/conversion', () => ({
  questionsToTriviaQuestions: vi.fn((qs) =>
    qs.map(
      (q: { text: string; optionTexts: string[]; category: string }) => ({
        question: q.text,
        options: q.optionTexts,
        correctIndex: 0,
        category: q.category,
      })
    )
  ),
}));

vi.mock('@/lib/categories', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/categories')
  >('@/lib/categories');
  return actual;
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_QUESTION = {
  id: 'q-1',
  text: 'What is Nanotechnology the study of?',
  type: 'multiple_choice' as const,
  correctAnswers: ['A'],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: [
    'the study and design of machines at the molecular level',
    'things in order of time or time',
    'movement in relation to human anatomy',
    'wine',
  ],
  category: 'science' as const,
  roundIndex: 0,
};

const MOCK_API_RESPONSE = {
  questions: [MOCK_QUESTION],
  meta: {
    fetchedAt: '2026-02-18T00:00:00Z',
    totalFetched: 1,
    source: 'the-trivia-api',
    cached: false,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;

function mockFetchSuccess(data = MOCK_API_RESPONSE) {
  // Default tests use no category selection → single mixed call → mockResolvedValueOnce
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

function mockFetchError(status: number, errorMessage: string) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: errorMessage }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TriviaApiImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // Idle state
  // -----------------------------------------------------------------------

  describe('idle state', () => {
    it('renders heading and fetch button', () => {
      render(<TriviaApiImporter />);

      expect(
        screen.getByRole('heading', { name: /fetch from trivia api/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /fetch questions/i })
      ).toBeInTheDocument();
    });

    it('renders difficulty radio buttons', () => {
      render(<TriviaApiImporter />);

      expect(screen.getByRole('radio', { name: /easy/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /medium/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /hard/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /mixed/i })).toBeInTheDocument();
    });

    it('renders question count slider with default 20', () => {
      render(<TriviaApiImporter />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '20');
    });

    it('renders exclude niche toggle checked by default', () => {
      render(<TriviaApiImporter />);

      const toggle = screen.getByRole('switch', { name: /exclude niche/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  // -----------------------------------------------------------------------
  // Fetch flow
  // -----------------------------------------------------------------------

  describe('fetch flow', () => {
    it('shows loading text after clicking Fetch', async () => {
      global.fetch = vi.fn().mockReturnValueOnce(new Promise(() => {}));

      render(<TriviaApiImporter />);
      fireEvent.click(screen.getByRole('button', { name: /fetch questions/i }));

      expect(
        await screen.findByText(/fetching questions/i)
      ).toBeInTheDocument();
    });

    it('transitions to preview state on success', async () => {
      mockFetchSuccess();

      render(<TriviaApiImporter />);
      fireEvent.click(screen.getByRole('button', { name: /fetch questions/i }));

      expect(
        await screen.findByText(/1 question fetched/i)
      ).toBeInTheDocument();
    });

    it('transitions to error state on HTTP error', async () => {
      mockFetchError(502, 'External API unavailable');

      render(<TriviaApiImporter />);
      fireEvent.click(screen.getByRole('button', { name: /fetch questions/i }));

      expect(
        await screen.findByText(/failed to fetch questions/i)
      ).toBeInTheDocument();
    });

    it('shows error when API returns empty questions', async () => {
      mockFetchSuccess({
        questions: [],
        meta: {
          fetchedAt: '',
          totalFetched: 0,
          source: 'the-trivia-api',
          cached: false,
        },
      });

      render(<TriviaApiImporter />);
      fireEvent.click(screen.getByRole('button', { name: /fetch questions/i }));

      expect(
        await screen.findByText(/no questions found/i)
      ).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  describe('error state', () => {
    it('Try Again button resets to idle', async () => {
      mockFetchError(500, 'Server error');

      render(<TriviaApiImporter />);
      fireEvent.click(screen.getByRole('button', { name: /fetch questions/i }));

      const retryBtn = await screen.findByRole('button', { name: /try again/i });
      fireEvent.click(retryBtn);

      expect(
        screen.getByRole('button', { name: /fetch questions/i })
      ).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Preview state
  // -----------------------------------------------------------------------

  describe('preview state', () => {
    async function setupPreview() {
      mockFetchSuccess();
      render(<TriviaApiImporter />);
      fireEvent.click(screen.getByRole('button', { name: /fetch questions/i }));
      await screen.findByText(/1 question fetched/i);
    }

    it('displays question text and correct answer', async () => {
      await setupPreview();
      expect(
        screen.getByText('What is Nanotechnology the study of?')
      ).toBeInTheDocument();
    });

    it('Cancel button resets to idle', async () => {
      await setupPreview();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(
        screen.getByRole('button', { name: /fetch questions/i })
      ).toBeInTheDocument();
    });

    it('Load into Game calls importQuestions and shows toast', async () => {
      await setupPreview();
      fireEvent.click(
        screen.getByRole('button', { name: /load into game/i })
      );

      expect(mockImportQuestions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ roundIndex: 0 }),
        ]),
        'replace'
      );
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('1 question')
      );
    });
  });
});
