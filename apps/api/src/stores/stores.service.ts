import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  create(createStoreDto: CreateStoreDto) {
    return this.prisma.store.create({
      data: {
        name: createStoreDto.name,
        currency: createStoreDto.currency ?? 'BOB',
        taxRate: createStoreDto.taxRate ?? 0,
        lowStockThreshold: createStoreDto.lowStockThreshold ?? 5,
      },
    });
  }

  findAll() {
    return this.prisma.store.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Tienda ${id} no encontrada`);
    }
    return store;
  }

  update(id: string, updateStoreDto: UpdateStoreDto) {
    return this.prisma.store.update({ where: { id }, data: updateStoreDto });
  }
}
