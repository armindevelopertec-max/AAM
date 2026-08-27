import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';
import { PdfModule } from '../pdf/pdf.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, SalesModule, PdfModule, FilesModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
