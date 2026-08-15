import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [ProductsModule, ClientsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
