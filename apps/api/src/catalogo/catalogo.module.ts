import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogoService } from './catalogo.service';
import { CatalogoController } from './catalogo.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import {
  CatalogoProduct,
  CatalogoProductSchema,
} from '../mongo/schemas/catalogo-product.schema';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    FilesModule,
    MongooseModule.forFeature([
      { name: CatalogoProduct.name, schema: CatalogoProductSchema },
    ]),
  ],
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogoModule {}
