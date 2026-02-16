'use client';

import type { QuestionCategory } from '@/types';
import {
  DEFAULT_CATEGORIES,
  getCategoryBadgeClasses,
  getCategoryFilterActiveClasses,
  getCategoryStatistics,
  type CategoryConfig,
} from '@/lib/categories';
import type { Question } from '@/types';

interface CategoryFilterProps {
  /** Currently selected category IDs for filtering */
  selectedCategories: QuestionCategory[];
  /** Callback when category selection changes */
  onCategoryChange: (categories: QuestionCategory[]) => void;
  /** Questions to calculate statistics from */
  questions: Question[];
  /** Whether to show question counts for each category */
  showCounts?: boolean;
  /** Whether to allow multi-select (default: true) */
  multiSelect?: boolean;
  /** Optional className for the container */
  className?: string;
}

/**
 * CategoryFilter component for filtering trivia questions by category.
 * Displays category buttons with optional question counts and statistics.
 */
export function CategoryFilter({
  selectedCategories,
  onCategoryChange,
  questions,
  showCounts = true,
  multiSelect = true,
  className = '',
}: CategoryFilterProps) {
  const statistics = getCategoryStatistics(questions);

  // Get count for a specific category
  const getCount = (categoryId: QuestionCategory): number => {
    const stat = statistics.find((s) => s.categoryId === categoryId);
    return stat?.questionCount ?? 0;
  };

  // Check if a category is selected
  const isSelected = (categoryId: QuestionCategory): boolean => {
    return selectedCategories.includes(categoryId);
  };

  // Handle category toggle
  const handleCategoryClick = (categoryId: QuestionCategory) => {
    if (multiSelect) {
      // Toggle selection
      if (isSelected(categoryId)) {
        onCategoryChange(selectedCategories.filter((c) => c !== categoryId));
      } else {
        onCategoryChange([...selectedCategories, categoryId]);
      }
    } else {
      // Single select: toggle off or select
      if (isSelected(categoryId)) {
        onCategoryChange([]);
      } else {
        onCategoryChange([categoryId]);
      }
    }
  };

  // Clear all filters
  const handleClearAll = () => {
    onCategoryChange([]);
  };

  // Select all categories
  const handleSelectAll = () => {
    onCategoryChange(DEFAULT_CATEGORIES.map((c) => c.id));
  };

  const hasSelection = selectedCategories.length > 0;

  return (
    <div className={`space-y-3 ${className}`} role="region" aria-label="Filter questions by category">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-muted-foreground">
          Filter by Category
        </h3>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <button
              onClick={handleClearAll}
              className="text-base text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Clear all category filters"
            >
              Clear
            </button>
          )}
          {multiSelect && !hasSelection && (
            <button
              onClick={handleSelectAll}
              className="text-base text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Select all categories"
            >
              Select All
            </button>
          )}
        </div>
      </div>

      {/* Category buttons */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Category filter buttons"
      >
        {DEFAULT_CATEGORIES.map((category: CategoryConfig) => {
          const count = getCount(category.id);
          const selected = isSelected(category.id);
          const hasQuestions = count > 0;

          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              disabled={!hasQuestions && !selected}
              aria-pressed={selected}
              aria-label={`${category.name}${showCounts ? `, ${count} questions` : ''}${selected ? ', selected' : ''}`}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-base font-medium border transition-all duration-200
                min-h-[44px] min-w-[44px]
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:opacity-40 disabled:cursor-not-allowed
                ${
                  selected
                    ? getCategoryFilterActiveClasses(category.id)
                    : hasQuestions
                      ? `${getCategoryBadgeClasses(category.id)} hover:opacity-80 cursor-pointer`
                      : getCategoryBadgeClasses(category.id)
                }
              `}
            >
              <span>{category.name}</span>
              {showCounts && (
                <span
                  className={`
                    text-base px-1.5 py-0.5 rounded-full
                    ${selected ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {hasSelection && (
        <p className="text-base text-muted-foreground" aria-live="polite">
          Showing {selectedCategories.length === 1 ? '1 category' : `${selectedCategories.length} categories`}
        </p>
      )}
    </div>
  );
}

/**
 * Compact version of CategoryFilter for use in sidebars or smaller spaces.
 */
export function CategoryFilterCompact({
  selectedCategories,
  onCategoryChange,
  questions,
  className = '',
}: Omit<CategoryFilterProps, 'showCounts' | 'multiSelect'>) {
  const statistics = getCategoryStatistics(questions);

  const isSelected = (categoryId: QuestionCategory): boolean => {
    return selectedCategories.includes(categoryId);
  };

  const handleCategoryClick = (categoryId: QuestionCategory) => {
    if (isSelected(categoryId)) {
      onCategoryChange(selectedCategories.filter((c) => c !== categoryId));
    } else {
      onCategoryChange([...selectedCategories, categoryId]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`} role="group" aria-label="Category filters">
      {DEFAULT_CATEGORIES.map((category) => {
        const stat = statistics.find((s) => s.categoryId === category.id);
        const count = stat?.questionCount ?? 0;
        const selected = isSelected(category.id);

        if (count === 0) return null;

        return (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            aria-pressed={selected}
            aria-label={`${category.name}, ${count} questions${selected ? ', selected' : ''}`}
            className={`
              px-2 py-0.5 rounded text-base font-medium border transition-colors
              min-h-[44px] min-w-[44px] inline-flex items-center justify-center
              ${
                selected
                  ? getCategoryFilterActiveClasses(category.id)
                  : getCategoryBadgeClasses(category.id)
              }
            `}
          >
            {category.name} ({count})
          </button>
        );
      })}
    </div>
  );
}
