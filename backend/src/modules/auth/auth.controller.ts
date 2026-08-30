import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE } from './auth.guard';
import { CurrentUser, Public } from './auth.decorators';
import type { AuthUser } from './auth.decorators';
import { isDemoMode } from '../../common/throttler.config';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 hari
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('config')
  getConfig() {
    return {
      demo: isDemoMode(this.config),
      demoEmail: isDemoMode(this.config)
        ? (this.config.get<string>('DEMO_EMAIL') ?? 'demo@ledger.app')
        : null,
    };
  }

  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.register(dto);
    res.cookie(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS);
    return { user };
  }

  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(dto);
    res.cookie(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS);
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user: this.authService.me(user) };
  }
}
