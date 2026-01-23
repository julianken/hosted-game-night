/**
 * Integration tests for template management components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateSelector } from '../TemplateSelector';
import { ToastProvider } from '@/components/ui/Toast';

// Mock the game store
vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn(() => ({
    status: 'setup',
    questions: [],
    importQuestions: vi.fn(),
    updateSettings: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Template Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [] }),
    } as Response);
  });

  describe('TemplateSelector', () => {
    it('should fetch templates on mount', () => {
      render(
        <ToastProvider>
          <TemplateSelector />
        </ToastProvider>
      );

      expect(global.fetch).toHaveBeenCalledWith('/api/templates');
    });

    it('should show loading state', () => {
      render(
        <ToastProvider>
          <TemplateSelector />
        </ToastProvider>
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveTextContent('Loading templates...');
    });

    it('should be able to be disabled', () => {
      render(
        <ToastProvider>
          <TemplateSelector disabled={true} />
        </ToastProvider>
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });
});
