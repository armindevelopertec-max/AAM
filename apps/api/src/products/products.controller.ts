import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard, Public } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FilesService } from '../files/files.service';
import { AuditService } from '../audit/audit.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get(':id/image')
  async serveImage(@Param('id') id: string, @Res() res: Response) {
    const key = await this.productsService.getImageKey(id);
    if (!key) {
      res.set('Cache-Control', 'no-store');
      res.status(404).json({ error: 'Imagen no encontrada' });
      return;
    }
    try {
      const data = await this.files.getObject(key);
      res.set({
        'Content-Type': data.contentType,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(data.body);
    } catch {
      res.set('Cache-Control', 'no-store');
      res.status(404).json({ error: 'Imagen no encontrada' });
    }
  }

  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    const product = await this.productsService.create(
      createProductDto,
      user.storeId,
    );
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'producto.creado',
      entity: 'Product',
      entityId: product.id,
      details: { nombre: product.name, sku: product.sku },
    });
    return product;
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('q') q?: string,
    @Query('category') category?: string,
  ) {
    return this.productsService.findAll(user.storeId, q, category);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.findOne(id, user.storeId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    const product = await this.productsService.update(
      id,
      updateProductDto,
      user.storeId,
    );
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'producto.editado',
      entity: 'Product',
      entityId: id,
      details: { nombre: product.name, sku: product.sku },
    });
    return product;
  }

  @Patch(':id/stock')
  adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: AdjustStockDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.adjustStock(
      id,
      adjustStockDto.adjustment,
      user.storeId,
    );
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debes enviar un archivo en el campo "file"',
      );
    }
    return this.productsService.uploadImage(id, user.storeId, file);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const result = await this.productsService.remove(id, user.storeId);
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'producto.eliminado',
      entity: 'Product',
      entityId: id,
    });
    return result;
  }
}
