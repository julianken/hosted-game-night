'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      className = '',
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="
            block mb-2
            text-lg font-semibold
            text-gray-900 dark:text-gray-100
          "
        >
          {label}
          {required && (
            <span className="ml-1 text-error" aria-label="required">
              *
            </span>
          )}
        </label>

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={
            hasError
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          className={`
            w-full
            min-h-[56px]
            px-4 py-3
            text-lg
            bg-white dark:bg-gray-800
            border-2 rounded-lg
            transition-colors
            focus:outline-none focus:ring-4
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              hasError
                ? 'border-error focus:border-error focus:ring-error/50'
                : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary/50'
            }
            ${className}
          `.trim()}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-base text-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-2 text-base text-gray-600 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
