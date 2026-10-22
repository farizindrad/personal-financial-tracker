import { ConfigService } from '@nestjs/config';

export function sessionTtlDays(config: ConfigService): number {
  const days = Number(config.get<string>('SESSION_TTL_DAYS') ?? '30');
  if (!Number.isSafeInteger(days) || days <= 0 || days > 3650) {
    throw new Error('SESSION_TTL_DAYS must be an integer from 1 to 3650');
  }
  return days;
}

export function sessionCookieOptions(config: ConfigService) {
  const production = config.get<string>('NODE_ENV') === 'production';
  const value = config.get<string>('COOKIE_SECURE');
  if (value !== undefined && value !== 'true' && value !== 'false') {
    throw new Error('COOKIE_SECURE must be true or false');
  }
  if (production && value === 'false') {
    throw new Error('COOKIE_SECURE cannot be false in production');
  }
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: production || value === 'true',
    path: '/',
    maxAge: sessionTtlDays(config) * 86_400_000,
  };
}
