import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limit hanya untuk write (POST/PATCH/PUT/DELETE).
 * GET dashboard/list tetap bebas — sesuai PRD: throttle endpoint tulis, terutama demo.
 */
@Injectable()
export class WriteThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ method?: string }>();
    const method = (request.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }
    return super.shouldSkip(context);
  }
}
