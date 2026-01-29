import Link from 'next/link';
import { cookies } from 'next/headers';
import { StatsDisplay } from '@/components/stats';
import { LoginButton } from '@/components/auth/LoginButton';

export default async function Home() {
  // Server-side auth check via cookie (BEA-421)
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token');
  const isAuthenticated = !!accessToken?.value;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-8">Trivia Night</h1>
      <p className="text-xl text-muted-foreground mb-12 text-center max-w-2xl">
        Presenter-controlled trivia system for retirement communities.
        Easy to run, fun to play.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        {isAuthenticated ? (
          <Link
            href="/play"
            className="inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-xl font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Play
          </Link>
        ) : (
          <LoginButton />
        )}
      </div>

      {/* Statistics Section */}
      <StatsDisplay />
    </main>
  );
}
