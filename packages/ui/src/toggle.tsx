'use client';

import { useId } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  const id = useId();

  return (
    <label
      className={`
        flex items-center gap-3 min-h-[44px] cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div
        role="switch"
        aria-checked={checked}
        className={`
          relative inline-flex h-[44px] w-[80px] shrink-0
          items-center rounded-full
          transition-colors duration-200
          focus-within:ring-4 focus-within:ring-primary/50
          ${checked ? 'bg-accent' : 'bg-muted'}
          ${disabled ? '' : 'peer-focus:ring-4 peer-focus:ring-primary/50'}
        `}
      >
        <span
          className={`
            inline-block h-[36px] w-[36px] rounded-full bg-white
            shadow-md transition-transform duration-200
            ${checked ? 'translate-x-[40px]' : 'translate-x-[4px]'}
          `}
        />
      </div>
      <span className="text-lg font-medium select-none">
        {label}
      </span>
    </label>
  );
}
