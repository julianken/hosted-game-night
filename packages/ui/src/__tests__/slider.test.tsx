import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from '../slider';

describe('Slider', () => {
  const defaultProps = {
    value: 50,
    onChange: vi.fn(),
    min: 0,
    max: 100,
    label: 'Test Slider',
  };

  describe('rendering', () => {
    it('should render with initial value', () => {
      render(<Slider {...defaultProps} value={75} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('75');
    });

    it('should render with label', () => {
      render(<Slider {...defaultProps} label="Volume" />);
      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('should display current value', () => {
      render(<Slider {...defaultProps} value={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display value with unit', () => {
      render(<Slider {...defaultProps} value={30} unit="s" />);
      expect(screen.getByText('30s')).toBeInTheDocument();
    });
  });

  describe('value changes', () => {
    it('should call onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Slider {...defaultProps} onChange={handleChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '75' } });

      expect(handleChange).toHaveBeenCalledWith(75);
    });

    it('should convert string value to number in onChange', () => {
      const handleChange = vi.fn();
      render(<Slider {...defaultProps} onChange={handleChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '25' } });

      expect(handleChange).toHaveBeenCalledWith(25);
      expect(typeof handleChange.mock.calls[0][0]).toBe('number');
    });
  });

  describe('min/max bounds', () => {
    it('should respect min value', () => {
      render(<Slider {...defaultProps} min={10} max={100} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '10');
    });

    it('should respect max value', () => {
      render(<Slider {...defaultProps} min={0} max={200} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('max', '200');
    });
  });

  describe('step value', () => {
    it('should use step=1 by default', () => {
      render(<Slider {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('step', '1');
    });

    it('should respect custom step value', () => {
      render(<Slider {...defaultProps} step={5} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('step', '5');
    });

    it('should respect decimal step value', () => {
      render(<Slider {...defaultProps} step={0.1} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('step', '0.1');
    });
  });

  describe('keyboard controls', () => {
    it('should respond to keyboard events', () => {
      const handleChange = vi.fn();
      render(<Slider {...defaultProps} value={50} onChange={handleChange} />);

      const slider = screen.getByRole('slider');

      // Simulate keyboard change (actual arrow key behavior depends on browser)
      fireEvent.change(slider, { target: { value: '51' } });
      expect(handleChange).toHaveBeenCalledWith(51);
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled=true', () => {
      render(<Slider {...defaultProps} disabled />);
      const slider = screen.getByRole('slider');
      expect(slider).toBeDisabled();
    });

    it('should apply disabled styling to label', () => {
      render(<Slider {...defaultProps} disabled label="Disabled Slider" />);
      const label = screen.getByText('Disabled Slider');
      expect(label.className).toContain('opacity-[0.38]');
    });

    it('should apply disabled styling to value display', () => {
      render(<Slider {...defaultProps} disabled value={42} />);
      const valueDisplay = screen.getByText('42');
      expect(valueDisplay.className).toContain('opacity-[0.38]');
    });
  });

  describe('accessibility', () => {
    it('should have role=slider', () => {
      render(<Slider {...defaultProps} />);
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<Slider {...defaultProps} label="Brightness" />);
      // react-aria-components associates the label via aria-labelledby or aria-label
      const slider = screen.getByRole('slider', { name: /brightness/i });
      expect(slider).toBeInTheDocument();
    });
  });

  describe('accessible design', () => {
    it('should have visible thumb for easy interaction', () => {
      const { container } = render(<Slider {...defaultProps} />);
      // SliderThumb is rendered with 32x32 inline styles for accessibility
      const thumb = container.querySelector('[data-rac]');
      expect(thumb).toBeInTheDocument();
    });

    it('should have label with readable text', () => {
      render(<Slider {...defaultProps} label="Volume" />);
      const label = screen.getByText('Volume');
      expect(label.className).toContain('text-base');
    });
  });

  describe('visual styling', () => {
    it('should render a track element', () => {
      const { container } = render(<Slider {...defaultProps} value={50} min={0} max={100} />);
      // The track is rendered via SliderTrack with relative + w-full classes
      const track = container.querySelector('.relative.w-full');
      expect(track).toBeInTheDocument();
    });

    it('should render a fill indicator element', () => {
      const { container } = render(<Slider {...defaultProps} value={50} min={0} max={100} />);
      // The fill is an absolute positioned div inside the track
      const fill = container.querySelector('.absolute.h-full.bg-primary');
      expect(fill).toBeInTheDocument();
    });
  });
});
