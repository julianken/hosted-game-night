import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Skeleton } from '../skeleton';

describe('Skeleton', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...');
    });

    it('should render with custom aria-label', () => {
      render(<Skeleton aria-label="Loading content" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });
  });

  describe('dimensions', () => {
    it('should apply default width of 100%', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.width).toBe('100%');
    });

    it('should apply default height of 1rem', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.height).toBe('1rem');
    });

    it('should apply numeric width as pixels', () => {
      render(<Skeleton width={100} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.width).toBe('100px');
    });

    it('should apply string width as-is', () => {
      render(<Skeleton width="50%" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.width).toBe('50%');
    });

    it('should apply numeric height as pixels', () => {
      render(<Skeleton height={24} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.height).toBe('24px');
    });

    it('should apply string height as-is', () => {
      render(<Skeleton height="2rem" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.height).toBe('2rem');
    });
  });

  describe('variants', () => {
    it('should apply rectangular variant styles by default', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('rounded-md');
    });

    it('should apply circular variant styles', () => {
      render(<Skeleton variant="circular" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('rounded-full');
    });

    it('should apply text variant styles', () => {
      render(<Skeleton variant="text" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('rounded');
    });
  });

  describe('animations', () => {
    it('should apply shimmer animation by default', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('jb-skeleton-shimmer');
    });

    it('should apply wave animation styles', () => {
      render(<Skeleton animation="wave" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('jb-skeleton-shimmer');
    });

    it('should not apply animation when animation is none', () => {
      render(<Skeleton animation="none" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).not.toContain('jb-skeleton-shimmer');
      expect(skeleton.className).not.toContain('animate-pulse');
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      render(<Skeleton className="custom-class" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('custom-class');
    });

    it('should merge custom styles with dimension styles', () => {
      render(
        <Skeleton
          width={100}
          style={{ backgroundColor: 'red' }}
          data-testid="skeleton"
        />
      );
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.style.width).toBe('100px');
      expect(skeleton.style.backgroundColor).toBe('red');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref correctly', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Skeleton ref={ref} data-testid="skeleton" />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('HTML attributes', () => {
    it('should pass through data attributes', () => {
      render(<Skeleton data-testid="skeleton" data-custom="value" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('data-custom', 'value');
    });
  });
});
