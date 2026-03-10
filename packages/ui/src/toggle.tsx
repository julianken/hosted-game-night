'use client';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  labelPosition?: 'left' | 'right';
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  labelPosition = 'right',
}: ToggleProps) {
  const handleToggle = () => {
    if (!disabled) onChange(!checked);
  };

  // Track and thumb sizes per spec (section 3.5 / 1.15):
  // sm: 40x24px track, 16px thumb with 4px inset
  // md: 52x30px track, 22px thumb with 4px inset
  const trackW = size === 'md' ? 52 : 40;
  const trackH = size === 'md' ? 30 : 24;
  const thumbSize = size === 'md' ? 22 : 16;
  const thumbInset = 4;
  const thumbTravel = trackW - thumbSize - thumbInset * 2;

  const trackStyle = {
    width: trackW,
    height: trackH,
  };

  const thumbStyle = {
    width: thumbSize,
    height: thumbSize,
    transform: checked
      ? `translateX(${thumbInset + thumbTravel}px)`
      : `translateX(${thumbInset}px)`,
  };

  const labelEl = (
    <span
      className="text-base font-medium select-none text-foreground"
      onClick={handleToggle}
    >
      {label}
    </span>
  );

  return (
    <div
      className={[
        'flex items-center gap-3',
        // 44px minimum touch target
        'min-h-[44px]',
        disabled ? 'opacity-[0.38] cursor-not-allowed' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {labelPosition === 'left' && labelEl}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={handleToggle}
        style={trackStyle}
        className={[
          'relative shrink-0',
          'items-center rounded-full border-0 p-0',
          'transition-colors duration-200',
          // Checked: success green. Unchecked: muted surface.
          checked ? 'bg-success' : 'bg-secondary',
          // Hover ring (subtle glow)
          !disabled
            ? 'hover:shadow-[0_0_0_3px_var(--ring)] focus-visible:shadow-[0_0_0_3px_var(--ring)]'
            : '',
          'outline-none',
          'disabled:cursor-not-allowed',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          style={thumbStyle}
          className="absolute top-[4px] inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
        />
      </button>

      {labelPosition === 'right' && labelEl}
    </div>
  );
}
