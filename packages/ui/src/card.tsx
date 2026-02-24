'use client';

import { HTMLAttributes, forwardRef } from 'react';

// ============================================================
// Card -- shared component per FINAL-DESIGN-PLAN.md section 3.9
// Sub-components: Card, CardHeader, CardBody, CardFooter
// Variants: default | interactive | selected
// ============================================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'selected';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={[
          // Base: surface background, subtle border, rounded-lg
          'bg-surface',
          'border border-border-subtle',
          'rounded-[var(--radius-lg)]',
          'overflow-hidden',
          // Variant styles
          variant === 'default'
            ? 'transition-colors duration-150'
            : '',
          variant === 'interactive'
            ? [
                'cursor-pointer',
                'transition-all duration-150',
                'hover:-translate-y-0.5',
                'hover:bg-surface-hover',
                'hover:border-border',
                'hover:shadow-md',
                'active:translate-y-0',
                'focus-visible:outline-2 focus-visible:outline-primary/40 focus-visible:outline-offset-2',
              ].join(' ')
            : '',
          variant === 'selected'
            ? [
                'bg-surface-selected',
                'border-border-strong',
                'shadow-sm',
              ].join(' ')
            : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ---- CardHeader ----

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ bordered = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          'px-6 py-4',
          bordered ? 'border-b border-border' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ---- CardBody ----

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={['px-6 py-4', className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// ---- CardFooter ----

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ bordered = true, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          'px-6 py-4',
          bordered ? 'border-t border-border' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
