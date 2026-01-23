import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { createRef } from 'react';
import { Header } from '../Header';

describe('Header', () => {
  describe('rendering', () => {
    it('renders the header element', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders the brand name', () => {
      render(<Header />);
      expect(screen.getByText('Beak Gaming')).toBeInTheDocument();
    });

    it('renders the tagline on larger screens', () => {
      render(<Header />);
      expect(screen.getByText('Fun for Everyone')).toBeInTheDocument();
    });

    it('renders the home link', () => {
      render(<Header />);
      const homeLink = screen.getByLabelText('Beak Gaming Platform - Home');
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('navigation', () => {
    it('has main navigation', () => {
      render(<Header />);
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });

    it('renders Games link', () => {
      render(<Header />);
      const gamesLink = screen.getByRole('link', { name: 'Games' });
      expect(gamesLink).toBeInTheDocument();
      expect(gamesLink).toHaveAttribute('href', '/');
    });
  });

  describe('accessibility', () => {
    it('has role="banner"', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('home link has aria-label', () => {
      render(<Header />);
      expect(screen.getByLabelText('Beak Gaming Platform - Home')).toBeInTheDocument();
    });

    it('logo SVG has aria-hidden', () => {
      const { container } = render(<Header />);
      const logoSvg = container.querySelector('svg[aria-hidden="true"]');
      expect(logoSvg).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has border-bottom', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      expect(header.className).toContain('border-b');
    });

    it('applies custom className', () => {
      render(<Header className="custom-header" />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = createRef<HTMLElement>();
      render(<Header ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe('HEADER');
    });
  });

  describe('additional props', () => {
    it('passes through data attributes', () => {
      render(<Header data-testid="main-header" />);
      expect(screen.getByTestId('main-header')).toBeInTheDocument();
    });
  });
});
