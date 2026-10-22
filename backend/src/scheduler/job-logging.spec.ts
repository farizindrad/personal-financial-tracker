import { Logger } from '@nestjs/common';
import { runScheduledJob } from './job-logging';

it('correlates job start/completion without logging returned financial objects', async () => {
  const logger = new Logger('Test');
  const log = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
  await runScheduledJob(logger, 'demo_reset', () =>
    Promise.resolve({ description: 'never-log' }),
  );
  const first = log.mock.calls[0][0] as { runId: string };
  expect(log).toHaveBeenLastCalledWith(
    expect.objectContaining({
      runId: first.runId,
      entryPoint: 'scheduler',
      outcome: 'success',
      durationMs: expect.any(Number) as unknown,
    }),
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain('never-log');
  log.mockRestore();
});

it('records safe failure codes without exception messages or stack traces', async () => {
  const logger = new Logger('Test');
  const log = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
  const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  await runScheduledJob(logger, 'recurring', () =>
    Promise.reject(Object.assign(new Error('never-log'), { code: 'P2003' })),
  );
  expect(error).toHaveBeenCalledWith(
    expect.objectContaining({
      job: 'recurring',
      outcome: 'failure',
      errorCode: 'P2003',
    }),
  );
  expect(JSON.stringify(error.mock.calls)).not.toContain('never-log');
  log.mockRestore();
  error.mockRestore();
});
