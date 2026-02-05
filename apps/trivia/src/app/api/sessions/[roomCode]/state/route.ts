import { createSessionRoutes } from '@beak-gaming/database/api';
import { createClient } from '@beak-gaming/database/server';

const routes = createSessionRoutes({
  gameType: 'trivia',
  createClient,
});

export const PATCH = routes.updateState;
