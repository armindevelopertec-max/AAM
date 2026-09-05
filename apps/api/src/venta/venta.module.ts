import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VentaController } from './venta.controller';
import { VentaService } from './venta.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [VentaController],
  providers: [VentaService],
  exports: [VentaService],
})
export class VentaModule {}