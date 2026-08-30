import { ConfigService } from '@nestjs/config';
import { createThrottlerOptions, isDemoMode } from './throttler.config';

describe('throttler.config', () => {
  function mockConfig(isDemo: string): ConfigService {
    return {
      get: (key: string) => (key === 'IS_DEMO' ? isDemo : undefined),
    } as ConfigService;
  }

  it('detects demo mode', () => {
    expect(isDemoMode(mockConfig('true'))).toBe(true);
    expect(isDemoMode(mockConfig('TRUE'))).toBe(true);
    expect(isDemoMode(mockConfig('false'))).toBe(false);
  });

  it('uses stricter write limits when IS_DEMO=true', () => {
    const demo = createThrottlerOptions(mockConfig('true'));
    const prod = createThrottlerOptions(mockConfig('false'));

    const demoLimits = 'throttlers' in demo ? demo.throttlers : (demo as never);
    const prodLimits = 'throttlers' in prod ? prod.throttlers : (prod as never);

    expect(demoLimits.find((t) => t.name === 'write')?.limit).toBe(20);
    expect(prodLimits.find((t) => t.name === 'write')?.limit).toBe(100);
    expect(demoLimits.find((t) => t.name === 'writeBurst')?.limit).toBe(5);
    expect(prodLimits.find((t) => t.name === 'writeBurst')?.limit).toBe(25);
  });
});
