import { Controller, Get, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  summary(@CurrentUser() user: User) {
    return this.dashboardService.summary(user.storeId);
  }
}
