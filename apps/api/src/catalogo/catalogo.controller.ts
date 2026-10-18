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
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { CatalogoService } from './catalogo.service';
import {
  CreateProductoDto,
  UpdateProductoDto,
} from './dto/update-producto.dto';

@Controller('catalogo')
export class CatalogoController {
  constructor(
    private readonly catalogoService: CatalogoService,
    private readonly audit: AuditService,
  ) {}

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

  @Post('productos')
  @UseGuards(JwtAuthGuard)
  async createProducto(
    @Body() dto: CreateProductoDto,
    @CurrentUser() user: User,
  ) {
    const producto = await this.catalogoService.createProducto(dto);
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'catalogo.cctv.creado',
      entity: 'ProductoCCTV',
      details: { nombre: dto.nombre },
    });
    return producto;
  }

  @Patch('productos/:id')
  @UseGuards(JwtAuthGuard)
  async updateProducto(
    @Param('id') id: string,
    @Body() dto: UpdateProductoDto,
    @CurrentUser() user: User,
  ) {
    const producto = await this.catalogoService.updateProducto(Number(id), dto);
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'catalogo.cctv.editado',
      entity: 'ProductoCCTV',
      entityId: id,
      details: { nombre: dto.nombre },
    });
    return producto;
  }

  @Post('productos/:id/imagenes')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
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
  async deleteProducto(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.catalogoService.removeProducto(Number(id));
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'catalogo.cctv.eliminado',
      entity: 'ProductoCCTV',
      entityId: id,
    });
    return result;
  }
}
