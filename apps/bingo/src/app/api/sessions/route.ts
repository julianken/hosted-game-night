import { createSessionRoutes } from '@joolie-boolie/database/api';
import { createClient } from '@joolie-boolie/database/server';
import { getApiUser } from '@joolie-boolie/auth';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';
import { NextRequest } from 'next/server';

const logger = createLogger({ service: 'bingo-sessions', route: '/api/sessions' });

const routes = createSessionRoutes({
  gameType: 'bingo',
  createClient,
  authenticateRequest: getApiUser,
});

export const POST = async (request: NextRequest) => {
  logger.info('Session create requested', { event: 'session.create.start', gameType: 'bingo' });

  const response = await routes.POST(request);

  if (response.status === 200) {
    logger.info('Session created successfully', { event: 'session.create.success', gameType: 'bingo' });
  } else {
    logger.warn('Session creation failed', { event: 'session.create.failure', gameType: 'bingo', statusCode: response.status });
  }

  return response;
};
