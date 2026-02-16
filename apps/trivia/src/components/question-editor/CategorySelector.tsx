'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import type { QuestionCategory } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/categories';

export interface CategorySelectorProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  value: QuestionCategory;
  onChange: (category: QuestionCategory) => void;
  error?: string;
  helperText?: string;
}

/**
 * Category selector dropdown for question editor.
 * Displays all 7 standard categories with human-readable names.
 */
export const CategorySelector = forwardRef<HTMLSelectElement, CategorySelectorProps>(
  ({ label, value, onChange, error, helperText, className = '', id, disabled, required, ...props }, ref) => {
    const selectId = id || 'category-selector';
    const hasError = !!error;

    return (
      <div className="w-full">
        <label
          htmlFor={selectId}
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

        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value as QuestionCategory)}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
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
        >
          {DEFAULT_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {error && (
          <p id={`${selectId}-error`} className="mt-2 text-base text-error" role="alert">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${selectId}-helper`} className="mt-2 text-base text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

CategorySelector.displayName = 'CategorySelector';
