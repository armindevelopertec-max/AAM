import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ScrapedProduct,
  ScrapedProductDocument,
} from '../mongo/schemas/scraped-product.schema';

export interface VentaProducto {
  id: number;
  fuente: string;
  nombre: string;
  sku: string;
  marca: string;
  categoria: string;
  precioVenta: number | null;
  precioRegular: number | null;
  moneda: string;
  stock: number | null;
  enStock: boolean;
  imagenUrl: string | null;
  unidad: string | null;
  metros: number | null;
  precioMetro: number | null;
}

@Injectable()
export class VentaService {
  constructor(
    @InjectModel(ScrapedProduct.name)
    private readonly model: Model<ScrapedProductDocument>,
  ) {}

  async list(query: {
    buscar?: string;
    fuente?: string;
    categoria?: string;
    conStock?: string;
    page?: string;
    limit?: string;
  }) {
    const filter: Record<string, unknown> = {
      descartado: { $ne: true },
    };
    if (query.conStock === 'true') {
      filter['datosCrudos.stockCantidad'] = { $type: 'number', $gt: 0 };
    }
    if (query.buscar) {
      filter.$or = [
        { 'datosCrudos.nombre': { $regex: query.buscar, $options: 'i' } },
        { 'datosCrudos.sku': { $regex: query.buscar, $options: 'i' } },
        { 'datosCrudos.marca': { $regex: query.buscar, $options: 'i' } },
      ];
    }
    if (query.fuente) filter.fuente = query.fuente;
    if (query.categoria) filter.categoriaScrape = query.categoria;

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(query.limit ?? '100', 10)),
    );
    const skip = (page - 1) * limit;

    const [items, total, categorias] = await Promise.all([
      this.model
        .find(filter)
        .sort({
          'datosCrudos.enStock': -1,
          fuente: 1,
          'datosCrudos.idExterno': 1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
      this.model.distinct('categoriaScrape', { descartado: { $ne: true } }),
    ]);

    return {
      products: items.map((item) => this.proyectar(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categorias,
    };
  }

  async findSellable(fuente: string | undefined, idExterno: number) {
    const filter: Record<string, unknown> = {
      'datosCrudos.idExterno': idExterno,
      descartado: { $ne: true },
    };
    if (fuente) filter.fuente = fuente;
    return this.model.findOne(filter).lean();
  }

  async findSellableOrThrow(fuente: string | undefined, idExterno: number) {
    const doc = await this.findSellable(fuente, idExterno);
    if (!doc) {
      throw new NotFoundException(
        `Producto ${fuente ? `${fuente}:` : ''}${idExterno} no encontrado en el catálogo`,
      );
    }
    return doc;
  }

  async getImageUrl(fuente: string | undefined, idExterno: number) {
    const product = await this.findSellable(fuente, idExterno);
    const imagen = product?.imagenesDescargadas?.[0];
    if (!product || !imagen) {
      return { imageUrl: null };
    }
    return { imageUrl: `/scraping/images/${encodeURIComponent(imagen.key)}` };
  }

  /** Resta stock del catálogo maestro de forma atómica. */
  async decrementStock(
    fuente: string,
    idExterno: number,
    quantity: number,
  ): Promise<boolean> {
    const res = await (
      this.model.findOneAndUpdate as unknown as (
        filter: Record<string, unknown>,
        update: Record<string, unknown>[],
        options: Record<string, unknown>,
      ) => Promise<unknown>
    )(
      {
        fuente,
        'datosCrudos.idExterno': idExterno,
        'datosCrudos.stockCantidad': { $type: 'number', $gte: quantity },
      },
      [
        {
          $set: {
            'datosCrudos.stockCantidad': {
              $subtract: ['$datosCrudos.stockCantidad', quantity],
            },
            'datosCrudos.enStock': {
              $gt: [{ $subtract: ['$datosCrudos.stockCantidad', quantity] }, 0],
            },
          },
        },
      ],
      { updatePipeline: true },
    );
    return res != null;
  }

  private proyectar(
    doc: ScrapedProductDocument | Record<string, unknown>,
  ): VentaProducto {
    const d = (doc as Record<string, unknown>).datosCrudos as Record<
      string,
      unknown
    >;
    const precioOferta = d.precioOferta as number | null | undefined;
    const precioRegular = d.precioRegular as number | null | undefined;
    const stockCantidad = d.stockCantidad as number | null | undefined;
    const unidad = (d.unidad as string | null | undefined) ?? null;
    const metros = (d.metros as number | null | undefined) ?? null;
    const precioMetro = (d.precioMetro as number | null | undefined) ?? null;

    // Producto vendido por metro (cable/rollo): el precio de venta es por metro.
    const esPorMetro =
      unidad === 'metro' && typeof precioMetro === 'number' && precioMetro > 0;

    const precioVenta = esPorMetro
      ? precioMetro
      : typeof precioOferta === 'number' && precioOferta > 0
        ? precioOferta
        : typeof precioRegular === 'number'
          ? precioRegular
          : null;

    const precioRegularFinal = esPorMetro
      ? precioMetro
      : typeof precioRegular === 'number'
        ? precioRegular
        : null;

    const imagenes = (doc as Record<string, unknown>).imagenesDescargadas as
      Array<{ key: string }> | null | undefined;
    const primera = imagenes?.[0];

    return {
      id: d.idExterno as number,
      fuente: doc.fuente as string,
      nombre: (d.nombre as string) ?? '',
      sku: (d.sku as string) ?? '',
      marca: (d.marca as string) ?? '',
      categoria: (doc as Record<string, unknown>).categoriaScrape as string,
      precioVenta,
      precioRegular: precioRegularFinal,
      moneda: (d.moneda as string) ?? 'BOB',
      stock: typeof stockCantidad === 'number' ? stockCantidad : null,
      enStock:
        typeof stockCantidad === 'number'
          ? stockCantidad > 0
          : (d.enStock as boolean),
      imagenUrl: primera
        ? `/scraping/images/${encodeURIComponent(primera.key)}`
        : null,
      unidad,
      metros,
      precioMetro: esPorMetro ? precioMetro : null,
    };
  }
}
