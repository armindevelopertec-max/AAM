import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VentaModule } from '../venta/venta.module';
import { PdfModule } from '../pdf/pdf.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, VentaModule, PdfModule, FilesModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
