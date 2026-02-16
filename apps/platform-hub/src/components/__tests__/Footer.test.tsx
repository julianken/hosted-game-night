import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Footer } from '../Footer';

describe('Footer', () => {
  // Mock Date to have consistent year in tests
  const mockDate = new Date('2026-01-19');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the footer element', () => {
      render(<Footer />);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('renders copyright with current year', () => {
      render(<Footer />);
      expect(screen.getByText(/2026 Joolie Boolie/)).toBeInTheDocument();
    });

    it('renders the accessibility note', () => {
      render(<Footer />);
      expect(
        screen.getByText(/Designed with accessibility in mind/)
      ).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('has footer navigation', () => {
      render(<Footer />);
      expect(screen.getByRole('navigation', { name: 'Footer navigation' })).toBeInTheDocument();
    });

    it('renders About link', () => {
      render(<Footer />);
      const aboutLink = screen.getByRole('link', { name: 'About' });
      expect(aboutLink).toBeInTheDocument();
      expect(aboutLink).toHaveAttribute('href', '/about');
    });

    it('renders Help link', () => {
      render(<Footer />);
      const helpLink = screen.getByRole('link', { name: 'Help' });
      expect(helpLink).toBeInTheDocument();
      expect(helpLink).toHaveAttribute('href', '/help');
    });

    it('renders Contact link', () => {
      render(<Footer />);
      const contactLink = screen.getByRole('link', { name: 'Contact' });
      expect(contactLink).toBeInTheDocument();
      expect(contactLink).toHaveAttribute('href', '/contact');
    });
  });

  describe('accessibility', () => {
    it('has role="contentinfo"', () => {
      render(<Footer />);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('navigation links are focusable', () => {
      render(<Footer />);
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).not.toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  describe('styling', () => {
    it('has border-top', () => {
      render(<Footer />);
      const footer = screen.getByRole('contentinfo');
      expect(footer.className).toContain('border-t');
    });

    it('applies custom className', () => {
      render(<Footer className="custom-footer" />);
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = createRef<HTMLElement>();
      render(<Footer ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe('FOOTER');
    });
  });

  describe('additional props', () => {
    it('passes through data attributes', () => {
      render(<Footer data-testid="main-footer" />);
      expect(screen.getByTestId('main-footer')).toBeInTheDocument();
    });
  });
});
