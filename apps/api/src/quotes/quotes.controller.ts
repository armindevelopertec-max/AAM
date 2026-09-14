import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto, @CurrentUser() user: User) {
    return this.quotesService.create(createQuoteDto, user.storeId, user.name);
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
    return this.quotesService.findAll(user.storeId, {
      ...(page != null ? { page } : {}),
      ...(page != null && limit != null ? { limit } : {}),
      search: query.search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quotesService.findOne(id, user.storeId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateQuoteStatusDto: UpdateQuoteStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.quotesService.updateStatus(
      id,
      updateQuoteStatusDto.status,
      user.storeId,
    );
  }

  @Post(':id/convert')
  convertToSale(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quotesService.convertToSale(id, user.storeId, user.name);
  }

  @Post(':id/pdf')
  generatePdf(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quotesService.generatePdf(id, user.storeId);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    try {
      await this.quotesService.generatePdf(id, user.storeId);
      const { buffer, contentType } = await this.quotesService.getQuotePdf(
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
}
