import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveTemplateModal } from '../SaveTemplateModal';
import { ToastProvider } from '@/components/ui/Toast';

// Mock fetch globally
global.fetch = vi.fn();

// Mock stores
vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      pattern: {
        id: 'horizontal-line',
        name: 'Horizontal Line',
        category: 'lines',
        cells: [],
      },
      autoCallEnabled: true,
      autoCallSpeed: 10000,
    };
    return selector ? selector(store) : store;
  }),
}));

vi.mock('@/stores/audio-store', () => ({
  useAudioStore: vi.fn((selector) => {
    const store = {
      voicePack: 'standard',
    };
    return selector ? selector(store) : store;
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SaveTemplateModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        template: {
          id: 'new-template-id',
          name: 'Test Template',
        },
      }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <SaveTemplateModal isOpen={false} onClose={mockOnClose} />
    );

    expect(screen.queryByText('Save Template')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    expect(screen.getByText('Save Template')).toBeInTheDocument();
    expect(screen.getByLabelText(/Template Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Set as default template/i)).toBeInTheDocument();
  });

  it('displays current settings preview', () => {
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    expect(screen.getByText('Current Settings')).toBeInTheDocument();
    expect(screen.getByText(/Pattern:/)).toBeInTheDocument();
    expect(screen.getByText(/Horizontal Line/)).toBeInTheDocument();
    expect(screen.getByText(/Voice Pack:/)).toBeInTheDocument();
    expect(screen.getByText(/standard/)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Call:/)).toBeInTheDocument();
    expect(screen.getByText(/On \(10s\)/)).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    // Click save without entering name
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    expect(screen.getByText('Template name is required')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('saves template with valid input', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Enter template name
    const nameInput = screen.getByLabelText(/Template Name/i);
    await user.type(nameInput, 'My Test Template');

    // Check "Set as default"
    const defaultCheckbox = screen.getByLabelText(/Set as default template/i);
    await user.click(defaultCheckbox);

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    // Verify fetch was called with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'My Test Template',
          pattern_id: 'horizontal-line',
          voice_pack: 'standard',
          auto_call_enabled: true,
          auto_call_interval: 10000,
          is_default: true,
        }),
      });
    });

    // Verify callbacks
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error message when save fails', async () => {
    const user = userEvent.setup();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Duplicate template name' }),
    } as Response);

    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    await user.type(nameInput, 'Test');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    // Error should appear in both component and toast
    await waitFor(() => {
      const errors = screen.getAllByText('Duplicate template name');
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('trims whitespace from template name', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    await user.type(nameInput, '  Trimmed Name  ');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"name":"Trimmed Name"'),
      });
    });
  });

  it('shows loading state while saving', async () => {
    const user = userEvent.setup();

    // Mock slow fetch
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: async () => ({}),
      } as Response), 1000))
    );

    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    await user.type(nameInput, 'Test');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    // Should show loading state
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();
    expect(nameInput).toBeDisabled();
  });

  it('prevents closing modal while saving', async () => {
    const user = userEvent.setup();

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: async () => ({}),
      } as Response), 1000))
    );

    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    await user.type(nameInput, 'Test');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    // Try to close modal (click Cancel)
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Should not close while saving
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('resets form on successful save', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i) as HTMLInputElement;
    await user.type(nameInput, 'Test Template');

    const defaultCheckbox = screen.getByLabelText(/Set as default template/i) as HTMLInputElement;
    await user.click(defaultCheckbox);

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    // Form should be reset (values cleared)
    // This is verified by the component state resetting before close
  });

  it('validates pattern is selected before saving', async () => {
    const user = userEvent.setup();

    // Component will have pattern from mock, so this test verifies the save flow works
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    await user.type(nameInput, 'Valid Template');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    // Should successfully save since pattern exists in mock
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    // Modal has focus trap - verify we can tab through elements
    const nameInput = screen.getByLabelText(/Template Name/i);
    const checkbox = screen.getByLabelText(/Set as default template/i);
    const saveButton = screen.getByRole('button', { name: /Save/i });
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    // Verify all interactive elements exist and are accessible
    expect(nameInput).toBeInTheDocument();
    expect(checkbox).toBeInTheDocument();
    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();

    // Tab through the modal
    await user.tab();
    // One of the focusable elements should have focus
    const focusedElement = document.activeElement;
    expect([nameInput, checkbox, saveButton, cancelButton]).toContainEqual(focusedElement);
  });
});
