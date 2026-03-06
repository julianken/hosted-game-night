import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizardStepSettings, type WizardStepSettingsProps } from '../WizardStepSettings';
import type { PerRoundBreakdown } from '@/types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const emptyBreakdown: PerRoundBreakdown[] = [];

const breakdownWithCategories: PerRoundBreakdown[] = [
  {
    roundIndex: 0,
    totalCount: 5,
    expectedCount: 5,
    isMatch: true,
    categories: [
      { categoryId: 'science', questionCount: 3 },
      { categoryId: 'history', questionCount: 2 },
    ],
  },
  {
    roundIndex: 1,
    totalCount: 4,
    expectedCount: 4,
    isMatch: true,
    categories: [
      { categoryId: 'science', questionCount: 1 },
      { categoryId: 'geography', questionCount: 3 },
    ],
  },
];

function createDefaultProps(
  overrides: Partial<WizardStepSettingsProps> = {}
): WizardStepSettingsProps {
  return {
    roundsCount: 3,
    isByCategory: false,
    canUseByCategory: true,
    perRoundBreakdown: emptyBreakdown,
    onUpdateSetting: vi.fn(),
    onToggleByCategory: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WizardStepSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // State A — isByCategory: false
  // -------------------------------------------------------------------------

  describe('State A: isByCategory=false', () => {
    it('renders only the Rounds slider (QPR slider is never present)', () => {
      render(<WizardStepSettings {...createDefaultProps({ isByCategory: false })} />);

      expect(screen.getByRole('slider', { name: /number of rounds/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('slider', { name: /questions per round/i })
      ).not.toBeInTheDocument();
    });

    it('does not render category badge pills', () => {
      render(<WizardStepSettings {...createDefaultProps({ isByCategory: false })} />);

      // Badge pill text contains a colon (e.g. "Science: 3"). No category names should appear.
      expect(screen.queryByText(/science:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/history:/i)).not.toBeInTheDocument();
    });

    it('does not render empty-state message', () => {
      render(<WizardStepSettings {...createDefaultProps({ isByCategory: false })} />);

      expect(
        screen.queryByText(/no questions imported yet/i)
      ).not.toBeInTheDocument();
    });

    it('renders the By Category switch in unchecked state', () => {
      render(<WizardStepSettings {...createDefaultProps({ isByCategory: false })} />);

      const toggle = screen.getByRole('switch', { name: /by category/i });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  // -------------------------------------------------------------------------
  // State B — isByCategory: true, questions loaded
  // -------------------------------------------------------------------------

  describe('State B: isByCategory=true, questions loaded', () => {
    it('renders Rounds slider but not QPR slider', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: breakdownWithCategories,
          })}
        />
      );

      expect(screen.getByRole('slider', { name: /number of rounds/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('slider', { name: /questions per round/i })
      ).not.toBeInTheDocument();
    });

    it('renders per-round breakdown pills', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: breakdownWithCategories,
          })}
        />
      );

      // Per-round rows show "Round N — {category}" and "{count} questions"
      const rows = screen.getAllByText((_content, element) => {
        const text = element?.textContent ?? '';
        return /Round 1.*Science/.test(text) || /Round 2.*Science/.test(text);
      });
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('5 questions')).toBeInTheDocument();
      expect(screen.getByText('4 questions')).toBeInTheDocument();
    });

    it('renders the summary text with round and question counts', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            roundsCount: 2,
            isByCategory: true,
            perRoundBreakdown: breakdownWithCategories,
          })}
        />
      );

      // Total questions = 5 + 4 = 9
      expect(screen.getByText(/2 rounds/i)).toBeInTheDocument();
      expect(screen.getByText(/9 questions/i)).toBeInTheDocument();
    });

    it('does not render empty-state message when breakdown is present', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: breakdownWithCategories,
          })}
        />
      );

      expect(
        screen.queryByText(/no questions imported yet/i)
      ).not.toBeInTheDocument();
    });

    it('renders the By Category switch in checked state', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: breakdownWithCategories,
          })}
        />
      );

      const toggle = screen.getByRole('switch', { name: /by category/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  // -------------------------------------------------------------------------
  // State C — isByCategory: true, no questions
  // -------------------------------------------------------------------------

  describe('State C: isByCategory=true, no questions', () => {
    it('renders Rounds slider but not QPR slider', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: emptyBreakdown,
          })}
        />
      );

      expect(screen.getByRole('slider', { name: /number of rounds/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('slider', { name: /questions per round/i })
      ).not.toBeInTheDocument();
    });

    it('renders the empty-state message', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: emptyBreakdown,
          })}
        />
      );

      expect(
        screen.getByText(/no questions imported yet/i)
      ).toBeInTheDocument();
    });

    it('does not render category badge pills', () => {
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: emptyBreakdown,
          })}
        />
      );

      expect(screen.queryByText(/science/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Toggle interaction
  // -------------------------------------------------------------------------

  describe('Toggle interaction', () => {
    it('calls onToggleByCategory with true when toggled from false', () => {
      const onToggleByCategory = vi.fn();
      render(
        <WizardStepSettings
          {...createDefaultProps({ isByCategory: false, onToggleByCategory })}
        />
      );

      fireEvent.click(screen.getByRole('switch', { name: /by category/i }));

      expect(onToggleByCategory).toHaveBeenCalledOnce();
      expect(onToggleByCategory).toHaveBeenCalledWith(true);
    });

    it('calls onToggleByCategory with false when toggled from true', () => {
      const onToggleByCategory = vi.fn();
      render(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: breakdownWithCategories,
            onToggleByCategory,
          })}
        />
      );

      fireEvent.click(screen.getByRole('switch', { name: /by category/i }));

      expect(onToggleByCategory).toHaveBeenCalledOnce();
      expect(onToggleByCategory).toHaveBeenCalledWith(false);
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility: role selectors required by spec
  // -------------------------------------------------------------------------

  describe('ARIA role selectors', () => {
    it('getByRole("switch", { name: /by category/i }) succeeds', () => {
      render(<WizardStepSettings {...createDefaultProps()} />);

      expect(
        screen.getByRole('switch', { name: /by category/i })
      ).toBeInTheDocument();
    });

    it('getByRole("slider", { name: /questions per round/i }) is NEVER present (regardless of isByCategory)', () => {
      const { rerender } = render(
        <WizardStepSettings {...createDefaultProps({ isByCategory: false })} />
      );

      expect(
        screen.queryByRole('slider', { name: /questions per round/i })
      ).not.toBeInTheDocument();

      rerender(
        <WizardStepSettings
          {...createDefaultProps({
            isByCategory: true,
            perRoundBreakdown: breakdownWithCategories,
          })}
        />
      );

      expect(
        screen.queryByRole('slider', { name: /questions per round/i })
      ).not.toBeInTheDocument();
    });
  });
});
