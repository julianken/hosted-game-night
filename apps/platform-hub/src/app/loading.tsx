import { Skeleton, SkeletonCard, SkeletonButton } from '@beak-gaming/ui';

/**
 * Loading skeleton for the Platform Hub home page.
 * Matches the layout of HomePage for smooth transitions.
 */
export default function HomeLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section skeleton */}
        <section className="py-16 md:py-24 px-8 text-center bg-gradient-to-b from-primary/5 to-transparent">
          <div className="max-w-4xl mx-auto">
            {/* Platform Logo */}
            <Skeleton
              variant="rectangular"
              width={96}
              height={96}
              className="mx-auto mb-8 rounded-3xl"
            />

            {/* Title */}
            <Skeleton
              width={400}
              height={56}
              className="mx-auto mb-6"
            />

            {/* Subtitle */}
            <div className="max-w-2xl mx-auto space-y-3">
              <Skeleton width="80%" height={28} className="mx-auto" />
              <Skeleton width="60%" height={28} className="mx-auto" />
            </div>
          </div>
        </section>

        {/* Game Selector Section skeleton */}
        <section className="py-12 md:py-16 px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section title */}
            <Skeleton width={280} height={40} className="mx-auto mb-4" />
            <Skeleton width={400} height={24} className="mx-auto mb-12" />

            {/* Game Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
              {/* Bingo card skeleton */}
              <div className="bg-background border border-border rounded-2xl p-8 shadow-sm">
                <div className="flex items-start gap-6">
                  <Skeleton
                    variant="rectangular"
                    width={80}
                    height={80}
                    className="rounded-2xl flex-shrink-0"
                  />
                  <div className="flex-1 space-y-4">
                    <Skeleton width={140} height={32} />
                    <div className="space-y-2">
                      <Skeleton width="100%" height={20} />
                      <Skeleton width="100%" height={20} />
                      <Skeleton width="80%" height={20} />
                    </div>
                    <SkeletonButton size="lg" width={140} />
                  </div>
                </div>
              </div>

              {/* Trivia card skeleton */}
              <div className="bg-background border border-border rounded-2xl p-8 shadow-sm">
                <div className="flex items-start gap-6">
                  <Skeleton
                    variant="rectangular"
                    width={80}
                    height={80}
                    className="rounded-2xl flex-shrink-0"
                  />
                  <div className="flex-1 space-y-4">
                    <Skeleton width={140} height={32} />
                    <div className="space-y-2">
                      <Skeleton width="100%" height={20} />
                      <Skeleton width="100%" height={20} />
                      <Skeleton width="80%" height={20} />
                    </div>
                    <SkeletonButton size="lg" width={140} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section skeleton */}
        <section className="py-12 md:py-16 px-8 bg-muted/5">
          <div className="max-w-6xl mx-auto">
            {/* Section title */}
            <Skeleton width={240} height={40} className="mx-auto mb-12" />

            {/* Features grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center p-6">
                  {/* Feature icon */}
                  <Skeleton
                    variant="rectangular"
                    width={64}
                    height={64}
                    className="mx-auto mb-4 rounded-2xl"
                  />
                  {/* Feature title */}
                  <Skeleton width={140} height={28} className="mx-auto mb-2" />
                  {/* Feature description */}
                  <div className="space-y-2">
                    <Skeleton width="100%" height={20} className="mx-auto" />
                    <Skeleton width="80%" height={20} className="mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
