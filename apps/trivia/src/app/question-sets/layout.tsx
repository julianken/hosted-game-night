import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QUESTION_SETS_ENABLED } from '@/lib/feature-flags';

export default async function QuestionSetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!QUESTION_SETS_ENABLED) {
    redirect('/');
  }

  // E2E mode bypasses auth
  if (process.env.E2E_TESTING === 'true') {
    return <>{children}</>;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('jb_access_token');
  const isAuthenticated = !!accessToken?.value;

  if (!isAuthenticated) {
    redirect('/');
  }

  return <>{children}</>;
}
