import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController session cookies', () => {
  const user = { id: 1, email: 'owner@example.test' };

  function setup(values: Record<string, string>) {
    const config = new ConfigService(values);
    const service = {
      login: jest
        .fn()
        .mockResolvedValue({ user, token: 'signed-test-session' }),
      register: jest
        .fn()
        .mockResolvedValue({ user, token: 'signed-test-session' }),
    };
    const response = { cookie: jest.fn(), clearCookie: jest.fn() };
    return {
      controller: new AuthController(service as unknown as AuthService, config),
      response,
      res: response as unknown as Response,
    };
  }

  it.each(['login', 'register'] as const)(
    '%s uses a secure production cookie with the configured JWT lifetime',
    async (method) => {
      const { controller, response, res } = setup({
        NODE_ENV: 'production',
        SESSION_TTL_DAYS: '7',
      });
      await controller[method](
        { email: user.email, password: 'password' },
        res,
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'ledger_token',
        'signed-test-session',
        {
          httpOnly: true,
          sameSite: 'lax',
          secure: true,
          path: '/',
          maxAge: 7 * 86400000,
        },
      );
    },
  );

  it('allows local HTTP but can opt in to secure development cookies', async () => {
    for (const secure of [false, true]) {
      const { controller, response, res } = setup({
        NODE_ENV: 'development',
        COOKIE_SECURE: String(secure),
      });
      await controller.login({ email: user.email, password: 'password' }, res);
      expect(response.cookie).toHaveBeenCalledWith(
        'ledger_token',
        'signed-test-session',
        expect.objectContaining({ secure }),
      );
    }
  });

  it('clears the same production cookie scope without setting maxAge', () => {
    const { controller, response, res } = setup({ NODE_ENV: 'production' });
    controller.logout(res);
    expect(response.clearCookie).toHaveBeenCalledWith('ledger_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });
  });

  it.each(['0', '-1', 'NaN', '1.5'])(
    'rejects invalid SESSION_TTL_DAYS=%s',
    async (ttl) => {
      const { controller, res } = setup({ SESSION_TTL_DAYS: ttl });
      await expect(
        controller.login({ email: user.email, password: 'password' }, res),
      ).rejects.toThrow('SESSION_TTL_DAYS');
    },
  );

  it('rejects disabling secure cookies in production', async () => {
    const { controller, res } = setup({
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
    });
    await expect(
      controller.login({ email: user.email, password: 'password' }, res),
    ).rejects.toThrow('COOKIE_SECURE');
  });
});
