import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { ClientsModule } from './clients/clients.module';
import { StoresModule } from './stores/stores.module';
import { SalesModule } from './sales/sales.module';
import { QuotesModule } from './quotes/quotes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { MongoModule } from './mongo/mongo.module';
import { ScrapingModule } from './scraping/scraping.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    MongoModule,
    ProductsModule,
    ClientsModule,
    StoresModule,
    SalesModule,
    QuotesModule,
    DashboardModule,
    AuthModule,
    CatalogoModule,
    ScrapingModule,
    PdfModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
