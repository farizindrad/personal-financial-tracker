import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { safeErrorCode } from '../common/request-logging.middleware';

export async function runScheduledJob(
  logger: Logger,
  job: 'recurring' | 'demo_reset',
  work: () => Promise<unknown>,
) {
  const runId = randomUUID();
  const started = process.hrtime.bigint();
  const context = {
    event: 'scheduled_job',
    runId,
    entryPoint: 'scheduler',
    job,
  };
  logger.log({ ...context, outcome: 'started' });
  try {
    const result = await work();
    logger.log({
      ...context,
      outcome: 'success',
      durationMs: Number(process.hrtime.bigint() - started) / 1_000_000,
      ...(typeof result === 'number' ? { generatedCount: result } : {}),
    });
  } catch (error) {
    logger.error({
      ...context,
      outcome: 'failure',
      durationMs: Number(process.hrtime.bigint() - started) / 1_000_000,
      errorCode: safeErrorCode(error),
    });
  }
}
