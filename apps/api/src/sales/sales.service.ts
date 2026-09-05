import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VentaService } from '../venta/venta.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venta: VentaService,
  ) {}

  async create(
    createSaleDto: CreateSaleDto,
    storeId: string,
    createdByName?: string,
  ) {
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException(
        'La venta debe incluir al menos un producto',
      );
    }

    const discount = createSaleDto.discount ?? 0;
    let subtotal = 0;
    const items: Prisma.SaleItemUncheckedCreateWithoutSaleInput[] = [];

    for (const item of createSaleDto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(`La cantidad debe ser mayor a cero`);
      }

      if (!item.fuente) {
        // Línea de servicio (no está en el catálogo maestro)
        if (item.precio == null) {
          throw new BadRequestException(
            'Las líneas de servicio deben incluir un precio',
          );
        }
        const unitPrice = item.precio;
        const lineSubtotal = unitPrice * item.quantity;
        subtotal += lineSubtotal;
        items.push({
          productId: null,
          fuente: null,
          name: item.nombre ?? 'Servicio',
          sku: item.sku ?? 'SERVICIO',
          quantity: item.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        });
        continue;
      }

      if (item.productId == null) {
        throw new BadRequestException('Falta el código de producto');
      }
      const product = await this.venta.findSellableOrThrow(
        item.fuente,
        item.productId,
      );
      const d = product.datosCrudos;

      const unitPrice = this.precioVentaDe(d);
      if (unitPrice == null) {
        throw new BadRequestException(
          `El producto ${d.nombre} no tiene precio definido en el catálogo`,
        );
      }

      const stockDisponible =
        typeof d.stockCantidad === 'number' ? d.stockCantidad : null;
      if (stockDisponible != null && stockDisponible < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${d.nombre}: disponible ${stockDisponible}`,
        );
      }

      // Resta el stock del catálogo maestro de forma atómica (solo si hay stock numerico).
      if (stockDisponible != null) {
        const ok = await this.venta.decrementStock(
          item.fuente ?? product.fuente,
          item.productId,
          item.quantity,
        );
        if (!ok) {
          throw new BadRequestException(
            `Stock insuficiente para ${d.nombre}: disponible ${d.stockCantidad}`,
          );
        }
      }

      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;

      items.push({
        productId: d.idExterno,
        fuente: product.fuente,
        name: d.nombre,
        sku: d.sku,
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

    return this.prisma.$transaction(async (tx) => {
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

  findAll(storeId: string) {
    return this.prisma.sale.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      include: { items: true },
    });
  }

  async findOne(id: string, storeId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, storeId },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    return sale;
  }

  private precioVentaDe(d: {
    precioOferta?: number | null;
    precioRegular?: number | null;
  }): number | null {
    if (typeof d.precioOferta === 'number' && d.precioOferta > 0) {
      return d.precioOferta;
    }
    if (typeof d.precioRegular === 'number') {
      return d.precioRegular;
    }
    return null;
  }
}