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
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE } from './auth.guard';
import { CurrentUser, Public } from './auth.decorators';
import type { AuthUser } from './auth.decorators';
import { AuthThrottle, isDemoMode } from '../../common/throttler.config';
import { resolveDemoEmail } from '../../seed/demo-seed';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { sessionCookieOptions } from './session.config';

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
      demoEmail: isDemoMode(this.config) ? resolveDemoEmail() : null,
    };
  }

  @Public()
  @AuthThrottle()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.register(dto);
    res.cookie(AUTH_COOKIE, token, sessionCookieOptions(this.config));
    return { user };
  }

  @Public()
  @AuthThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(dto);
    res.cookie(AUTH_COOKIE, token, sessionCookieOptions(this.config));
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    const options = sessionCookieOptions(this.config);
    res.clearCookie(AUTH_COOKIE, {
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      secure: options.secure,
      path: options.path,
    });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user: this.authService.me(user) };
  }
}
