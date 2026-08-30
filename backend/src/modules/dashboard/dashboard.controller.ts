import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.decorators';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardSummaryQueryDto,
  ) {
    return this.dashboardService.getSummary(user.id, query.month, query.year);
  }

  @Get('daily')
  getDaily(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardSummaryQueryDto,
  ) {
    return this.dashboardService.getDaily(user.id, query.month, query.year);
  }
}
