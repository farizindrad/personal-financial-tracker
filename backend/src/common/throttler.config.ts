import { ConfigService } from '@nestjs/config';
import { SetMetadata } from '@nestjs/common';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

const AUTH_THROTTLE = 'ledger:auth-throttle';
export const AuthThrottle = () => SetMetadata(AUTH_THROTTLE, true);

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
        skipIf: (context) =>
          Reflect.getMetadata(AUTH_THROTTLE, context.getHandler()) !== true,
      },
    ],
    errorMessage: demo
      ? 'Too many write requests on demo. Please wait and try again.'
      : 'Too many write requests. Please wait and try again.',
  };
}
