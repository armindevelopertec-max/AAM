import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { KitsService } from './kits.service';
import { CreateKitDto } from './dto/create-kit.dto';
import { UpdateKitDto } from './dto/update-kit.dto';
import { JwtAuthGuard, Public } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FilesService } from '../files/files.service';

@Controller('kits')
@UseGuards(JwtAuthGuard)
export class KitsController {
  constructor(
    private readonly kitsService: KitsService,
    private readonly files: FilesService,
  ) {}

  @Public()
  @Get(':id/image')
  async serveImage(@Param('id') id: string, @Res() res: Response) {
    const key = await this.kitsService.getImageKey(id);
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

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.kitsService.findAll(user.storeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.kitsService.findOne(id, user.storeId);
  }

  @Post()
  create(@Body() createKitDto: CreateKitDto, @CurrentUser() user: User) {
    return this.kitsService.create(createKitDto, user.storeId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateKitDto: UpdateKitDto,
    @CurrentUser() user: User,
  ) {
    return this.kitsService.update(id, updateKitDto, user.storeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.kitsService.remove(id, user.storeId);
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
    return this.kitsService.uploadImage(id, user.storeId, file);
  }
}
