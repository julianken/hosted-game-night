import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast, StandaloneToast } from '@joolie-boolie/ui';

// Test component that uses the toast hook
function TestComponent() {
  const { success, error, info, warning, toasts, removeToast } = useToast();

  return (
    <div>
      <button onClick={() => success('Success message')}>Show Success</button>
      <button onClick={() => error('Error message')}>Show Error</button>
      <button onClick={() => info('Info message')}>Show Info</button>
      <button onClick={() => warning('Warning message')}>Show Warning</button>
      <div data-testid="toast-count">{toasts.length}</div>
      {toasts.map((toast) => (
        <button key={toast.id} onClick={() => removeToast(toast.id)}>
          Remove {toast.id}
        </button>
      ))}
    </div>
  );
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div>Test content</div>
      </ToastProvider>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('provides toast context', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    expect(screen.getByText('Show Success')).toBeInTheDocument();
  });

  it('throws error when useToast is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );
    consoleError.mockRestore();
  });
});

describe('Toast functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows success toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('shows error toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('shows info toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('shows warning toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('auto-dismisses toast after duration', async () => {
    render(
      <ToastProvider defaultDuration={1000}>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Advance timers to trigger auto-dismiss
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Advance timers for animation
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('removes toast when dismiss button is clicked', () => {
    render(
      <ToastProvider defaultDuration={0}>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    // Advance timers for animation
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('can display multiple toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });
});

describe('Toast accessibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toast has role="alert"', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('toast region has aria-live="polite"', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByRole('region')).toHaveAttribute('aria-live', 'polite');
  });

  it('toast region has aria-label', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Notifications'
    );
  });

  it('dismiss button has accessible label', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });
});

describe('Toast positioning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies top-right position by default', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    const region = screen.getByRole('region');
    expect(region).toHaveClass('top-4', 'right-4');
  });

  it('applies custom position', () => {
    render(
      <ToastProvider position="bottom-left">
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    const region = screen.getByRole('region');
    expect(region).toHaveClass('bottom-4', 'left-4');
  });
});

describe('Toast variants', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('success toast has success border', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-surface-elevated', 'border-l-success');
  });

  it('error toast has error border', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-surface-elevated', 'border-l-error');
  });

  it('info toast has info border', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-surface-elevated', 'border-l-info');
  });

  it('warning toast has warning border', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-surface-elevated', 'border-l-warning');
  });
});

describe('StandaloneToast', () => {
  it('renders message', () => {
    render(<StandaloneToast message="Test message" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('has role="alert"', () => {
    render(<StandaloneToast message="Test" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<StandaloneToast message="Error!" variant="error" />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-surface-elevated', 'border-l-error');
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const handleDismiss = vi.fn();
    render(<StandaloneToast message="Test" onDismiss={handleDismiss} />);
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });

  it('hides dismiss button when onDismiss is not provided', () => {
    render(<StandaloneToast message="Test" />);
    expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = vi.fn();
    render(<StandaloneToast message="Test" onDismiss={handleDismiss} />);
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<StandaloneToast message="Test" className="custom-class" />);
    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });

  it('defaults to info variant', () => {
    render(<StandaloneToast message="Test" />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-surface-elevated', 'border-l-info');
  });
});
