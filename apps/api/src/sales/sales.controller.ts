import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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
  findAll(@CurrentUser() user: User) {
    return this.salesService.findAll(user.storeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.salesService.findOne(+id, user.storeId);
  }
}
