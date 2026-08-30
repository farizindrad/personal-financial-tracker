import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isDemoMode } from '../common/throttler.config';
import { PrismaService } from '../prisma/prisma.service';
import { seedDemoData } from '../seed/demo-seed';

/**
 * Reset data demo berkala — aktif HANYA saat IS_DEMO=true.
 * Jaga supaya instance demo tidak penuh sampah & selalu tampil "hidup".
 */
@Injectable()
export class DemoResetScheduler {
  private readonly logger = new Logger(DemoResetScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleDemoReset() {
    if (!isDemoMode(this.config)) {
      return;
    }
    this.logger.log('Demo reset job running...');
    try {
      await seedDemoData(this.prisma);
      this.logger.log('Demo data reseeded');
    } catch (error) {
      this.logger.error('Demo reset failed', error);
    }
  }
}
