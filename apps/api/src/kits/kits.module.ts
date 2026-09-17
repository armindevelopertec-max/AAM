import { Module } from '@nestjs/common';
import { KitsService } from './kits.service';
import { KitsController } from './kits.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VentaModule } from '../venta/venta.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, VentaModule, FilesModule],
  controllers: [KitsController],
  providers: [KitsService],
  exports: [KitsService],
})
export class KitsModule {}
