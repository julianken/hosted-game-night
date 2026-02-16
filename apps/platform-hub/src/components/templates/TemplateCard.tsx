'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Template } from '../../app/api/templates/route';

type TemplateCardProps = {
  template: Template;
  onDelete: (id: string, game: 'bingo' | 'trivia') => Promise<void>;
};

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}

/**
 * Get game-specific stats to display
 */
function getGameStats(template: Template): string {
  if (template.game === 'bingo') {
    // Convert pattern ID to human-readable format
    const patternName = template.pattern_id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `Pattern: ${patternName}`;
  } else {
    const questionCount = Array.isArray(template.questions) ? template.questions.length : 0;
    return `${questionCount} question${questionCount === 1 ? '' : 's'}`;
  }
}

export function TemplateCard({ template, onDelete }: TemplateCardProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(template.id, template.game);
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const gameBadgeColors =
    template.game === 'bingo'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200';

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
      {/* Header: Name + Game Badge */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-gray-900 truncate">
            {template.name}
          </h3>
          {template.is_default && (
            <span className="inline-block mt-1 text-base font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
              ★ Default
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-base font-medium border ${gameBadgeColors}`}
        >
          {template.game === 'bingo' ? 'Bingo' : 'Trivia'}
        </span>
      </div>

      {/* Stats */}
      <p className="text-base text-gray-600 mb-4">{getGameStats(template)}</p>

      {/* Last Updated */}
      <p className="text-base text-muted-foreground mb-6">
        Updated {formatRelativeTime(template.updated_at)}
      </p>

      {/* Actions */}
      {!showConfirm ? (
        <div className="flex gap-3">
          <button
            onClick={() =>
              router.push(`/dashboard/templates/${template.id}?game=${template.game}`)
            }
            className="flex-1 min-h-[44px] px-4 py-2 text-base font-medium text-blue-700 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            View Details
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-1 min-h-[44px] px-4 py-2 text-base font-medium text-red-700 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-base text-gray-700 font-medium">
            Delete this template?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 min-h-[44px] px-4 py-2 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="flex-1 min-h-[44px] px-4 py-2 text-base font-medium text-gray-700 bg-gray-100 border-2 border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
