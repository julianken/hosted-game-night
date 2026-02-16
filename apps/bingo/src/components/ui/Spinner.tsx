'use client';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const strokeWidths = {
  sm: 4,
  md: 4,
  lg: 3,
  xl: 3,
};

export function Spinner({ size = 'md', label = 'Loading', className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`.trim()}
    >
      <svg
        className={`animate-spin motion-reduce:animate-none text-primary ${sizeStyles[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={strokeWidths[size]}
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Full-page spinner overlay
export interface SpinnerOverlayProps extends SpinnerProps {
  message?: string;
}

export function SpinnerOverlay({
  size = 'lg',
  label = 'Loading',
  message,
}: SpinnerOverlayProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="
        fixed inset-0 z-50
        flex flex-col items-center justify-center gap-4
        bg-background/80 backdrop-blur-sm
      "
    >
      <Spinner size={size} label={label} />
      {message && (
        <p className="text-xl font-medium text-foreground">{message}</p>
      )}
    </div>
  );
}

// Inline spinner for buttons or text
export interface InlineSpinnerProps {
  className?: string;
}

export function InlineSpinner({ className = '' }: InlineSpinnerProps) {
  return (
    <svg
      className={`animate-spin motion-reduce:animate-none h-5 w-5 ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={4}
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
