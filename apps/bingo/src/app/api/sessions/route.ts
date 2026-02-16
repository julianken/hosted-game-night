import { createSessionRoutes } from '@beak-gaming/database/api';
import { createClient } from '@beak-gaming/database/server';
import { getApiUser } from '@beak-gaming/auth';

const routes = createSessionRoutes({
  gameType: 'bingo',
  createClient,
  authenticateRequest: getApiUser,
});

export const POST = routes.POST;
