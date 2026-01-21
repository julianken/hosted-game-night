import { createSessionRoutes } from '@beak-gaming/database/api';
import { createClient } from '@/lib/supabase/server';

const routes = createSessionRoutes({
  gameType: 'trivia',
  createClient,
});

export const PATCH = routes.updateState;
