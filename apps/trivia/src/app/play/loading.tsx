import { Skeleton, SkeletonButton, SkeletonCard } from '@beak-gaming/ui';

/**
 * Loading skeleton for the Trivia presenter page.
 * Matches the layout of PlayPage for smooth transitions.
 */
export default function TriviaPlayLoading() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton width={180} height={40} className="mb-2" />
            <Skeleton width={140} height={24} />
          </div>

          {/* Display controls skeleton */}
          <div className="flex items-center gap-4">
            {/* Status badge */}
            <Skeleton width={80} height={28} className="rounded-full" />

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" width={12} height={12} />
              <Skeleton width={80} height={20} className="hidden sm:block" />
            </div>

            {/* Icon buttons */}
            <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
            <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
            <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />

            {/* Open Display button */}
            <SkeletonButton size="md" width={130} />
          </div>
        </header>

        {/* Main content grid - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: Question List */}
          <section className="lg:col-span-3">
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Skeleton width={120} height={24} />
                <Skeleton width={80} height={20} />
              </div>

              {/* Question list items */}
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circular" width={24} height={24} />
                      <Skeleton width="80%" height={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Center column: Question Display */}
          <section className="lg:col-span-5">
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <Skeleton width={160} height={24} />
                <div className="flex gap-2">
                  <SkeletonButton size="sm" width={100} />
                  <SkeletonButton size="sm" width={100} />
                </div>
              </div>

              {/* Question content */}
              <div className="space-y-6 py-8">
                <Skeleton width="100%" height={32} />
                <Skeleton width="90%" height={32} />

                {/* Answer options */}
                <div className="space-y-3 mt-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton width="70%" height={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Right column: Team Management & Scores */}
          <section className="lg:col-span-4 space-y-6">
            {/* Team Manager */}
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Skeleton width={100} height={24} />
                <SkeletonButton size="sm" width={100} />
              </div>

              {/* Team list */}
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton width={100} height={18} />
                    </div>
                    <Skeleton width={40} height={24} />
                  </div>
                ))}
              </div>
            </div>

            {/* Team Score Input */}
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
              <Skeleton width={140} height={24} className="mb-4" />

              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2"
                  >
                    <Skeleton width={100} height={18} />
                    <div className="flex items-center gap-2">
                      <SkeletonButton size="sm" width={44} />
                      <Skeleton width={48} height={32} />
                      <SkeletonButton size="sm" width={44} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Keyboard shortcuts reference */}
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Skeleton width={180} height={24} />
                <Skeleton width={60} height={18} />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton width={120} height={18} />
                    <Skeleton width={48} height={28} />
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Settings */}
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
              <Skeleton width={80} height={24} className="mb-4" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton width={100} height={20} />
                  <Skeleton width={80} height={36} />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton width={100} height={20} />
                  <Skeleton width={80} height={36} />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Setup bar at bottom */}
        <div className="mt-6 bg-background border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton width={140} height={24} className="mb-1" />
              <Skeleton width={200} height={18} />
            </div>
            <SkeletonButton size="lg" width={140} />
          </div>
        </div>
      </div>
    </main>
  );
}
