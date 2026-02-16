import { createSessionRoutes } from '@beak-gaming/database/api';
import { createClient } from '@beak-gaming/database/server';
import { getApiUser } from '@beak-gaming/auth';

const routes = createSessionRoutes({
  gameType: 'trivia',
  createClient,
  authenticateRequest: getApiUser,
});

export const POST = routes.POST;
