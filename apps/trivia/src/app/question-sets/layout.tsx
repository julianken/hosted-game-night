import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function QuestionSetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token');
  const isAuthenticated = !!accessToken?.value;

  if (!isAuthenticated) {
    redirect('/');
  }

  return <>{children}</>;
}
