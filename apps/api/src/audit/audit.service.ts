import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditInput = {
  storeId: string;
  actorId?: string | null;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Registra una acción. Nunca lanza: la auditoría no debe romper la operación. */
  async log(input: AuditInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          storeId: input.storeId,
          actorId: input.actorId ?? null,
          actorName: input.actorName,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          details:
            typeof input.details === 'string'
              ? input.details
              : input.details
                ? JSON.stringify(input.details)
                : null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Auditoría no registrada (${input.action}): ${String(err)}`,
      );
    }
  }

  async findAll(
    storeId: string,
    filters: {
      actorId?: string;
      action?: string;
      page?: string;
      limit?: string;
    },
  ) {
    const page = Math.max(1, parseInt(filters.page ?? '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(filters.limit ?? '50', 10) || 50),
    );

    const where: {
      storeId: string;
      actorId?: string;
      action?: { startsWith: string };
    } = { storeId };
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = { startsWith: filters.action };

    const [total, items, actors] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.findMany({
        where: { storeId },
        distinct: ['actorId'],
        select: { actorId: true, actorName: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, items, actors };
  }
}
