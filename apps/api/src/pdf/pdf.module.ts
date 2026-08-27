import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
