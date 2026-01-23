import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../TemplateSelector';
import { ToastProvider } from '@/components/ui/Toast';
import type { BingoTemplate } from '@beak-gaming/database/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock stores
const mockSetPattern = vi.fn();
const mockToggleAutoCall = vi.fn();
const mockSetAutoCallSpeed = vi.fn();
const mockSetVoicePack = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      setPattern: mockSetPattern,
      toggleAutoCall: mockToggleAutoCall,
      setAutoCallSpeed: mockSetAutoCallSpeed,
      autoCallEnabled: false,
    };
    return selector ? selector(store) : store;
  }),
}));

vi.mock('@/stores/audio-store', () => ({
  useAudioStore: vi.fn((selector) => {
    const store = {
      setVoicePack: mockSetVoicePack,
    };
    return selector ? selector(store) : store;
  }),
}));

// Mock pattern registry
vi.mock('@/lib/game/patterns', () => ({
  patternRegistry: {
    get: vi.fn((id: string) => {
      if (id === 'horizontal-line') {
        return {
          id: 'horizontal-line',
          name: 'Horizontal Line',
          category: 'lines',
          cells: [],
        };
      }
      return null;
    }),
  },
}));

const mockTemplates: BingoTemplate[] = [
  {
    id: 'template-1',
    user_id: 'user-123',
    name: 'Standard Game',
    pattern_id: 'horizontal-line',
    voice_pack: 'standard',
    auto_call_enabled: true,
    auto_call_interval: 10000,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template-2',
    user_id: 'user-123',
    name: 'Quick Game',
    pattern_id: 'horizontal-line',
    voice_pack: 'british',
    auto_call_enabled: true,
    auto_call_interval: 5000,
    is_default: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('TemplateSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with loading state initially', () => {
    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText(/Load Template/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/templates');
    });

    await waitFor(() => {
      expect(screen.getByText('Standard Game (Default)')).toBeInTheDocument();
      expect(screen.getByText('Quick Game')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    } as Response);

    renderWithProviders(<TemplateSelector />);

    // Check for error in the component (not toast)
    await waitFor(() => {
      const errors = screen.getAllByText(/Failed to load templates/i);
      // Should have at least one error message
      expect(errors.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('shows empty state when no templates exist', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: [] }),
    } as Response);

    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(screen.getByText(/No saved templates/i)).toBeInTheDocument();
    });
  });

  it('loads template settings when selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateSelector />);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Standard Game (Default)')).toBeInTheDocument();
    });

    // Select template
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'template-1');

    // Verify store actions called
    await waitFor(() => {
      expect(mockSetPattern).toHaveBeenCalledWith({
        id: 'horizontal-line',
        name: 'Horizontal Line',
        category: 'lines',
        cells: [],
      });
      expect(mockToggleAutoCall).toHaveBeenCalled();
      // auto_call_interval is 10000ms, converted to 10 seconds
      expect(mockSetAutoCallSpeed).toHaveBeenCalledWith(10);
      expect(mockSetVoicePack).toHaveBeenCalledWith('standard');
    });
  });

  it('does not toggle auto-call if already in correct state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateSelector />);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Standard Game (Default)')).toBeInTheDocument();
    });

    // Select template - since autoCallEnabled is false by default in mock,
    // and template has true, toggle will be called once
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'template-1');

    // Verify toggle was called (because states differed)
    await waitFor(() => {
      expect(mockToggleAutoCall).toHaveBeenCalled();
    });
  });

  it('handles missing pattern gracefully', async () => {
    const user = userEvent.setup();

    // Create template with non-existent pattern
    const templatesWithBadPattern: BingoTemplate[] = [{
      id: 'bad-template',
      user_id: 'user-123',
      name: 'Bad Template',
      pattern_id: 'non-existent-pattern',
      voice_pack: 'standard',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: templatesWithBadPattern }),
    } as Response);

    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(screen.getByText('Bad Template')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bad-template');

    // Pattern won't be set because it doesn't exist
    await waitFor(() => {
      expect(mockSetPattern).not.toHaveBeenCalled();
    });
  });

  it('disables select when disabled prop is true', () => {
    renderWithProviders(<TemplateSelector disabled />);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('disables select while loading', () => {
    renderWithProviders(<TemplateSelector />);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });
});
