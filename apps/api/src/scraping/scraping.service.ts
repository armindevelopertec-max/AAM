import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import {
  ScrapedProduct,
  ScrapedProductDocument,
} from '../mongo/schemas/scraped-product.schema';
import {
  ScrapingRun,
  ScrapingRunDocument,
} from '../mongo/schemas/scraping-run.schema';
import { FilesService } from '../files/files.service';
import { ImportToPostgresDto } from './dto/import-to-postgres.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(
    @InjectModel(ScrapedProduct.name)
    private readonly scrapedProductModel: Model<ScrapedProductDocument>,
    @InjectModel(ScrapingRun.name)
    private readonly scrapingRunModel: Model<ScrapingRunDocument>,
    private readonly files: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  async saveScrapedProducts(input: {
    fuente: string;
    categoria: string;
    productos: Array<{
      id: number;
      url?: string;
      nombre: string;
      sku: string;
      precio_regular: number;
      precio_oferta: number;
      precio_metro?: number;
      unidad?: string;
      metros?: number;
      moneda: string;
      en_stock: boolean;
      stock_cantidad: number;
      stock_texto: string;
      marca: string;
      categorias: string[];
      tags: string[];
      descripcion_corta: string;
      descripcion_larga: string;
      imagenes: string[];
    }>;
  }) {
    const run = await this.scrapingRunModel.create({
      fuente: input.fuente,
      categoria: input.categoria,
      status: 'running',
      totalEncontrados: input.productos.length,
    });

    let nuevosGuardados = 0;
    let imagenesDescargadas = 0;

    for (const prod of input.productos) {
      const existing = await this.scrapedProductModel.findOne({
        'datosCrudos.idExterno': prod.id,
        fuente: input.fuente,
      });

      const historialEntry = {
        fecha: new Date(),
        precioRegular: prod.precio_regular,
        precioOferta: prod.precio_oferta,
      };

      if (existing) {
        existing.datosCrudos = {
          idExterno: prod.id,
          nombre: prod.nombre,
          sku: prod.sku,
          precioRegular: prod.precio_regular,
          precioOferta: prod.precio_oferta,
          precioMetro: prod.precio_metro,
          unidad: prod.unidad,
          metros: prod.metros,
          moneda: prod.moneda,
          enStock: prod.en_stock,
          stockCantidad: prod.stock_cantidad,
          stockTexto: prod.stock_texto,
          marca: prod.marca,
          categorias: prod.categorias,
          tags: prod.tags,
          descripcionCorta: prod.descripcion_corta,
          descripcionLarga: prod.descripcion_larga,
        };
        existing.fechaScrape = new Date();
        existing.historialPrecios.push(historialEntry);
        await existing.save();
      } else {
        const downloadedImages = await this.downloadImages(
          prod.imagenes,
          input.fuente,
          prod.sku,
        );
        imagenesDescargadas += downloadedImages.length;

        await this.scrapedProductModel.create({
          fuente: input.fuente,
          categoriaScrape: input.categoria,
          fechaScrape: new Date(),
          urlOriginal: prod.url ?? '',
          datosCrudos: {
            idExterno: prod.id,
            nombre: prod.nombre,
            sku: prod.sku,
            precioRegular: prod.precio_regular,
            precioOferta: prod.precio_oferta,
            precioMetro: prod.precio_metro,
            unidad: prod.unidad,
            metros: prod.metros,
            moneda: prod.moneda,
            enStock: prod.en_stock,
            stockCantidad: prod.stock_cantidad,
            stockTexto: prod.stock_texto,
            marca: prod.marca,
            categorias: prod.categorias,
            tags: prod.tags,
            descripcionCorta: prod.descripcion_corta,
            descripcionLarga: prod.descripcion_larga,
          },
          imagenesDescargadas: downloadedImages,
          historialPrecios: [historialEntry],
        });
        nuevosGuardados++;
      }
    }

    await this.scrapingRunModel.findByIdAndUpdate(run._id, {
      status: 'completed',
      nuevosGuardados,
      imagenesDescargadas,
      finEn: new Date(),
    });

    return {
      runId: run.id,
      totalEncontrados: input.productos.length,
      nuevosGuardados,
      imagenesDescargadas,
    };
  }

  private async downloadImages(
    urls: string[],
    fuente: string,
    sku: string,
  ): Promise<{ key: string; originalUrl: string }[]> {
    const results: { key: string; originalUrl: string }[] = [];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const contentType = res.headers.get('content-type') ?? 'image/jpeg';
        const buffer = Buffer.from(await res.arrayBuffer());
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const key = `scraping/${fuente}/${sku}/${randomUUID()}.${ext}`;
        await this.files.uploadObject(key, buffer, contentType);
        results.push({ key, originalUrl: url });
      } catch {
        this.logger.warn(`No se pudo descargar imagen: ${url}`);
      }
    }
    return results;
  }

  async findAll(query: {
    fuente?: string;
    categoria?: string;
    importado?: string;
    descartado?: string;
    buscar?: string;
    page?: string;
    limit?: string;
  }) {
    const filter: Record<string, unknown> = {};

    if (query.fuente) filter.fuente = query.fuente;
    if (query.categoria) filter.categoriaScrape = query.categoria;
    if (query.importado === 'true') filter.importadoAPostgres = true;
    if (query.importado === 'false') filter.importadoAPostgres = false;
    if (query.descartado === 'true') filter.descartado = true;
    if (query.descartado === 'false') filter.descartado = false;

    if (query.buscar) {
      filter.$or = [
        { 'datosCrudos.nombre': { $regex: query.buscar, $options: 'i' } },
        { 'datosCrudos.sku': { $regex: query.buscar, $options: 'i' } },
        { 'datosCrudos.marca': { $regex: query.buscar, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.scrapedProductModel
        .find(filter)
        .sort({ fechaScrape: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.scrapedProductModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.scrapedProductModel.findById(id).lean();
    if (!product)
      throw new NotFoundException(`Producto scrapeado ${id} no encontrado`);
    return product;
  }

  async importToPostgres(
    id: string,
    dto: ImportToPostgresDto,
    storeId: number,
  ) {
    const product = await this.scrapedProductModel.findById(id);
    if (!product)
      throw new NotFoundException(`Producto scrapeado ${id} no encontrado`);
    if (product.importadoAPostgres)
      throw new BadRequestException('Ya fue importado');

    const created = await this.prisma.product.create({
      data: {
        storeId,
        name: dto.name ?? product.datosCrudos.nombre,
        sku:
          dto.sku ??
          product.datosCrudos.sku ??
          `SCRAP-${product.datosCrudos.idExterno}`,
        category: dto.category ?? product.categoriaScrape ?? 'General',
        costPrice: dto.costPrice ?? product.datosCrudos.precioRegular ?? 0,
        regularPrice:
          dto.regularPrice ??
          product.datosCrudos.precioRegular ??
          product.datosCrudos.precioOferta ??
          0,
        price:
          dto.price ??
          product.datosCrudos.precioOferta ??
          product.datosCrudos.precioRegular ??
          0,
        stock: dto.stock ?? product.datosCrudos.stockCantidad ?? 0,
        imageKey: product.imagenesDescargadas[0]?.key ?? null,
      },
    });

    product.importadoAPostgres = true;
    product.postgresProductId = created.id;
    await product.save();

    return { postgresProduct: created, scrapedProduct: product };
  }

  async markDiscarded(id: string, descartado: boolean) {
    const product = await this.scrapedProductModel.findByIdAndUpdate(
      id,
      { descartado },
      { new: true },
    );
    if (!product)
      throw new NotFoundException(`Producto scrapeado ${id} no encontrado`);
    return product;
  }

  async addNotes(id: string, notas: string) {
    const product = await this.scrapedProductModel.findByIdAndUpdate(
      id,
      { notas },
      { new: true },
    );
    if (!product)
      throw new NotFoundException(`Producto scrapeado ${id} no encontrado`);
    return product;
  }

  async deleteProduct(id: string) {
    const product = await this.scrapedProductModel.findByIdAndDelete(id);
    if (!product)
      throw new NotFoundException(`Producto scrapeado ${id} no encontrado`);
    for (const img of product.imagenesDescargadas) {
      try {
        await this.files.deleteObject(img.key);
      } catch {
        // best-effort cleanup
      }
    }
  }

  async getRuns() {
    return this.scrapingRunModel.find().sort({ inicioEn: -1 }).limit(50).lean();
  }

  async getStats() {
    const [total, importados, descartados, porFuente] = await Promise.all([
      this.scrapedProductModel.countDocuments(),
      this.scrapedProductModel.countDocuments({ importadoAPostgres: true }),
      this.scrapedProductModel.countDocuments({ descartado: true }),
      this.scrapedProductModel.aggregate([
        { $group: { _id: '$fuente', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      importados,
      descartados,
      pendientes: total - importados - descartados,
      porFuente,
    };
  }
}
