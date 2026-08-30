import { ConfigService } from '@nestjs/config';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

export function isDemoMode(config: ConfigService): boolean {
  return (
    String(config.get<string>('IS_DEMO') ?? 'false').toLowerCase() === 'true'
  );
}

/** Limit write requests — lebih ketat kalau IS_DEMO=true */
export function createThrottlerOptions(
  config: ConfigService,
): ThrottlerModuleOptions {
  const demo = isDemoMode(config);

  return {
    throttlers: [
      {
        name: 'write',
        ttl: 60_000,
        limit: demo ? 20 : 100,
      },
      {
        name: 'writeBurst',
        ttl: 10_000,
        limit: demo ? 5 : 25,
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: demo ? 5 : 10,
      },
    ],
    errorMessage: demo
      ? 'Too many write requests on demo. Please wait and try again.'
      : 'Too many write requests. Please wait and try again.',
  };
}
