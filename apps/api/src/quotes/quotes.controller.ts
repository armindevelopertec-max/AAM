import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
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
  findAll(@CurrentUser() user: User) {
    return this.quotesService.findAll(user.storeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quotesService.findOne(+id, user.storeId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateQuoteStatusDto: UpdateQuoteStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.quotesService.updateStatus(
      +id,
      updateQuoteStatusDto.status,
      user.storeId,
    );
  }

  @Post(':id/convert')
  convertToSale(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quotesService.convertToSale(+id, user.storeId, user.name);
  }

  @Post(':id/pdf')
  generatePdf(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quotesService.generatePdf(+id, user.storeId);
  }
}
