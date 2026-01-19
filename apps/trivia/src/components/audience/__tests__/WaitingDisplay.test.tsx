import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaitingDisplay } from '../WaitingDisplay';

describe('WaitingDisplay', () => {
  describe('rendering', () => {
    it('should render the provided message', () => {
      render(<WaitingDisplay message="Waiting for the game to start..." />);

      expect(
        screen.getByText('Waiting for the game to start...')
      ).toBeInTheDocument();
    });

    it('should render a different message', () => {
      render(<WaitingDisplay message="Please stand by" />);

      expect(screen.getByText('Please stand by')).toBeInTheDocument();
    });

    it('should render the helper text', () => {
      render(<WaitingDisplay message="Test message" />);

      expect(
        screen.getByText('The game will appear here when the presenter is ready.')
      ).toBeInTheDocument();
    });
  });

  describe('text size for readability', () => {
    it('should have large text for the message', () => {
      const { container } = render(
        <WaitingDisplay message="Large readable message" />
      );

      // The message should have large text classes
      const messageElement = screen.getByText('Large readable message');
      expect(messageElement).toHaveClass('text-3xl');
    });

    it('should have readable text for the helper', () => {
      const { container } = render(<WaitingDisplay message="Test" />);

      const helperElement = screen.getByText(
        'The game will appear here when the presenter is ready.'
      );
      expect(helperElement).toHaveClass('text-xl');
    });
  });

  describe('layout', () => {
    it('should be centered vertically', () => {
      const { container } = render(<WaitingDisplay message="Test" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('should have minimum height for visibility', () => {
      const { container } = render(<WaitingDisplay message="Test" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-[60vh]');
    });
  });

  describe('loading indicator', () => {
    it('should render a spinner', () => {
      const { container } = render(<WaitingDisplay message="Loading" />);

      // Check for the spinning element
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have visible spinner styling', () => {
      const { container } = render(<WaitingDisplay message="Loading" />);

      const spinner = container.querySelector('.rounded-full');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-32');
      expect(spinner).toHaveClass('h-32');
    });
  });

  describe('accessibility', () => {
    it('should have centered text', () => {
      const { container } = render(<WaitingDisplay message="Test" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('text-center');
    });
  });
});
