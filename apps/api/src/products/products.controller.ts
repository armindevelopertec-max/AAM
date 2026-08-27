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

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly files: FilesService,
  ) {}

  @Public()
  @Get(':id/image')
  async serveImage(@Param('id') id: string, @Res() res: Response) {
    const key = await this.productsService.getImageKey(+id);
    if (!key) {
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
      res.status(404).json({ error: 'Imagen no encontrada' });
    }
  }

  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.create(createProductDto, user.storeId);
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
    return this.productsService.findOne(+id, user.storeId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.update(+id, updateProductDto, user.storeId);
  }

  @Patch(':id/stock')
  adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: AdjustStockDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.adjustStock(
      +id,
      adjustStockDto.adjustment,
      user.storeId,
    );
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
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
    return this.productsService.uploadImage(+id, user.storeId, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.remove(+id, user.storeId);
  }
}
