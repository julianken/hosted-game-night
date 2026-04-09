import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PresetSelector } from '../PresetSelector';
import { ToastProvider } from "@joolie-boolie/ui";
import type { TriviaPresetItem } from '@/stores/preset-store';

const mockUpdateSetting = vi.fn();
vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: {
    getState: () => ({
      updateSetting: mockUpdateSetting,
    }),
  },
}));

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

const mockPresets: TriviaPresetItem[] = [
  {
    id: 'preset-1',
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
    name: 'Full Evening',
    rounds_count: 5,
    questions_per_round: 10,
    timer_duration: 30,
    is_default: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

vi.mock('@/stores/preset-store', () => ({
  useTriviaPresetStore: vi.fn((selector) => {
    const store = { items: mockPresets };
    return selector(store);
  }),
}));

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('PresetSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders presets from localStorage store', () => {
    renderWithToast(<PresetSelector />);

    expect(screen.getByText('Load Preset')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toHaveTextContent('Quick Game');
    expect(select).toHaveTextContent('Full Evening');
  });

  it('loads settings when preset is selected', async () => {
    renderWithToast(<PresetSelector />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'preset-1' } });

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        timerDuration: 15,
        roundsCount: 2,
        questionsPerRound: 5,
      });
    });
  });

  it('mirrors settings to settings-store (sync race fix)', async () => {
    renderWithToast(<PresetSelector />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'preset-1' } });

    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('timerDuration', 15);
      expect(mockUpdateSetting).toHaveBeenCalledWith('roundsCount', 2);
      expect(mockUpdateSetting).toHaveBeenCalledWith('questionsPerRound', 5);
    });
  });

  it('shows empty state when no presets', async () => {
    // Override mock to return empty items
    const { useTriviaPresetStore } = vi.mocked(await import('@/stores/preset-store'));
    useTriviaPresetStore.mockImplementation((selector) => {
      const store = { items: [] as TriviaPresetItem[] };
      return selector(store as unknown as Parameters<typeof selector>[0]);
    });

    renderWithToast(<PresetSelector />);

    expect(screen.getByText('No saved presets. Save your first preset below.')).toBeInTheDocument();
  });
});
