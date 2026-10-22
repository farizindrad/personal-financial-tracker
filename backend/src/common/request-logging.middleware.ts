import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export type CorrelatedRequest = Request & { requestId?: string };
const logger = new Logger('HTTP');

export function routeLabel(request: Request): string {
  const route = request.route as { path?: unknown } | undefined;
  return typeof route?.path === 'string' ? route.path : 'unmatched';
}

export function safeErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^P\d{4}$/.test(error.code)
  )
    return error.code;
  return 'UNEXPECTED_ERROR';
}

export function requestLogging(
  request: CorrelatedRequest,
  response: Response,
  next: NextFunction,
) {
  const started = process.hrtime.bigint();
  request.requestId = randomUUID();
  response.setHeader('X-Request-Id', request.requestId);
  response.once('finish', () => {
    logger.log({
      event: 'http_request',
      requestId: request.requestId,
      method: request.method,
      route: routeLabel(request),
      status: response.statusCode,
      durationMs: Number(process.hrtime.bigint() - started) / 1_000_000,
      outcome: response.statusCode >= 400 ? 'error' : 'success',
    });
  });
  next();
}
