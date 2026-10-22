import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import type { Response } from 'express';
import {
  requestLogging,
  type CorrelatedRequest,
  safeErrorCode,
} from './request-logging.middleware';

it('correlates status and duration using an allowlist without raw URL/body/headers', () => {
  const log = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);
  const req = {
    method: 'POST',
    url: '/api/transactions?secret=never-log',
    headers: { authorization: 'never-log', 'x-request-id': 'never-log' },
    body: { description: 'never-log' },
    route: { path: '/api/transactions' },
  } as unknown as CorrelatedRequest;
  const response = Object.assign(new EventEmitter(), {
    statusCode: 400,
    setHeader: jest.fn(),
  });
  const next = jest.fn();
  requestLogging(req, response as unknown as Response, next);
  response.emit('finish');
  expect(req.requestId).toMatch(/^[a-f0-9-]{36}$/);
  expect(response.setHeader).toHaveBeenCalledWith(
    'X-Request-Id',
    req.requestId,
  );
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      event: 'http_request',
      requestId: req.requestId,
      route: '/api/transactions',
      status: 400,
      durationMs: expect.any(Number) as unknown,
      outcome: 'error',
    }),
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain('never-log');
  expect(next).toHaveBeenCalled();
  log.mockRestore();
});

it('only accepts known-shaped Prisma error codes as diagnostic details', () => {
  expect(safeErrorCode({ code: 'P2002', message: 'private' })).toBe('P2002');
  expect(safeErrorCode({ code: 'private' })).toBe('UNEXPECTED_ERROR');
});
