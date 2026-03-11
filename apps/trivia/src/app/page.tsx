import Link from 'next/link';
import { cookies } from 'next/headers';
import { StatsDisplay } from '@/components/stats';
import { LoginButton } from '@joolie-boolie/ui';
import { QUESTION_SETS_ENABLED } from '@/lib/feature-flags';

export default async function Home() {
  // Server-side auth check via cross-app SSO cookie
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('jb_access_token');
  const isAuthenticated = !!accessToken?.value;

  // Get return path if set by middleware (when unauthenticated user tried to access protected route)
  const returnTo = cookieStore.get('jb_return_to')?.value;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-8">Trivia</h1>
      <p className="text-xl text-muted-foreground mb-12 text-center max-w-2xl">
        Presenter-controlled trivia system for groups and communities.
        Easy to run, fun to play.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        {isAuthenticated ? (
          <>
            <Link
              href="/play"
              className="inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-xl font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Play
            </Link>
            {QUESTION_SETS_ENABLED && (
              <Link
                href="/question-sets"
                className="inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-xl font-semibold rounded-lg border-2 border-primary text-primary hover:bg-primary/10 transition-colors"
              >
                Question Sets
              </Link>
            )}
          </>
        ) : (
          <LoginButton returnTo={returnTo} />
        )}
      </div>

      {/* Statistics Section */}
      <StatsDisplay />
    </main>
  );
}
