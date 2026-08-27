import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ScrapedProduct,
  ScrapedProductSchema,
} from './schemas/scraped-product.schema';
import {
  CatalogoProduct,
  CatalogoProductSchema,
} from './schemas/catalogo-product.schema';
import { ScrapingRun, ScrapingRunSchema } from './schemas/scraping-run.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri:
          process.env.MONGO_URI ??
          'mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin',
      }),
    }),
    MongooseModule.forFeature([
      { name: ScrapedProduct.name, schema: ScrapedProductSchema },
      { name: CatalogoProduct.name, schema: CatalogoProductSchema },
      { name: ScrapingRun.name, schema: ScrapingRunSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
