import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StoresModule } from '../stores/stores.module';
import { KitsModule } from '../kits/kits.module';

@Module({
  imports: [PrismaModule, StoresModule, KitsModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}