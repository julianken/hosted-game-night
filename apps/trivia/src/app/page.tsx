import Link from 'next/link';
import { StatsDisplay } from '@/components/stats';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-8">Trivia</h1>
      <p className="text-xl text-muted-foreground mb-12 text-center max-w-2xl">
        Presenter-controlled trivia system for groups and communities.
        Easy to run, fun to play.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/play"
          className="inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-xl font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Play
        </Link>
      </div>

      {/* Statistics Section */}
      <StatsDisplay />
    </main>
  );
}
