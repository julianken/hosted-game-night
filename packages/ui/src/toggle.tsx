'use client';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  const handleToggle = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <div
      className={`
        flex items-center gap-3 min-h-[44px]
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={handleToggle}
        className={`
          relative inline-flex h-[44px] w-[80px] shrink-0
          items-center rounded-full border-0 p-0
          transition-colors duration-200
          focus:outline-none focus:ring-4 focus:ring-primary/50
          ${checked ? 'bg-accent' : 'bg-muted'}
          disabled:cursor-not-allowed
        `}
      >
        <span
          className={`
            inline-block h-[36px] w-[36px] rounded-full bg-white
            shadow-md transition-transform duration-200
            ${checked ? 'translate-x-[40px]' : 'translate-x-[4px]'}
          `}
        />
      </button>
      <span
        className="text-lg font-medium select-none"
        onClick={handleToggle}
      >
        {label}
      </span>
    </div>
  );
}
