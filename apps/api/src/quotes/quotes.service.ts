import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PENDING_STATUSES } from './quote-statuses';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly pdfService: PdfService,
  ) {}

  async create(
    createQuoteDto: CreateQuoteDto,
    storeId: number,
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
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, storeId },
      });
      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }

      const unitPrice = item.price ?? product.price;
      const originalPrice = item.originalPrice ?? product.regularPrice ?? product.price;
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;

      items.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
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

  async findAll(storeId: number) {
    const quotes = await this.prisma.quote.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      include: { items: true },
    });
    return quotes.map((quote) => this.withEffectiveStatus(quote));
  }

  async findOne(id: number, storeId: number) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, storeId },
      include: { items: true },
    });
    if (!quote) {
      throw new NotFoundException(`Cotización ${id} no encontrada`);
    }
    return this.withEffectiveStatus(quote);
  }

  async updateStatus(id: number, status: QuoteStatus, storeId: number) {
    const quote = await this.findOne(id, storeId);
    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status },
      include: { items: true },
    });
    return this.withEffectiveStatus(updated);
  }

  async convertToSale(id: number, storeId: number, createdByName?: string) {
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
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
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

  async generatePdf(id: number, storeId: number) {
    const quote = await this.findOne(id, storeId);

    const pdfBuffer = await this.pdfService.generateQuotePdf({
      number: quote.number,
      clientName: quote.clientName,
      createdBy: quote.createdBy,
      items: quote.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        originalPrice: item.originalPrice,
        subtotal: item.subtotal,
      })),
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      validDays: quote.validDays,
      expiresAt: quote.expiresAt,
      createdAt: quote.createdAt,
    });

    const key = await this.pdfService.uploadQuotePdf(quote.number, pdfBuffer);
    const url = await this.pdfService.getQuotePdfUrl(key);

    return { key, url, quoteNumber: quote.number };
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
}
