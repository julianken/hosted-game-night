import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Template } from '../../../api/templates/route';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Fetch a single template by ID and game type
 */
async function fetchTemplate(
  id: string,
  game: 'bingo' | 'trivia'
): Promise<Template | null> {
  try {
    // Determine which game API to fetch from
    const baseUrl =
      game === 'bingo' ? 'http://localhost:3000' : 'http://localhost:3001';

    const response = await fetch(`${baseUrl}/api/templates/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { ...data.template, game };
  } catch (error) {
    console.error(`Failed to fetch ${game} template:`, error);
    return null;
  }
}

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

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Render Bingo template details
 */
function BingoTemplateDetails({ template }: { template: Template }) {
  if (template.game !== 'bingo') return null;

  // Convert pattern ID to human-readable format
  const patternName = template.pattern_id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Pattern */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pattern</h3>
        <p className="text-base text-gray-700">{patternName}</p>
      </div>

      {/* Voice Pack */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Pack</h3>
        <p className="text-base text-gray-700">{template.voice_pack}</p>
      </div>

      {/* Auto-Call Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Auto-Call Settings
        </h3>
        <div className="space-y-2">
          <p className="text-base text-gray-700">
            <span className="font-medium">Enabled:</span>{' '}
            {template.auto_call_enabled ? 'Yes' : 'No'}
          </p>
          {template.auto_call_enabled && (
            <p className="text-base text-gray-700">
              <span className="font-medium">Interval:</span>{' '}
              {template.auto_call_interval} seconds
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Render Trivia template details
 */
function TriviaTemplateDetails({ template }: { template: Template }) {
  if (template.game !== 'trivia') return null;

  const questionCount = Array.isArray(template.questions)
    ? template.questions.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Rounds */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Game Settings
        </h3>
        <div className="space-y-2">
          <p className="text-base text-gray-700">
            <span className="font-medium">Rounds:</span>{' '}
            {template.rounds_count}
          </p>
          <p className="text-base text-gray-700">
            <span className="font-medium">Questions per round:</span>{' '}
            {template.questions_per_round}
          </p>
          <p className="text-base text-gray-700">
            <span className="font-medium">Timer duration:</span>{' '}
            {template.timer_duration} seconds
          </p>
        </div>
      </div>

      {/* Questions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Questions ({questionCount})
        </h3>
        {questionCount > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto border-2 border-gray-200 rounded-lg p-4">
            {(template.questions as Array<{
              question: string;
              answer: string;
            }>).map((q, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-base font-medium text-muted-foreground mb-1">
                  Question {index + 1}
                </p>
                <p className="text-base text-gray-900 mb-2">{q.question}</p>
                <p className="text-base text-gray-700">
                  <span className="font-medium">Answer:</span> {q.answer}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base text-gray-600">No questions defined</p>
        )}
      </div>
    </div>
  );
}

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ game?: string }>;
}) {
  // Await the params and searchParams as required by Next.js 15
  const { id } = await params;
  const { game } = await searchParams;

  // Validate game parameter
  if (!game || (game !== 'bingo' && game !== 'trivia')) {
    notFound();
    return null; // TypeScript safety (notFound throws but TypeScript doesn't know that)
  }

  // Fetch the template
  const template = await fetchTemplate(id, game);

  if (!template) {
    notFound();
    return null; // TypeScript safety (notFound throws but TypeScript doesn't know that)
  }

  const gameBadgeColors =
    template.game === 'bingo'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/dashboard/templates"
        className="inline-flex items-center gap-2 text-base text-blue-600 hover:text-blue-800 mb-6 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Templates
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {template.name}
            </h1>
            {template.is_default && (
              <span className="inline-block text-base font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                ★ Default Template
              </span>
            )}
          </div>
          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-base font-medium border ${gameBadgeColors}`}
          >
            {template.game === 'bingo' ? 'Bingo' : 'Trivia'}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex gap-6 text-base text-muted-foreground">
          <div>
            <span className="font-medium">Created:</span>{' '}
            {formatRelativeTime(template.created_at)}
          </div>
          <div>
            <span className="font-medium">Updated:</span>{' '}
            {formatRelativeTime(template.updated_at)}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Template Details
        </h2>
        {template.game === 'bingo' ? (
          <BingoTemplateDetails template={template} />
        ) : (
          <TriviaTemplateDetails template={template} />
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <Link
          href={`${
            template.game === 'bingo'
              ? 'http://localhost:3000'
              : 'http://localhost:3001'
          }/play?template=${template.id}`}
          className="flex-1 min-h-[44px] px-6 py-3 text-base font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Load in {template.game === 'bingo' ? 'Bingo' : 'Trivia'}
        </Link>
        <Link
          href="/dashboard/templates"
          className="min-h-[44px] px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 border-2 border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to List
        </Link>
      </div>
    </div>
  );
}
