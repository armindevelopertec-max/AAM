import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VentaService } from './venta.service';

@Controller('venta')
@UseGuards(JwtAuthGuard)
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Get('productos')
  getProductos(
    @Query('buscar') buscar?: string,
    @Query('fuente') fuente?: string,
    @Query('categoria') categoria?: string,
    @Query('conStock') conStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ventaService.list({
      buscar,
      fuente,
      categoria,
      conStock,
      page,
      limit,
    });
  }
}