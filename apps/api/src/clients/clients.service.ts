import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createClientDto: CreateClientDto, storeId: number) {
    return this.prisma.client.create({
      data: { storeId, ...createClientDto },
    });
  }

  findAll(storeId: number, q?: string) {
    return this.prisma.client.findMany({
      where: {
        storeId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { ci: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, storeId: number) {
    const client = await this.prisma.client.findFirst({
      where: { id, storeId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }
    return client;
  }

  async update(id: number, updateClientDto: UpdateClientDto, storeId: number) {
    const client = await this.findOne(id, storeId);
    return this.prisma.client.update({
      where: { id: client.id },
      data: updateClientDto,
    });
  }

  async remove(id: number, storeId: number) {
    const client = await this.findOne(id, storeId);
    return this.prisma.client.delete({ where: { id: client.id } });
  }
}
