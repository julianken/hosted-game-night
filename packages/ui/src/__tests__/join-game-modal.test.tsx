import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinGameModal } from '../join-game-modal';

describe('JoinGameModal', () => {
  const defaultProps = {
    roomCode: 'SWAN-42',
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with room code in title', () => {
      render(<JoinGameModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Join Game SWAN-42')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<JoinGameModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render presenter PIN input', () => {
      render(<JoinGameModal {...defaultProps} />);
      expect(screen.getByLabelText('Presenter PIN')).toBeInTheDocument();
    });

    it('should render instruction text', () => {
      render(<JoinGameModal {...defaultProps} />);
      expect(
        screen.getByText('Enter the presenter PIN to control this game.')
      ).toBeInTheDocument();
    });

    it('should render audience info text', () => {
      render(<JoinGameModal {...defaultProps} />);
      expect(screen.getByText(/Audience members:/)).toBeInTheDocument();
      expect(
        screen.getByText(/You don't need a PIN/)
      ).toBeInTheDocument();
    });

    it('should render Cancel and Join buttons', () => {
      render(<JoinGameModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Join as Presenter' })
      ).toBeInTheDocument();
    });

    it('should render PIN input', () => {
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN');
      // Input should be in the document
      expect(input).toBeInTheDocument();
    });
  });

  describe('PIN input validation', () => {
    it('should allow typing numeric digits', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN') as HTMLInputElement;

      await user.type(input, '1234');
      expect(input.value).toBe('1234');
    });

    it('should reject non-numeric characters', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN') as HTMLInputElement;

      await user.type(input, 'abc123xyz');
      expect(input.value).toBe('123');
    });

    it('should limit input to 6 digits', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN') as HTMLInputElement;

      await user.type(input, '1234567890');
      expect(input.value).toBe('123456');
    });

    it('should accept 4-digit PIN', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN') as HTMLInputElement;

      await user.type(input, '1234');
      expect(input.value).toBe('1234');
    });

    it('should accept 6-digit PIN', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN') as HTMLInputElement;

      await user.type(input, '123456');
      expect(input.value).toBe('123456');
    });

    it('should show error when PIN is empty on submit', async () => {
      render(<JoinGameModal {...defaultProps} />);
      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });

      // Submit button should be disabled when PIN is empty
      expect(submitButton).toBeDisabled();
    });

    it('should show error when PIN is less than 4 digits', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN');
      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });

      await user.type(input, '123');
      await user.click(submitButton);
      expect(screen.getByText('PIN must be at least 4 digits')).toBeInTheDocument();
    });

    it('should clear local error when typing', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);
      const input = screen.getByLabelText('Presenter PIN');

      // Type less than 4 digits
      await user.type(input, '12');

      // Try to submit (this will show error)
      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });
      await user.click(submitButton);

      expect(screen.getByText('PIN must be at least 4 digits')).toBeInTheDocument();

      // Type more to clear error
      await user.type(input, '34');
      expect(screen.queryByText('PIN must be at least 4 digits')).not.toBeInTheDocument();
    });
  });

  describe('submit functionality', () => {
    it('should call onSubmit with valid PIN', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<JoinGameModal {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText('Presenter PIN');
      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });

      await user.type(input, '1234');
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith('1234');
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('should not call onSubmit when PIN is empty', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<JoinGameModal {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should not call onSubmit when PIN is less than 4 digits', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<JoinGameModal {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText('Presenter PIN');
      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });

      await user.type(input, '123');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should submit on Enter key press', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<JoinGameModal {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText('Presenter PIN');

      await user.type(input, '1234');
      await user.keyboard('{Enter}');

      expect(onSubmit).toHaveBeenCalledWith('1234');
    });

    it('should not submit on Enter when PIN is invalid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<JoinGameModal {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText('Presenter PIN');

      await user.type(input, '12');
      await user.keyboard('{Enter}');

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable inputs and buttons when loading', () => {
      render(<JoinGameModal {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Presenter PIN')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      // When loading, button shows "Loading..." text
      const loadingButton = screen.getByRole('button', { name: /Loading/ });
      expect(loadingButton).toBeDisabled();
    });

    it('should show loading text on submit button', () => {
      render(<JoinGameModal {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not call onSubmit when loading', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<JoinGameModal {...defaultProps} isLoading={true} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: /Loading/ });
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should not submit on Enter when loading', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<JoinGameModal {...defaultProps} isLoading={true} onSubmit={onSubmit} />);

      await user.keyboard('{Enter}');

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should display server error message', () => {
      render(
        <JoinGameModal {...defaultProps} error="Incorrect PIN. 4 attempts remaining." />
      );

      expect(screen.getByText('Incorrect PIN. 4 attempts remaining.')).toBeInTheDocument();
    });

    it('should prioritize server error over local error', async () => {
      const user = userEvent.setup();
      render(
        <JoinGameModal {...defaultProps} error="Server error" />
      );

      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });
      await user.click(submitButton);

      expect(screen.getByText('Server error')).toBeInTheDocument();
      expect(screen.queryByText('Please enter a PIN')).not.toBeInTheDocument();
    });
  });

  describe('remaining attempts warning', () => {
    it('should show warning when remaining attempts < 5', () => {
      render(<JoinGameModal {...defaultProps} remainingAttempts={3} />);

      expect(screen.getByText('3 attempts remaining')).toBeInTheDocument();
    });

    it('should show singular form for 1 attempt', () => {
      render(<JoinGameModal {...defaultProps} remainingAttempts={1} />);

      expect(screen.getByText('1 attempt remaining')).toBeInTheDocument();
    });

    it('should not show warning when remaining attempts >= 5', () => {
      render(<JoinGameModal {...defaultProps} remainingAttempts={5} />);

      expect(screen.queryByText(/attempts remaining/)).not.toBeInTheDocument();
    });

    it('should not show warning when remainingAttempts is undefined', () => {
      render(<JoinGameModal {...defaultProps} />);

      expect(screen.queryByText(/attempts remaining/)).not.toBeInTheDocument();
    });

    it('should not show warning when there is an error message', () => {
      render(
        <JoinGameModal
          {...defaultProps}
          remainingAttempts={3}
          error="Incorrect PIN"
        />
      );

      expect(screen.queryByText('3 attempts remaining')).not.toBeInTheDocument();
    });

    it('should have proper ARIA attributes for warning', () => {
      render(<JoinGameModal {...defaultProps} remainingAttempts={2} />);

      const warning = screen.getByRole('alert');
      expect(warning).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('close functionality', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<JoinGameModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button (X) is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<JoinGameModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

  });

  describe('accessibility', () => {
    it('should have proper ARIA role', () => {
      render(<JoinGameModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<JoinGameModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have accessible title', () => {
      render(<JoinGameModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(screen.getByText('Join Game SWAN-42')).toHaveAttribute('id', 'modal-title');
    });

    it('should have proper label for PIN input', () => {
      render(<JoinGameModal {...defaultProps} />);

      const input = screen.getByLabelText('Presenter PIN');
      expect(input).toHaveAttribute('aria-label', 'Presenter PIN');
    });

    it('should mark input as invalid when there is an error', () => {
      render(<JoinGameModal {...defaultProps} error="Invalid PIN" />);

      const input = screen.getByLabelText('Presenter PIN');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should associate error message with input', () => {
      render(<JoinGameModal {...defaultProps} error="Invalid PIN" />);

      const input = screen.getByLabelText('Presenter PIN');
      const errorId = input.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();

      const errorElement = screen.getByText('Invalid PIN');
      expect(errorElement).toHaveAttribute('id', errorId);
      expect(errorElement).toHaveAttribute('role', 'alert');
    });

    it('should disable submit button when PIN is empty', () => {
      render(<JoinGameModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when PIN is entered', async () => {
      const user = userEvent.setup();
      render(<JoinGameModal {...defaultProps} />);

      const input = screen.getByLabelText('Presenter PIN');
      await user.type(input, '1234');

      const submitButton = screen.getByRole('button', { name: 'Join as Presenter' });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('password type', () => {
    it('should render PIN input as password type', () => {
      render(<JoinGameModal {...defaultProps} />);

      const input = screen.getByLabelText('Presenter PIN');
      expect(input).toHaveAttribute('type', 'password');
    });
  });
});
