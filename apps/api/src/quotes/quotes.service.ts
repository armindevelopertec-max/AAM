import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { PdfService } from '../pdf/pdf.service';
import { FilesService } from '../files/files.service';
import { VentaService } from '../venta/venta.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PENDING_STATUSES } from './quote-statuses';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly pdfService: PdfService,
    private readonly files: FilesService,
    private readonly venta: VentaService,
  ) {}

  async create(
    createQuoteDto: CreateQuoteDto,
    storeId: string,
    createdByName?: string,
  ) {
    if (!createQuoteDto.items || createQuoteDto.items.length === 0) {
      throw new BadRequestException(
        'La cotización debe incluir al menos un producto',
      );
    }

    const discount = createQuoteDto.discount ?? 0;
    const validDays = createQuoteDto.validDays ?? 7;

    const items: Prisma.QuoteItemUncheckedCreateWithoutQuoteInput[] = [];
    let subtotal = 0;

    for (const item of createQuoteDto.items) {
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
          originalPrice: unitPrice,
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
      const originalPrice =
        typeof d.precioRegular === 'number' && d.precioRegular > 0
          ? d.precioRegular
          : unitPrice;
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;

      items.push({
        productId: d.idExterno,
        fuente: product.fuente,
        name: d.nombre,
        sku: d.sku,
        quantity: item.quantity,
        unitPrice,
        originalPrice,
        subtotal: lineSubtotal,
      });
    }

    if (discount < 0) {
      throw new BadRequestException(
        'El descuento no puede ser negativo',
      );
    }

    let clientName = 'Cliente general';
    if (createQuoteDto.clientId != null) {
      const client = await this.prisma.client.findFirst({
        where: { id: createQuoteDto.clientId, storeId },
      });
      if (client) {
        clientName = client.name;
      } else if (createQuoteDto.clientName) {
        clientName = createQuoteDto.clientName;
      }
    } else if (createQuoteDto.clientName) {
      clientName = createQuoteDto.clientName;
    }

    const seq = await this.prisma.sequence.upsert({
      where: { storeId_name: { storeId, name: 'quote' } },
      create: { storeId, name: 'quote', value: 1 },
      update: { value: { increment: 1 } },
    });
    const number = `C-${String(seq.value).padStart(4, '0')}`;

    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const quote = await this.prisma.quote.create({
      data: {
        storeId,
        number,
        clientId: createQuoteDto.clientId ?? null,
        clientName,
        createdBy: createdByName ?? null,
        subtotal,
        discount,
        total: subtotal,
        validDays,
        expiresAt,
        items: { create: items },
      },
      include: { items: true },
    });

    return this.withEffectiveStatus(quote);
  }

  async findAll(storeId: string) {
    const quotes = await this.prisma.quote.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      include: { items: true },
    });
    return quotes.map((quote) => this.withEffectiveStatus(quote));
  }

  async findOne(id: string, storeId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, storeId },
      include: { items: true },
    });
    if (!quote) {
      throw new NotFoundException(`Cotización ${id} no encontrada`);
    }
    return this.withEffectiveStatus(quote);
  }

  async updateStatus(id: string, status: QuoteStatus, storeId: string) {
    const quote = await this.findOne(id, storeId);
    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status },
      include: { items: true },
    });
    return this.withEffectiveStatus(updated);
  }

  async convertToSale(id: string, storeId: string, createdByName?: string) {
    const quote = await this.findOne(id, storeId);

    if (
      quote.status === 'aceptada' ||
      quote.status === 'vencida' ||
      quote.status === 'perdida'
    ) {
      throw new BadRequestException(
        `La cotización ${quote.number} no puede convertirse en venta (estado: ${quote.status})`,
      );
    }

    const sale = await this.salesService.create(
      {
        clientId: quote.clientId ?? undefined,
        discount: quote.discount,
        items: quote.items.map((item) => ({
          productId: item.productId ?? undefined,
          fuente: item.fuente ?? undefined,
          quantity: item.quantity,
          ...(item.fuente
            ? {}
            : { precio: item.unitPrice, nombre: item.name, sku: item.sku }),
        })),
      },
      storeId,
      createdByName,
    );

    const updatedQuote = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'aceptada' },
      include: { items: true },
    });

    return { sale, quote: this.withEffectiveStatus(updatedQuote) };
  }

  async generatePdf(id: string, storeId: string) {
    const quote = await this.findOne(id, storeId);

    const imageDataCaches = new Map<string, string | null>();
    for (const item of quote.items) {
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

    const pdfBuffer = await this.pdfService.generateQuotePdf({
      number: quote.number,
      clientId: quote.clientId,
      clientName: quote.clientName,
      createdBy: quote.createdBy,
      items: quote.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        originalPrice: item.originalPrice,
        subtotal: item.subtotal,
        imageDataUri: imageDataCaches.get(`${item.fuente}:${item.productId}`) ?? null,
      })),
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      validDays: quote.validDays,
      expiresAt: quote.expiresAt,
      createdAt: quote.createdAt,
    });

    const key = await this.pdfService.uploadQuotePdf(quote.number, pdfBuffer);

    return { key, quoteNumber: quote.number };
  }

  async getQuotePdf(
    id: string,
    storeId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const quote = await this.findOne(id, storeId);
    const key = `pdfs/quotes/${quote.number}.pdf`;
    return this.pdfService.getQuotePdfBuffer(key);
  }

  private withEffectiveStatus<
    T extends { status: QuoteStatus; expiresAt: Date },
  >(quote: T): T {
    const isPending = PENDING_STATUSES.includes(quote.status);
    if (isPending && quote.expiresAt.getTime() < Date.now()) {
      return { ...quote, status: 'vencida' };
    }
    return quote;
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
