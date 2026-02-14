import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from '../toggle';

describe('Toggle', () => {
  const defaultProps = {
    checked: false,
    onChange: vi.fn(),
    label: 'Test Toggle',
  };

  describe('rendering', () => {
    it('should render in off state correctly', () => {
      render(<Toggle {...defaultProps} checked={false} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should render in on state correctly', () => {
      render(<Toggle {...defaultProps} checked={true} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should render with label', () => {
      render(<Toggle {...defaultProps} label="Enable notifications" />);
      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    });
  });

  describe('toggle interaction', () => {
    it('should call onChange with true when clicking an off toggle', () => {
      const handleChange = vi.fn();
      render(<Toggle {...defaultProps} checked={false} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with false when clicking an on toggle', () => {
      const handleChange = vi.fn();
      render(<Toggle {...defaultProps} checked={true} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('disabled state', () => {
    it('should not call onChange when disabled', () => {
      const handleChange = vi.fn();
      render(<Toggle {...defaultProps} disabled onChange={handleChange} />);

      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should have disabled attribute when disabled', () => {
      render(<Toggle {...defaultProps} disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('should apply disabled styling', () => {
      render(<Toggle {...defaultProps} disabled label="Disabled Toggle" />);
      const wrapper = screen.getByText('Disabled Toggle').parentElement;
      expect(wrapper?.className).toContain('opacity-50');
    });
  });

  describe('label click', () => {
    it('should toggle switch when label is clicked', () => {
      const handleChange = vi.fn();
      render(<Toggle {...defaultProps} onChange={handleChange} label="Click me" />);

      const label = screen.getByText('Click me');
      fireEvent.click(label);
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('accessibility', () => {
    it('should have switch role', () => {
      render(<Toggle {...defaultProps} />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should have accessible name from label', () => {
      render(<Toggle {...defaultProps} label="Test Toggle" />);
      expect(screen.getByRole('switch', { name: 'Test Toggle' })).toBeInTheDocument();
    });

    it('should have correct aria-checked when off', () => {
      render(<Toggle {...defaultProps} checked={false} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('should have correct aria-checked when on', () => {
      render(<Toggle {...defaultProps} checked={true} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('styling', () => {
    it('should apply checked styles when on', () => {
      render(<Toggle {...defaultProps} checked={true} />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('bg-accent');
    });

    it('should apply unchecked styles when off', () => {
      render(<Toggle {...defaultProps} checked={false} />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('bg-muted');
    });

    it('should have minimum height of 44px for senior-friendly design', () => {
      render(<Toggle {...defaultProps} />);
      const wrapper = screen.getByText('Test Toggle').parentElement;
      expect(wrapper?.className).toContain('min-h-[44px]');

      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('h-[44px]');
    });
  });
});
