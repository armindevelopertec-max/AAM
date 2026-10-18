import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto, @CurrentUser() user: User) {
    return this.salesService.create(createSaleDto, user.storeId, user.name);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query() query: { page?: string; limit?: string; search?: string },
  ) {
    const page =
      query.page != null
        ? Math.max(1, parseInt(query.page, 10) || 1)
        : undefined;
    const limitRaw =
      query.limit != null ? parseInt(query.limit, 10) || 10 : undefined;
    const limit =
      limitRaw != null ? Math.min(100, Math.max(1, limitRaw)) : undefined;
    return this.salesService.findAll(user.storeId, {
      ...(page != null ? { page } : {}),
      ...(page != null && limit != null ? { limit } : {}),
      search: query.search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.salesService.findOne(id, user.storeId);
  }

  @Post(':id/pdf')
  generatePdf(@Param('id') id: string, @CurrentUser() user: User) {
    return this.salesService.generatePdf(id, user.storeId);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    try {
      await this.salesService.generatePdf(id, user.storeId);
      const { buffer, contentType } = await this.salesService.getSalePdf(
        id,
        user.storeId,
      );
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
      });
      res.end(buffer);
    } catch (err) {
      res.status(404).json({ error: 'PDF no encontrado' });
    }
  }

  @Get(':id/excel')
  async downloadExcel(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.salesService.generateExcel(id, user.storeId);
      const sale = await this.salesService.findOne(id, user.storeId);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${sale.number}.xlsx"`,
        'Cache-Control': 'no-store',
      });
      res.end(buffer);
    } catch (err) {
      res.status(404).json({ error: 'Excel no encontrado' });
    }
  }

  @Get(':id/xml')
  async downloadXml(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    try {
      const sale = await this.salesService.findOne(id, user.storeId);
      const xml = await this.salesService.generateXml(id, user.storeId);
      res.set({
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${sale.number}.xml"`,
        'Cache-Control': 'no-store',
      });
      res.end(xml);
    } catch (err) {
      res.status(404).json({ error: 'XML no encontrado' });
    }
  }
}
