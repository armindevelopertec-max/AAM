import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Kit, KitItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VentaService } from '../venta/venta.service';
import { FilesService } from '../files/files.service';
import { optimizeImage } from '../files/image-optimizer';
import { CreateKitDto } from './dto/create-kit.dto';
import { UpdateKitDto } from './dto/update-kit.dto';

export interface KitWithItems extends Kit {
  items: KitItem[];
  imageUrl: string | null;
  subtotal: number;
}

@Injectable()
export class KitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venta: VentaService,
    private readonly files: FilesService,
  ) {}

  async create(
    createKitDto: CreateKitDto,
    storeId: string,
  ): Promise<KitWithItems> {
    if (!createKitDto.items || createKitDto.items.length === 0) {
      throw new BadRequestException('El kit debe incluir al menos un producto');
    }

    const items = await this.resolveItems(createKitDto.items);
    const kit = await this.prisma.kit.create({
      data: {
        storeId,
        name: createKitDto.name,
        description: createKitDto.description ?? null,
        priceOverride: createKitDto.priceOverride ?? null,
        items: { create: items },
      },
      include: { items: true },
    });

    return this.toDto(kit);
  }

  async findAll(storeId: string): Promise<KitWithItems[]> {
    const kits = await this.prisma.kit.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return kits.map((kit) => this.toDto(kit));
  }

  async findOne(id: string, storeId: string): Promise<KitWithItems> {
    const kit = await this.prisma.kit.findFirst({
      where: { id, storeId },
      include: { items: true },
    });
    if (!kit) {
      throw new NotFoundException(`Kit ${id} no encontrado`);
    }
    return this.toDto(kit);
  }

  async update(
    id: string,
    updateKitDto: UpdateKitDto,
    storeId: string,
  ): Promise<KitWithItems> {
    const kit = await this.findOne(id, storeId);

    const items = updateKitDto.items
      ? await this.resolveItems(updateKitDto.items)
      : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.kitItem.deleteMany({ where: { kitId: id } });
      }
      return tx.kit.update({
        where: { id: kit.id },
        data: {
          ...(updateKitDto.name != null ? { name: updateKitDto.name } : {}),
          ...(updateKitDto.description != null
            ? { description: updateKitDto.description }
            : {}),
          ...(updateKitDto.priceOverride != null
            ? { priceOverride: updateKitDto.priceOverride }
            : {}),
          ...(updateKitDto.priceOverride === null
            ? { priceOverride: null }
            : {}),
          ...(items ? { items: { create: items } } : {}),
        },
        include: { items: true },
      });
    });

    return this.toDto(updated);
  }

  async remove(id: string, storeId: string): Promise<void> {
    const kit = await this.findOne(id, storeId);
    await this.prisma.kitItem.deleteMany({ where: { kitId: kit.id } });
    await this.prisma.kit.delete({ where: { id: kit.id } });
    if (kit.imageKey) {
      try {
        await this.files.deleteObject(kit.imageKey);
      } catch {
        // imagen inexistente en el bucket, se ignora
      }
    }
  }

  async uploadImage(
    id: string,
    storeId: string,
    file: Express.Multer.File,
  ): Promise<KitWithItems> {
    const kit = await this.findOne(id, storeId);
    const optimized = await optimizeImage(file.buffer, file.mimetype);
    const ext =
      optimized.ext ||
      (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
    const key = `kits/${kit.id}/${randomUUID()}.${ext}`;

    await this.files.uploadObject(key, optimized.buffer, optimized.contentType);

    if (kit.imageKey) {
      try {
        await this.files.deleteObject(kit.imageKey);
      } catch {
        // imagen anterior inexistente en el bucket, se ignora
      }
    }

    const updated = await this.prisma.kit.update({
      where: { id: kit.id },
      data: { imageKey: key },
      include: { items: true },
    });

    return this.toDto(updated);
  }

  async getImageKey(id: string): Promise<string | null> {
    const kit = await this.prisma.kit.findUnique({ where: { id } });
    return kit?.imageKey ?? null;
  }

  /** Resuelve las líneas contra el catálogo maestro (Mongo) y genera el snapshot. */
  private async resolveItems(
    inputItems: Array<{
      productId?: number;
      fuente?: string;
      quantity: number;
      nombre?: string;
      sku?: string;
      precio?: number;
    }>,
  ) {
    const items: {
      productId: number | null;
      fuente: string | null;
      name: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      originalPrice: number;
      moneda: string;
      unidad: string | null;
    }[] = [];
    for (const item of inputItems) {
      if (item.quantity <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a cero');
      }

      if (!item.fuente) {
        if (item.nombre == null || item.nombre.trim() === '') {
          throw new BadRequestException(
            'Las líneas de servicio deben incluir un nombre',
          );
        }
        const unitPrice = item.precio ?? 0;
        items.push({
          productId: null,
          fuente: null,
          name: item.nombre,
          sku: item.sku ?? 'SERVICIO',
          quantity: item.quantity,
          unitPrice,
          originalPrice: unitPrice,
          moneda: 'BOB',
          unidad: null,
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
      const catalogPrice = this.precioVentaDe(d);
      const unitPrice = item.precio != null ? item.precio : (catalogPrice ?? 0);
      const originalPrice =
        d.unidad === 'metro' &&
        typeof d.precioMetro === 'number' &&
        d.precioMetro > 0
          ? d.precioMetro
          : typeof d.precioRegular === 'number' && d.precioRegular > 0
            ? d.precioRegular
            : unitPrice;

      items.push({
        productId: d.idExterno,
        fuente: product.fuente,
        name: d.nombre,
        sku: d.sku,
        quantity: item.quantity,
        unitPrice,
        originalPrice,
        moneda: d.moneda ?? 'BOB',
        unidad: d.unidad ?? null,
      });
    }
    return items;
  }

  private precioVentaDe(d: {
    precioOferta?: number | null;
    precioRegular?: number | null;
    precioMetro?: number | null;
    unidad?: string | null;
  }): number | null {
    if (
      d.unidad === 'metro' &&
      typeof d.precioMetro === 'number' &&
      d.precioMetro > 0
    ) {
      return d.precioMetro;
    }
    if (typeof d.precioOferta === 'number' && d.precioOferta > 0) {
      return d.precioOferta;
    }
    if (typeof d.precioRegular === 'number') {
      return d.precioRegular;
    }
    return null;
  }

  private toDto(kit: Kit & { items: KitItem[] }): KitWithItems {
    const subtotal = kit.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const imageUrl = kit.imageKey ? `/kits/${kit.id}/image` : null;
    return { ...kit, items: kit.items, imageUrl, subtotal };
  }
}
