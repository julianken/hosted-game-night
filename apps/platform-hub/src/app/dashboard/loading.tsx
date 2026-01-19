import { Skeleton, SkeletonButton, SkeletonCard } from '@beak-gaming/ui';

/**
 * Loading skeleton for the Dashboard page.
 * Matches the layout of DashboardPage for smooth transitions.
 */
export default function DashboardLoading() {
  return (
    <main className="flex-1 py-8 md:py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
        {/* Welcome Header skeleton */}
        <section className="p-6 md:p-8 bg-primary/5 rounded-2xl border border-primary/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <Skeleton
              variant="circular"
              width={80}
              height={80}
              className="flex-shrink-0"
            />
            <div className="flex-1 space-y-3">
              {/* Greeting */}
              <Skeleton width={280} height={36} />
              {/* Email */}
              <Skeleton width={200} height={20} />
            </div>
            {/* Sign out button */}
            <SkeletonButton size="md" width={120} />
          </div>
        </section>

        {/* Quick Play Section skeleton */}
        <section>
          <Skeleton width={140} height={32} className="mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Bingo Game Card skeleton */}
            <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton
                  variant="rectangular"
                  width={64}
                  height={64}
                  className="rounded-xl flex-shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <Skeleton width={140} height={28} />
                  <div className="space-y-1">
                    <Skeleton width="100%" height={18} />
                    <Skeleton width="80%" height={18} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="space-y-1">
                  <Skeleton width={100} height={14} />
                  <Skeleton width={80} height={14} />
                </div>
                <SkeletonButton size="md" width={100} />
              </div>
            </div>

            {/* Trivia Game Card skeleton */}
            <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton
                  variant="rectangular"
                  width={64}
                  height={64}
                  className="rounded-xl flex-shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <Skeleton width={140} height={28} />
                  <div className="space-y-1">
                    <Skeleton width="100%" height={18} />
                    <Skeleton width="80%" height={18} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="space-y-1">
                  <Skeleton width={100} height={14} />
                  <Skeleton width={80} height={14} />
                </div>
                <SkeletonButton size="md" width={100} />
              </div>
            </div>
          </div>
        </section>

        {/* Two Column Layout for Sessions and Preferences */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          {/* Recent Sessions skeleton */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <Skeleton width={160} height={28} />
              <Skeleton width={80} height={20} />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton
                      variant="rectangular"
                      width={44}
                      height={44}
                      className="rounded-lg"
                    />
                    <div className="space-y-1">
                      <Skeleton width={120} height={18} />
                      <Skeleton width={160} height={14} />
                    </div>
                  </div>
                  <Skeleton width={60} height={18} />
                </div>
              ))}
            </div>
          </section>

          {/* User Preferences skeleton */}
          <section className="bg-background border border-border rounded-2xl p-6 shadow-sm">
            <Skeleton width={140} height={28} className="mb-6" />
            <div className="space-y-6">
              {/* Theme preference */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton width={100} height={18} />
                  <Skeleton width={200} height={14} />
                </div>
                <Skeleton width={140} height={44} className="rounded-lg" />
              </div>
              {/* Audio preference */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton width={100} height={18} />
                  <Skeleton width={200} height={14} />
                </div>
                <Skeleton width={48} height={28} className="rounded-full" />
              </div>
              {/* Display preference */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton width={140} height={18} />
                  <Skeleton width={200} height={14} />
                </div>
                <Skeleton width={48} height={28} className="rounded-full" />
              </div>
              {/* Volume preference */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton width={80} height={18} />
                  <Skeleton width={40} height={18} />
                </div>
                <Skeleton width="100%" height={8} className="rounded-full" />
              </div>
            </div>
          </section>
        </div>

        {/* Help Section skeleton */}
        <section className="p-6 md:p-8 bg-primary/5 rounded-2xl border border-primary/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Skeleton
              variant="rectangular"
              width={64}
              height={64}
              className="rounded-2xl flex-shrink-0"
            />
            <div className="flex-1 space-y-4">
              <Skeleton width={320} height={32} />
              <div className="space-y-2">
                <Skeleton width="100%" height={20} />
                <Skeleton width="60%" height={20} />
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <SkeletonButton size="md" width={140} />
                <SkeletonButton size="md" width={140} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
