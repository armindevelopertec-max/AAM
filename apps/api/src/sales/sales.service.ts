import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VentaService } from '../venta/venta.service';
import { PdfService } from '../pdf/pdf.service';
import { FilesService } from '../files/files.service';
import { CreateSaleDto } from './dto/create-sale.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venta: VentaService,
    private readonly pdf: PdfService,
    private readonly files: FilesService,
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

      const catalogPrice = this.precioVentaDe(d);
      if (catalogPrice == null) {
        throw new BadRequestException(
          `El producto ${d.nombre} no tiene precio definido en el catálogo`,
        );
      }
      const unitPrice = item.precio != null ? item.precio : catalogPrice;

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

      const folioSeq = await tx.sequence.upsert({
        where: { storeId_name: { storeId, name: 'folio' } },
        create: { storeId, name: 'folio', value: 100000 },
        update: { value: { increment: 1 } },
      });

      return tx.sale.create({
        data: {
          storeId,
          number,
          followNumber: folioSeq.value,
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

  async findAll(
    storeId: string,
    opts?: { page?: number; limit?: number; search?: string },
  ) {
    const page = opts?.page;
    const limit = opts?.limit;

    if (page == null || limit == null) {
      return this.prisma.sale.findMany({
        where: { storeId },
        orderBy: { id: 'desc' },
        include: { items: true },
      });
    }

    const search = opts?.search?.trim();
    const where: Prisma.SaleWhereInput = { storeId };
    if (search) {
      const folioNum = /^\d+$/.test(search) ? Number(search) : null;
      const ors: Prisma.SaleWhereInput[] = [
        { number: { contains: search, mode: 'insensitive' } },
        ...(folioNum != null ? [{ followNumber: folioNum }] : []),
      ];
      const clientIds = await this.prisma.client
        .findMany({
          where: { storeId, name: { contains: search, mode: 'insensitive' } },
          select: { id: true },
        })
        .then((rows) => rows.map((r) => r.id));
      if (clientIds.length > 0) {
        ors.push({ clientId: { in: clientIds } });
      }
      where.OR = ors;
    }

    const [total, sales] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true },
      }),
    ]);

    return {
      items: sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  async generatePdf(id: string, storeId: string) {
    const sale = await this.findOne(id, storeId);

    let clientName = 'Cliente general';
    if (sale.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: sale.clientId },
      });
      clientName = client?.name ?? 'Cliente general';
    }

    const imageDataCaches = new Map<string, string | null>();
    for (const item of sale.items) {
      if (item.productId == null) {
        imageDataCaches.set(`${item.fuente}:${item.productId}`, null);
        continue;
      }
      const key = `${item.fuente}:${item.productId}`;
      try {
        const product = await this.venta.findSellable(
          item.fuente ?? undefined,
          item.productId,
        );
        const imagen = product?.imagenesDescargadas?.[0];
        if (!product || !imagen) {
          imageDataCaches.set(key, null);
          continue;
        }
        const { body } = await this.files.getObject(imagen.key);
        let imageBuffer = body;
        try {
          imageBuffer = await sharp(body)
            .resize({ width: 144 })
            .png()
            .toBuffer();
        } catch {
          // si la conversión falla, se usa el buffer original
        }
        imageDataCaches.set(
          key,
          `data:image/png;base64,${imageBuffer.toString('base64')}`,
        );
      } catch {
        imageDataCaches.set(key, null);
      }
    }

    const pdfBuffer = await this.pdf.generateSalePdf({
      number: sale.number,
      clientId: sale.clientId,
      clientName,
      createdBy: sale.createdBy,
      items: sale.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        originalPrice: item.unitPrice,
        subtotal: item.subtotal,
        imageDataUri:
          imageDataCaches.get(`${item.fuente}:${item.productId}`) ?? null,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      createdAt: sale.createdAt,
    });

    const key = `pdfs/sales/${sale.number}.pdf`;
    await this.files.uploadObject(key, pdfBuffer, 'application/pdf');

    return { key, saleNumber: sale.number };
  }

  async getSalePdf(
    id: string,
    storeId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const sale = await this.findOne(id, storeId);
    const key = `pdfs/sales/${sale.number}.pdf`;
    return this.pdf.getQuotePdfBuffer(key);
  }

  private precioVentaDe(d: {
    precioOferta?: number | null;
    precioRegular?: number | null;
    precioMetro?: number | null;
    unidad?: string | null;
  }): number | null {
    // Producto vendido por metro (cable/rollo): el precio es por metro.
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
}
