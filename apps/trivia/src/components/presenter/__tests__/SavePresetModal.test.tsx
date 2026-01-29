import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavePresetModal } from '../SavePresetModal';
import { ToastProvider } from "@beak-gaming/ui";

global.fetch = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      settings: {
        roundsCount: 3,
        questionsPerRound: 5,
        timerDuration: 30,
        timerAutoStart: false,
        timerVisible: true,
        ttsEnabled: false,
      },
    };
    return selector(store);
  }),
}));

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SavePresetModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with settings preview', () => {
    renderWithToast(<SavePresetModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByText('Save Settings Preset')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // roundsCount
    expect(screen.getByText('5')).toBeInTheDocument(); // questionsPerRound
    expect(screen.getByText('30s')).toBeInTheDocument(); // timerDuration
  });

  it('validates name is required', async () => {
    renderWithToast(<SavePresetModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    // Click save without name
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Preset name is required')).toBeInTheDocument();
    });
  });

  it('posts to /api/presets on save', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ preset: { id: 'new-preset' } }),
    });

    renderWithToast(<SavePresetModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const nameInput = screen.getByPlaceholderText(/quick game/i);
    fireEvent.change(nameInput, { target: { value: 'My Preset' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/presets', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"My Preset"'),
      }));
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
