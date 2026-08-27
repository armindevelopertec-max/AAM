import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [PrismaModule, StoresModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
