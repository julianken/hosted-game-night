export interface LogContext {
  service: string;
  route?: string;
  traceId?: string;
  event?: string;
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, ctx: LogContext): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
  };
  const line = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export function createLogger(base: LogContext) {
  return {
    debug: (message: string, extra?: Partial<LogContext>) =>
      log('debug', message, { ...base, ...extra }),
    info: (message: string, extra?: Partial<LogContext>) =>
      log('info', message, { ...base, ...extra }),
    warn: (message: string, extra?: Partial<LogContext>) =>
      log('warn', message, { ...base, ...extra }),
    error: (message: string, extra?: Partial<LogContext>) =>
      log('error', message, { ...base, ...extra }),
  };
}
