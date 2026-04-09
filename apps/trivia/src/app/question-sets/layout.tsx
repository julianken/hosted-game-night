import { redirect } from 'next/navigation';
import { QUESTION_SETS_ENABLED } from '@/lib/feature-flags';

export default function QuestionSetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!QUESTION_SETS_ENABLED) {
    redirect('/');
  }

  return <>{children}</>;
}
