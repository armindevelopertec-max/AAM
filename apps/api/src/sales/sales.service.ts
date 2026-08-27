import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createSaleDto: CreateSaleDto,
    storeId: number,
    createdByName?: string,
  ) {
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException(
        'La venta debe incluir al menos un producto',
      );
    }

    const discount = createSaleDto.discount ?? 0;

    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const items: Prisma.SaleItemUncheckedCreateWithoutSaleInput[] = [];

      for (const item of createSaleDto.items) {
        if (item.quantity <= 0) {
          throw new BadRequestException(`La cantidad debe ser mayor a cero`);
        }

        const updated = await tx.product.updateMany({
          where: { id: item.productId, storeId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (!product || product.storeId !== storeId) {
            throw new NotFoundException(
              `Producto ${item.productId} no encontrado`,
            );
          }
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}: disponible ${product.stock}`,
          );
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        const unitPrice = item.price ?? product!.price;
        const lineSubtotal = unitPrice * item.quantity;
        subtotal += lineSubtotal;

        items.push({
          productId: product!.id,
          name: product!.name,
          sku: product!.sku,
          quantity: item.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        });
      }

      if (discount < 0 || discount > subtotal) {
        throw new BadRequestException(
          'El descuento no puede ser negativo ni mayor al subtotal',
        );
      }

      const seq = await tx.sequence.upsert({
        where: { storeId_name: { storeId, name: 'sale' } },
        create: { storeId, name: 'sale', value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = `V-${String(seq.value).padStart(4, '0')}`;

      return tx.sale.create({
        data: {
          storeId,
          number,
          clientId: createSaleDto.clientId ?? null,
          createdBy: createdByName ?? null,
          subtotal,
          discount,
          total: subtotal - discount,
          items: { create: items },
        },
        include: { items: true },
      });
    });
  }

  findAll(storeId: number) {
    return this.prisma.sale.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      include: { items: true },
    });
  }

  async findOne(id: number, storeId: number) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, storeId },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    return sale;
  }
}
