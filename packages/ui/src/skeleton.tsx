'use client';

import { HTMLAttributes, forwardRef } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Width of the skeleton. Can be a number (pixels) or string (CSS value).
   * @default '100%'
   */
  width?: number | string;
  /**
   * Height of the skeleton. Can be a number (pixels) or string (CSS value).
   * @default '1rem'
   */
  height?: number | string;
  /**
   * Shape variant of the skeleton.
   * @default 'rectangular'
   */
  variant?: 'rectangular' | 'circular' | 'text';
  /**
   * Animation style of the skeleton.
   * @default 'pulse'
   */
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base skeleton component for loading states.
 * Provides a placeholder with animation while content loads.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width = '100%',
      height = '1rem',
      variant = 'rectangular',
      animation = 'pulse',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const widthStyle = typeof width === 'number' ? `${width}px` : width;
    const heightStyle = typeof height === 'number' ? `${height}px` : height;

    const variantStyles = {
      rectangular: 'rounded-md',
      circular: 'rounded-full',
      text: 'rounded',
    };

    const animationStyles = {
      pulse: 'animate-pulse motion-reduce:animate-none',
      wave: 'animate-shimmer motion-reduce:animate-none bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]',
      none: '',
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading..."
        className={`
          bg-muted/60
          ${variantStyles[variant]}
          ${animationStyles[animation]}
          ${className}
        `.trim()}
        style={{
          width: widthStyle,
          height: heightStyle,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
