/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      fontSize: {
        // Senior-friendly font sizes
        'senior-base': '1.125rem',   // 18px
        'senior-lg': '1.25rem',      // 20px
        'senior-xl': '1.5rem',       // 24px
        'senior-2xl': '1.875rem',    // 30px
        'senior-3xl': '2.25rem',     // 36px
        'senior-4xl': '3rem',        // 48px
        'senior-5xl': '3.75rem',     // 60px
        'senior-6xl': '4.5rem',      // 72px
        'senior-7xl': '6rem',        // 96px
        'senior-8xl': '8rem',        // 128px
      },
      minHeight: {
        'touch': '2.75rem',     // 44px
        'touch-lg': '3.5rem',   // 56px
        'touch-xl': '4rem',     // 64px
      },
      minWidth: {
        'touch': '2.75rem',     // 44px
        'touch-lg': '3.5rem',   // 56px
        'touch-xl': '4rem',     // 64px
      },
      spacing: {
        'touch': '2.75rem',     // 44px
      },
    },
  },
};
