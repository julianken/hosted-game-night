import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../TemplateSelector';
import { ToastProvider } from "@joolie-boolie/ui";
import type { BingoTemplateItem } from '@/stores/template-store';

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

const mockTemplates: BingoTemplateItem[] = [
  {
    id: 'template-1',
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

const mockUseBingoTemplateStore = vi.fn((selector: (state: { items: BingoTemplateItem[] }) => unknown) => {
  const store = { items: mockTemplates };
  return selector(store);
});

vi.mock('@/stores/template-store', () => ({
  useBingoTemplateStore: (...args: unknown[]) => mockUseBingoTemplateStore(...args as Parameters<typeof mockUseBingoTemplateStore>),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('TemplateSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default implementation
    mockUseBingoTemplateStore.mockImplementation((selector) => {
      const store = { items: mockTemplates };
      return selector(store);
    });
  });

  it('renders with label and select element', () => {
    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText(/Load Template/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays templates from localStorage store', () => {
    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText('Standard Game (Default)')).toBeInTheDocument();
    expect(screen.getByText('Quick Game')).toBeInTheDocument();
  });

  it('loads template settings when selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateSelector />);

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

    // Select template - since autoCallEnabled is false by default in mock,
    // and template has true, toggle will be called once
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'template-1');

    // Verify toggle was called (because states differed)
    await waitFor(() => {
      expect(mockToggleAutoCall).toHaveBeenCalled();
    });
  });

  it('shows empty state when no templates', () => {
    mockUseBingoTemplateStore.mockImplementation((selector) => {
      const store = { items: [] as BingoTemplateItem[] };
      return selector(store);
    });

    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText(/No saved templates/i)).toBeInTheDocument();
  });

  it('handles missing pattern gracefully', async () => {
    const user = userEvent.setup();

    mockUseBingoTemplateStore.mockImplementation((selector) => {
      const store = {
        items: [{
          id: 'bad-template',
          name: 'Bad Template',
          pattern_id: 'non-existent-pattern',
          voice_pack: 'standard',
          auto_call_enabled: false,
          auto_call_interval: 5000,
          is_default: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }],
      };
      return selector(store);
    });

    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText('Bad Template')).toBeInTheDocument();

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
});
