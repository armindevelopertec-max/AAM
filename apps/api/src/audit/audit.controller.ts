import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from './audit.service';

@Controller('auditoria')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'root' && user.role !== 'admin') {
      throw new ForbiddenException('Solo root y admin pueden ver la auditoría');
    }
    return this.auditService.findAll(user.storeId, {
      actorId,
      action,
      page,
      limit,
    });
  }
}
