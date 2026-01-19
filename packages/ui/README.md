# @beak-gaming/ui

Shared UI components for the Beak Gaming Platform. All components are designed with senior-friendly accessibility in mind: large touch targets, high contrast, and clear focus states.

## Installation

```json
{
  "dependencies": {
    "@beak-gaming/ui": "workspace:*"
  }
}
```

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@beak-gaming/ui';

// Primary action
<Button variant="primary" size="lg" onClick={handleClick}>
  Start Game
</Button>

// Secondary action
<Button variant="secondary" size="md">
  Open Display
</Button>

// Danger action
<Button variant="danger" size="md" onClick={handleReset}>
  Reset
</Button>

// Loading state
<Button loading>Processing...</Button>

// Disabled
<Button disabled>Not Available</Button>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Shows loading spinner |
| `disabled` | `boolean` | `false` | Disables the button |
| `className` | `string` | `''` | Additional CSS classes |

#### Sizes

| Size | Min Height | Font Size | Usage |
|------|------------|-----------|-------|
| `sm` | 44px | 16px | Compact actions |
| `md` | 56px | 18px | Standard actions |
| `lg` | 64px | 20px | Primary actions |

### Toggle

An accessible toggle switch for boolean settings.

```tsx
import { Toggle } from '@beak-gaming/ui';

<Toggle
  checked={audioEnabled}
  onChange={setAudioEnabled}
  label="Audio Announcements"
/>

// Disabled
<Toggle
  checked={false}
  onChange={() => {}}
  label="Feature Coming Soon"
  disabled
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | required | Current state |
| `onChange` | `(checked: boolean) => void` | required | Change handler |
| `label` | `string` | required | Accessible label |
| `disabled` | `boolean` | `false` | Disables the toggle |

### Slider

A range slider with label and value display.

```tsx
import { Slider } from '@beak-gaming/ui';

<Slider
  value={speed}
  onChange={setSpeed}
  min={5}
  max={30}
  step={1}
  label="Call Interval"
  unit="s"
/>

// Without unit
<Slider
  value={volume}
  onChange={setVolume}
  min={0}
  max={100}
  label="Volume"
/>

// Disabled
<Slider
  value={10}
  onChange={() => {}}
  min={0}
  max={100}
  label="Locked Setting"
  disabled
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | required | Current value |
| `onChange` | `(value: number) => void` | required | Change handler |
| `min` | `number` | required | Minimum value |
| `max` | `number` | required | Maximum value |
| `step` | `number` | `1` | Step increment |
| `label` | `string` | required | Accessible label |
| `unit` | `string` | `''` | Unit suffix (e.g., "s", "%") |
| `disabled` | `boolean` | `false` | Disables the slider |

## Design Principles

### Senior-Friendly Design

All components follow accessibility best practices for older adults:

1. **Large Touch Targets**: Minimum 44x44px (WCAG 2.1 AAA)
2. **High Contrast**: All text meets WCAG AAA contrast ratios
3. **Clear Focus States**: Visible 4px focus rings
4. **Large Text**: Minimum 16px for UI, 18px for labels

### CSS Variables

Components use CSS variables from `@beak-gaming/theme`:

```css
/* Primary button uses */
background: var(--primary);
color: var(--primary-foreground);

/* Focus ring uses */
ring-color: var(--primary) / 50%;

/* Toggle uses */
background: var(--accent);  /* when checked */
background: var(--muted);   /* when unchecked */
```

### Tailwind CSS

Components are styled with Tailwind CSS 4. Ensure your app has the theme CSS variables configured.

## Testing

The package includes tests using Vitest and Testing Library:

```bash
# From packages/ui
pnpm test        # Watch mode
pnpm test:run    # Single run
pnpm test:coverage
```

## Type Exports

```typescript
export { Button, type ButtonProps } from './button';
export { Toggle, type ToggleProps } from './toggle';
export { Slider, type SliderProps } from './slider';
```
