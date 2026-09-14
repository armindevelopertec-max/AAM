import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  SetMetadata,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { ScrapingService } from './scraping.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SaveScrapedProductsDto } from './dto/save-scraped-products.dto';
import { ImportToPostgresDto } from './dto/import-to-postgres.dto';
import { PatchPrecioDto } from './dto/patch-precio.dto';
import { CreateManualProductDto } from './dto/create-manual-product.dto';
import { FilesService } from '../files/files.service';
import { Public } from '../auth/jwt-auth.guard';

@Controller('scraping')
@UseGuards(JwtAuthGuard)
export class ScrapingController {
  constructor(
    private readonly scrapingService: ScrapingService,
    private readonly files: FilesService,
  ) {}

  @Post('save')
  saveProducts(@Body() dto: SaveScrapedProductsDto) {
    return this.scrapingService.saveScrapedProducts(dto);
  }

  @Post('manual')
  createManual(@Body() dto: CreateManualProductDto) {
    return this.scrapingService.createManual(dto);
  }

  @Get('products')
  findAll(
    @Query('fuente') fuente?: string,
    @Query('categoria') categoria?: string,
    @Query('importado') importado?: string,
    @Query('descartado') descartado?: string,
    @Query('conStock') conStock?: string,
    @Query('buscar') buscar?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.scrapingService.findAll({
      fuente,
      categoria,
      importado,
      descartado,
      conStock,
      buscar,
      page,
      limit,
    });
  }

  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.scrapingService.findOne(id);
  }

  @Post('products/:id/import')
  importToPostgres(
    @Param('id') id: string,
    @Body() dto: ImportToPostgresDto,
    @CurrentUser() user: User,
  ) {
    return this.scrapingService.importToPostgres(id, dto, user.storeId);
  }

  @Patch('products/:id/discard')
  markDiscarded(
    @Param('id') id: string,
    @Body('descartado') descartado: boolean,
  ) {
    return this.scrapingService.markDiscarded(id, descartado);
  }

  @Patch('products/:id/notes')
  addNotes(@Param('id') id: string, @Body('notas') notas: string) {
    return this.scrapingService.addNotes(id, notas);
  }

  @Patch('products/:id/precio')
  updatePrecio(@Param('id') id: string, @Body() dto: PatchPrecioDto) {
    return this.scrapingService.updatePrecios(id, dto);
  }

  @Post('products/:id/images')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un archivo en el campo "files"',
      );
    }
    return this.scrapingService.uploadImages(id, files);
  }

  @Delete('products/:id/images')
  removeImage(@Param('id') id: string, @Query('key') key?: string) {
    if (!key) throw new BadRequestException('Debes enviar el parámetro "key"');
    return this.scrapingService.removeImage(id, key);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.scrapingService.deleteProduct(id);
  }

  @Get('runs')
  getRuns() {
    return this.scrapingService.getRuns();
  }

  @Get('stats')
  getStats() {
    return this.scrapingService.getStats();
  }

  @Public()
  @Get('images/*key')
  async serveImage(@Param('key') key: string, @Res() res: Response) {
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
}
