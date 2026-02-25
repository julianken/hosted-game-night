import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PresetSelector } from '../PresetSelector';
import { ToastProvider } from "@joolie-boolie/ui";
import type { TriviaPreset } from '@joolie-boolie/database/types';

global.fetch = vi.fn();

const mockUpdateSettings = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      status: 'setup' as const,
      updateSettings: mockUpdateSettings,
    };
    return selector(store);
  }),
}));

const mockPresets: TriviaPreset[] = [
  {
    id: 'preset-1',
    user_id: 'user-1',
    name: 'Quick Game',
    rounds_count: 2,
    questions_per_round: 5,
    timer_duration: 15,
    is_default: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'preset-2',
    user_id: 'user-1',
    name: 'Full Evening',
    rounds_count: 5,
    questions_per_round: 10,
    timer_duration: 30,
    is_default: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('PresetSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state then presets', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPresets }),
    });

    renderWithToast(<PresetSelector />);

    expect(screen.getByText('Load Preset')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    expect(select).toHaveTextContent('Quick Game');
    expect(select).toHaveTextContent('Full Evening');
  });

  it('loads settings when preset is selected', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPresets }),
    });

    renderWithToast(<PresetSelector />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'preset-1' } });

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        timerDuration: 15,
        roundsCount: 2,
        questionsPerRound: 5,
      });
    });
  });

  it('shows empty state when no presets', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    renderWithToast(<PresetSelector />);

    await waitFor(() => {
      expect(screen.getByText('No saved presets. Save your first preset below.')).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    renderWithToast(<PresetSelector />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load presets')).toBeInTheDocument();
    });
  });
});
