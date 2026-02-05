/**
 * Accessibility Tests using vitest-axe
 *
 * These tests run axe-core accessibility audits on key components
 * to catch WCAG violations automatically.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ToastProvider } from "@beak-gaming/ui";

// Presenter components
import { BingoBoard } from '@/components/presenter/BingoBoard';
import { ControlPanel } from '@/components/presenter/ControlPanel';
import { BallDisplay, RecentBalls, BallCounter } from '@/components/presenter/BallDisplay';
import { PatternSelector, PatternPreview } from '@/components/presenter/PatternSelector';


// Types
import { BingoBall, BingoPattern } from '@/types';
import { allPatterns } from '@/lib/game/patterns';

// Test data
const mockBall: BingoBall = { column: 'B', number: 5, label: 'B-5' };
const mockCalledBalls: BingoBall[] = [
  { column: 'B', number: 5, label: 'B-5' },
  { column: 'I', number: 20, label: 'I-20' },
  { column: 'N', number: 35, label: 'N-35' },
  { column: 'G', number: 50, label: 'G-50' },
  { column: 'O', number: 65, label: 'O-65' },
];
const mockPattern: BingoPattern = allPatterns[0]; // Single line pattern

// Helper to render components with required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('Accessibility Tests', () => {
  describe('Presenter Components', () => {
    it('BingoBoard has no accessibility violations', async () => {
      const { container } = render(<BingoBoard calledBalls={[]} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('BingoBoard with called balls has no accessibility violations', async () => {
      const { container } = render(<BingoBoard calledBalls={mockCalledBalls} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('ControlPanel in idle state has no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <ControlPanel
          status="idle"
          canCall={false}
          canStart={true}
          canPause={false}
          canResume={false}
          canUndo={false}
          onStart={() => {}}
          onCallBall={() => {}}
          onPause={() => {}}
          onResume={() => {}}
          onReset={() => {}}
          onUndo={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('ControlPanel in playing state has no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <ControlPanel
          status="playing"
          canCall={true}
          canStart={false}
          canPause={true}
          canResume={false}
          canUndo={true}
          onStart={() => {}}
          onCallBall={() => {}}
          onPause={() => {}}
          onResume={() => {}}
          onReset={() => {}}
          onUndo={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('ControlPanel in paused state has no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <ControlPanel
          status="paused"
          canCall={true}
          canStart={false}
          canPause={false}
          canResume={true}
          canUndo={true}
          onStart={() => {}}
          onCallBall={() => {}}
          onPause={() => {}}
          onResume={() => {}}
          onReset={() => {}}
          onUndo={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('BallDisplay with no ball has no accessibility violations', async () => {
      const { container } = render(<BallDisplay ball={null} size="xl" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('BallDisplay with ball has no accessibility violations', async () => {
      const { container } = render(<BallDisplay ball={mockBall} size="xl" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('RecentBalls has no accessibility violations', async () => {
      const { container } = render(<RecentBalls balls={mockCalledBalls} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('RecentBalls with empty list has no accessibility violations', async () => {
      const { container } = render(<RecentBalls balls={[]} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('BallCounter has no accessibility violations', async () => {
      const { container } = render(<BallCounter called={10} remaining={65} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('PatternSelector has no accessibility violations', async () => {
      const { container } = render(
        <PatternSelector
          selectedPattern={mockPattern}
          onSelect={() => {}}
          disabled={false}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('PatternSelector disabled has no accessibility violations', async () => {
      const { container } = render(
        <PatternSelector
          selectedPattern={mockPattern}
          onSelect={() => {}}
          disabled={true}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('PatternPreview has no accessibility violations', async () => {
      const { container } = render(<PatternPreview pattern={mockPattern} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('PatternPreview with no pattern has no accessibility violations', async () => {
      const { container } = render(<PatternPreview pattern={null} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

});
