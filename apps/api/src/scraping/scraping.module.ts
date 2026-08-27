import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, FilesModule, PrismaModule],
  controllers: [ScrapingController],
  providers: [ScrapingService],
  exports: [ScrapingService],
})
export class ScrapingModule {}
