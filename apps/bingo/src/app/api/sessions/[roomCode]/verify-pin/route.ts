import { createSessionRoutes } from '@beak-gaming/database/api';
import { createClient } from '@beak-gaming/database/server';

const routes = createSessionRoutes({
  gameType: 'bingo',
  createClient,
});

export const POST = routes.verifyPin;
