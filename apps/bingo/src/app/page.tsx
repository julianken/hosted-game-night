import Link from 'next/link';
import { cookies } from 'next/headers';
import { StatsDisplay } from '@/components/stats';
import { LoginButton } from '@/components/auth/LoginButton';

export default async function Home() {
  // Check authentication state via cookie
  const cookieStore = await cookies();
  const isSignedIn = !!cookieStore.get('beak_access_token')?.value;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-ball-b/5 via-transparent to-ball-o/5" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 lg:py-32">
          <div className="text-center space-y-8">
            {/* Logo / Title */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground">
                Beak Bingo
              </h1>
              <p className="text-2xl md:text-3xl text-muted-foreground max-w-2xl mx-auto">
                Modern bingo for retirement communities
              </p>
            </div>

            {/* Description */}
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A cloud-based, easy-to-use bingo system designed for seniors.
              Large fonts, high contrast, and audio announcements make every game accessible and fun.
            </p>

            {/* CTA Buttons - Conditional based on auth state */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {isSignedIn ? (
                // Signed In: Show only "Play" button
                <Link
                  href="/play"
                  className="
                    inline-flex items-center justify-center
                    min-h-[64px] px-12 py-4
                    text-2xl font-bold
                    bg-primary text-primary-foreground
                    rounded-xl shadow-lg
                    hover:bg-primary/90 transition-colors
                    focus:outline-none focus:ring-4 focus:ring-primary/50
                  "
                >
                  Play
                </Link>
              ) : (
                // Not Signed In: Show only "Sign in with Beak Gaming" button
                <LoginButton />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/10 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Designed for Seniors
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
              <div className="w-16 h-16 rounded-full bg-ball-b/20 flex items-center justify-center mb-4">
                <span className="text-3xl">75</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">75-Ball Bingo</h3>
              <p className="text-lg text-muted-foreground">
                Classic American bingo format with B-I-N-G-O columns and 29 winning patterns.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
              <div className="w-16 h-16 rounded-full bg-ball-i/20 flex items-center justify-center mb-4">
                <span className="text-3xl">Aa</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Large Text</h3>
              <p className="text-lg text-muted-foreground">
                Minimum 18px fonts with high contrast colors, readable from across the room.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
              <div className="w-16 h-16 rounded-full bg-ball-g/20 flex items-center justify-center mb-4">
                <span className="text-3xl">Dual</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Dual Screen</h3>
              <p className="text-lg text-muted-foreground">
                Host controls on one screen, audience display on the projector. Perfect for activity rooms.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
              <div className="w-16 h-16 rounded-full bg-ball-o/20 flex items-center justify-center mb-4">
                <span className="text-3xl">Auto</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Auto-Call</h3>
              <p className="text-lg text-muted-foreground">
                Let the computer call balls automatically at your chosen speed (5-30 seconds).
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                <span className="text-3xl">29</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">29 Patterns</h3>
              <p className="text-lg text-muted-foreground">
                Lines, corners, frames, shapes, letters, and blackout. Something for every game night.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-3xl">KB</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Keyboard Shortcuts</h3>
              <p className="text-lg text-muted-foreground">
                Space to roll, P to pause, U to undo. Quick controls for the game host.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>

          <ol className="space-y-8">
            <li className="flex gap-6 items-start">
              <span className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                1
              </span>
              <div>
                <h3 className="text-2xl font-semibold mb-1">Open the Presenter View</h3>
                <p className="text-lg text-muted-foreground">
                  Click &quot;Play Now&quot; on your computer to access the game controls.
                </p>
              </div>
            </li>

            <li className="flex gap-6 items-start">
              <span className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                2
              </span>
              <div>
                <h3 className="text-2xl font-semibold mb-1">Open the Audience Display</h3>
                <p className="text-lg text-muted-foreground">
                  Click &quot;Open Display&quot; and move the window to your projector or TV.
                </p>
              </div>
            </li>

            <li className="flex gap-6 items-start">
              <span className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                3
              </span>
              <div>
                <h3 className="text-2xl font-semibold mb-1">Select a Pattern & Start</h3>
                <p className="text-lg text-muted-foreground">
                  Choose a winning pattern, then press Start to begin calling balls.
                </p>
              </div>
            </li>

            <li className="flex gap-6 items-start">
              <span className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                4
              </span>
              <div>
                <h3 className="text-2xl font-semibold mb-1">Call &quot;Bingo!&quot;</h3>
                <p className="text-lg text-muted-foreground">
                  When someone wins, verify their card matches the pattern. Reset to play again!
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Statistics Section */}
      <StatsDisplay />

      {/* Footer */}
      <footer className="bg-muted/10 border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-lg text-muted-foreground">
            Part of the <span className="font-semibold">Beak Gaming Platform</span> for retirement communities
          </p>
        </div>
      </footer>
    </main>
  );
}
