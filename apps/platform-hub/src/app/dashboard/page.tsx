import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { resolveDisplayName } from '@/lib/resolve-display-name';
import {
  WelcomeHeader,
  DashboardGameCard,
  RecentSessions,
  RecentTemplates,
  UserPreferences,
} from '@/components/dashboard';
import type { GameSession } from '@/components/dashboard/RecentSessions';
import type { Template } from '@/app/api/templates/route';
import { Badge } from '@joolie-boolie/ui';

// Force dynamic rendering to avoid build-time Supabase initialization
export const dynamic = 'force-dynamic';

// E2E Testing constants (must match login API route)
const E2E_TEST_EMAIL = 'e2e-test@joolie-boolie.test';

/**
 * Fetch recent templates from aggregation API
 * Forwards cookies so the API route can authenticate the request.
 */
async function fetchRecentTemplates(): Promise<Template[]> {
  try {
    // Forward cookies from the incoming request so the API route
    // can read Supabase session cookies (sb-*) or OAuth SSO cookies (jb_*)
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002'}/api/templates?recent=true`,
      {
        cache: 'no-store',
        headers: {
          Cookie: cookieHeader,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch templates:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.templates || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

/**
 * Fetch recent game sessions for a user from the database
 */
async function fetchRecentSessions(userId: string): Promise<GameSession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id, game_type, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent sessions:', error);
    return [];
  }

  // Transform database records to GameSession format
  return (data || []).map((session) => {
    const createdAt = new Date(session.created_at);
    const updatedAt = new Date(session.updated_at);
    const durationMs = updatedAt.getTime() - createdAt.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    return {
      id: session.id,
      gameType: session.game_type as 'bingo' | 'trivia',
      startedAt: session.created_at,
      durationMinutes,
    };
  });
}

/**
 * Fetch user profile data including avatar URL
 * Uses E2E profile store for E2E testing, database for production
 */
async function fetchProfile(
  _userId: string,
  _isE2E: boolean = false
): Promise<{
  emailNotificationsEnabled: boolean;
  gameRemindersEnabled: boolean;
  weeklySummaryEnabled: boolean;
  marketingEmailsEnabled: boolean;
}> {
  // E2E mode: Profile data comes from in-memory store but is not used
  // Production mode: Profile data comes from database but is not used
  // This function is kept for future profile-related features
  return {
    emailNotificationsEnabled: false,
    gameRemindersEnabled: false,
    weeklySummaryEnabled: false,
    marketingEmailsEnabled: false,
  };
}

/**
 * Calculate game statistics from recent sessions
 */
function calculateGameStats(sessions: GameSession[]) {
  const bingoSessions = sessions.filter((s) => s.gameType === 'bingo');
  const triviaSessions = sessions.filter((s) => s.gameType === 'trivia');

  return {
    bingo: {
      lastPlayed:
        bingoSessions.length > 0 ? new Date(bingoSessions[0].startedAt) : null,
      timesPlayed: bingoSessions.length,
    },
    trivia: {
      lastPlayed:
        triviaSessions.length > 0
          ? new Date(triviaSessions[0].startedAt)
          : null,
      timesPlayed: triviaSessions.length,
    },
  };
}

/**
 * Bingo icon - Grid pattern representing bingo card
 */
function BingoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-10 h-10"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="10" y="3" width="5" height="5" rx="1" />
      <rect x="17" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="10" width="5" height="5" rx="1" />
      <circle cx="12.5" cy="12.5" r="3" />
      <rect x="17" y="10" width="5" height="5" rx="1" />
      <rect x="3" y="17" width="5" height="5" rx="1" />
      <rect x="10" y="17" width="5" height="5" rx="1" />
      <rect x="17" y="17" width="5" height="5" rx="1" />
    </svg>
  );
}

/**
 * Trivia icon - Question mark in a bubble
 */
function TriviaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-10 h-10"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
  );
}

/**
 * Generate game cards configuration with real statistics
 */
function getGamesConfig(stats: ReturnType<typeof calculateGameStats>) {
  return [
    {
      id: 'bingo',
      title: 'Bingo',
      description:
        'Classic 75-ball bingo with dual-screen display. Perfect for bingo nights with large, easy-to-read numbers.',
      href: process.env.NEXT_PUBLIC_BINGO_URL
        ? `${process.env.NEXT_PUBLIC_BINGO_URL}/play`
        : 'http://localhost:3000/play',
      icon: <BingoIcon />,
      colorClass: '',
      accentColor: 'var(--game-bingo)',
      lastPlayed: stats.bingo.lastPlayed,
      timesPlayed: stats.bingo.timesPlayed,
    },
    {
      id: 'trivia',
      title: 'Trivia',
      description:
        'Team-based trivia with presenter controls. Great for group entertainment with customizable categories.',
      href: process.env.NEXT_PUBLIC_TRIVIA_URL
        ? `${process.env.NEXT_PUBLIC_TRIVIA_URL}/play`
        : 'http://localhost:3001/play',
      icon: <TriviaIcon />,
      colorClass: '',
      accentColor: 'var(--game-trivia)',
      lastPlayed: stats.trivia.lastPlayed,
      timesPlayed: stats.trivia.timesPlayed,
    },
  ];
}

export const metadata = {
  title: 'Dashboard | Joolie Boolie',
  description:
    'Your Joolie Boolie dashboard - quick access to games, recent sessions, and settings',
};

/**
 * Dashboard Content Component
 * Bento grid layout with compact welcome header and Badge status indicators.
 * Extracted to eliminate duplicate renders of RecentTemplates and other components.
 */
interface DashboardContentProps {
  userName: string;
  userEmail: string;
  games: ReturnType<typeof getGamesConfig>;
  recentTemplates: Template[];
  recentSessions: GameSession[];
  profile: {
    emailNotificationsEnabled: boolean;
    gameRemindersEnabled: boolean;
    weeklySummaryEnabled: boolean;
    marketingEmailsEnabled: boolean;
  };
}

function DashboardContent({
  userName,
  userEmail,
  games,
  recentTemplates,
  recentSessions,
  profile,
}: DashboardContentProps) {
  return (
    <main className="flex-1 py-6 md:py-10 px-4 md:px-8 pb-20 md:pb-10">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

        {/* Compact welcome bar — single row with greeting and status badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <WelcomeHeader userName={userName} userEmail={userEmail} />
        </div>

        {/* Quick Play — bento grid for game cards */}
        <section aria-labelledby="games-heading">
          <div className="flex items-center gap-3 mb-4">
            <h2
              id="games-heading"
              className="text-xl md:text-2xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Quick Play
            </h2>
            <Badge color="success" badgeStyle="dot" size="sm">
              2 games available
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {games.map((game) => (
              <DashboardGameCard
                key={game.id}
                title={game.title}
                description={game.description}
                href={game.href}
                icon={game.icon}
                colorClass={game.colorClass}
                lastPlayed={game.lastPlayed}
                timesPlayed={game.timesPlayed}
              />
            ))}
          </div>
        </section>

        {/* Recent Templates — rendered ONCE */}
        <RecentTemplates templates={recentTemplates} />

        {/* Bottom bento row — Recent Sessions + Preferences */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <RecentSessions sessions={recentSessions} maxSessions={4} />
          <UserPreferences
            preferences={{
              emailNotificationsEnabled: profile.emailNotificationsEnabled,
              gameRemindersEnabled: profile.gameRemindersEnabled,
              weeklySummaryEnabled: profile.weeklySummaryEnabled,
              marketingEmailsEnabled: profile.marketingEmailsEnabled,
            }}
          />
        </div>
      </div>
    </main>
  );
}

export default async function DashboardPage() {
  // Check for E2E auth via custom SSO cookie (set by /api/auth/login in E2E mode)
  // This allows E2E tests to bypass real Supabase auth and avoid rate limits
  const cookieStore = await cookies();
  const e2eToken = cookieStore.get('jb_access_token');
  const e2eUserId = cookieStore.get('jb_user_id');

  // E2E Testing Mode: jb_access_token is set by E2E login API
  // Check for E2E cookie BEFORE Supabase auth to avoid unnecessary API calls
  if (e2eToken && e2eUserId) {
    // E2E user is authenticated - use mock user data
    const recentSessions: GameSession[] = [];
    const gameStats = calculateGameStats(recentSessions);
    const games = getGamesConfig(gameStats);
    const userName = resolveDisplayName(null, E2E_TEST_EMAIL, 'Activity Director');
    const recentTemplates = await fetchRecentTemplates();

    // Fetch profile from E2E store (includes avatar + notification preferences)
    const profile = await fetchProfile(e2eUserId.value, true);

    return (
      <DashboardContent
        userName={userName}
        userEmail={E2E_TEST_EMAIL}
        games={games}
        recentTemplates={recentTemplates}
        recentSessions={recentSessions}
        profile={profile}
      />
    );
  }

  // Normal flow: Check Supabase authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (userError || !user) {
    redirect('/login?redirect=%2Fdashboard');
  }

  // Fetch recent sessions and calculate statistics
  const recentSessions = await fetchRecentSessions(user.id);
  const gameStats = calculateGameStats(recentSessions);
  const games = getGamesConfig(gameStats);
  const recentTemplates = await fetchRecentTemplates();

  // Fetch user profile (including avatar + notification preferences)
  const profile = await fetchProfile(user.id);

  // Extract user name from metadata with robust fallback chain
  const userName = resolveDisplayName(
    user.user_metadata,
    user.email,
    'Activity Director'
  );

  return (
    <DashboardContent
      userName={userName}
      userEmail={user.email || ''}
      games={games}
      recentTemplates={recentTemplates}
      recentSessions={recentSessions}
      profile={profile}
    />
  );
}
