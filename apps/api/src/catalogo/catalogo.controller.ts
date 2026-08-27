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
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import path from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogoService } from './catalogo.service';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  getCatalogo(
    @Query('buscar') buscar?: string,
    @Query('marca') marca?: string,
    @Query('categoria') categoria?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogoService.getCatalogo({
      buscar,
      marca,
      categoria,
      page,
      limit,
    });
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  importFromJson(@Query('path') customPath?: string) {
    const jsonPath =
      customPath ??
      path.join(
        process.cwd(),
        '..',
        '..',
        'jsondata',
        'catalogo_cctv_normalizado.json',
      );
    return this.catalogoService.importFromJson(jsonPath);
  }

  @Patch('productos/:id')
  @UseGuards(JwtAuthGuard)
  updateProducto(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.catalogoService.updateProducto(Number(id), dto);
  }

  @Post('productos/:id/imagenes')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImagenes(
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un archivo en el campo "files"',
      );
    }
    return this.catalogoService.uploadImagenes(Number(id), files);
  }

  @Delete('productos/:id/imagenes')
  @UseGuards(JwtAuthGuard)
  deleteImagen(@Param('id') id: string, @Query('key') key?: string) {
    if (!key) throw new BadRequestException('Debes enviar el parámetro "key"');
    return this.catalogoService.removeImagen(Number(id), key);
  }

  @Delete('productos/:id')
  @UseGuards(JwtAuthGuard)
  deleteProducto(@Param('id') id: string) {
    return this.catalogoService.removeProducto(Number(id));
  }
}
