'use client';

import {
  useState,
  useRef,
  useEffect,
  useId,
  KeyboardEvent,
  useCallback,
} from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  error?: string;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  error,
}: SelectProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const errorId = `${id}-error`;
  const inputId = `${id}-input`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const hasError = !!error;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      // scrollIntoView may not be available in test environments (JSDOM)
      if (highlightedElement?.scrollIntoView) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const openDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      setHighlightedIndex(
        value ? filteredOptions.findIndex((opt) => opt.value === value) : 0
      );
      if (searchable) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }, [disabled, value, filteredOptions, searchable]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    buttonRef.current?.focus();
  }, []);

  const selectOption = useCallback(
    (option: SelectOption) => {
      if (!option.disabled) {
        onChange(option.value);
        closeDropdown();
      }
    },
    [onChange, closeDropdown]
  );

  const handleKeyDown = (event: KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          closeDropdown();
        }
        break;
      case 'Tab':
        if (isOpen) {
          closeDropdown();
        }
        break;
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          event.preventDefault();
          setHighlightedIndex(filteredOptions.length - 1);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {label && (
        <label
          id={`${id}-label`}
          htmlFor={searchable && isOpen ? inputId : undefined}
          className={`
            text-lg font-medium
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          disabled={disabled}
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          onKeyDown={handleKeyDown}
          className={`
            w-full min-h-[52px] px-4 py-3
            flex items-center justify-between gap-2
            text-lg text-left
            rounded-lg border-2 bg-background
            transition-colors duration-150
            focus:outline-none focus:ring-4
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              hasError
                ? 'border-error focus:border-error focus:ring-error/50'
                : 'border-border focus:border-primary focus:ring-primary/50'
            }
            ${isOpen ? 'border-primary ring-4 ring-primary/50' : ''}
          `}
        >
          <span
            className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}
          >
            {selectedOption?.label || placeholder}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            className="
              absolute z-50 w-full mt-1
              bg-background border-2 border-border rounded-lg
              shadow-lg max-h-[300px] overflow-hidden
            "
          >
            {searchable && (
              <div className="p-2 border-b border-border">
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="
                    w-full min-h-[44px] px-3 py-2
                    text-lg rounded-md
                    border-2 border-border bg-background
                    focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50
                  "
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                />
              </div>
            )}

            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={label ? `${id}-label` : undefined}
              className="max-h-[240px] overflow-auto py-1"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-lg text-muted-foreground">
                  No options found
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      min-h-[44px] px-4 py-3
                      text-lg cursor-pointer
                      flex items-center
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${option.value === value ? 'bg-primary/10 text-primary font-medium' : ''}
                      ${
                        index === highlightedIndex && !option.disabled
                          ? 'bg-primary/20'
                          : ''
                      }
                    `}
                  >
                    {option.label}
                    {option.value === value && (
                      <svg
                        className="w-5 h-5 ml-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {hasError && (
        <p id={errorId} role="alert" className="text-error text-base font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
