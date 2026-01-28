'use client';

import { HTMLAttributes, forwardRef } from 'react';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Avatar image URL */
  src?: string | null;
  /** User's name for fallback initials */
  name?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Alt text for image */
  alt?: string;
}

/**
 * Avatar component with fallback to initials
 *
 * Displays user avatar image or falls back to colored circle with initials.
 * Follows senior-friendly design with clear visibility.
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name = '', size = 'md', alt, className = '', ...props }, ref) => {
    // Size mappings
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-12 h-12 text-base',
      lg: 'w-16 h-16 text-xl',
      xl: 'w-24 h-24 text-3xl',
    };

    // Get initials from name
    const getInitials = (name: string): string => {
      if (!name) return '?';

      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
      }
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Generate consistent background color from name
    const getBackgroundColor = (name: string): string => {
      const colors = [
        'bg-blue-500',
        'bg-emerald-500',
        'bg-purple-500',
        'bg-orange-500',
        'bg-pink-500',
        'bg-teal-500',
        'bg-indigo-500',
        'bg-rose-500',
      ];

      // Simple hash function for consistent color
      const hash = name.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0);

      return colors[hash % colors.length];
    };

    const initials = getInitials(name);
    const bgColor = getBackgroundColor(name);

    return (
      <div
        ref={ref}
        className={`
          relative
          inline-flex items-center justify-center
          rounded-full
          overflow-hidden
          flex-shrink-0
          ${sizeClasses[size]}
          ${!src ? `${bgColor} text-white font-semibold` : 'bg-muted'}
          ${className}
        `.trim()}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || `${name}'s avatar`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span aria-label={`${name}'s initials`}>{initials}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
