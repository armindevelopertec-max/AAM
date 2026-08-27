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
  CatalogoProduct,
  CatalogoProductDocument,
} from '../mongo/schemas/catalogo-product.schema';
import { FilesService } from '../files/files.service';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class CatalogoService {
  private readonly logger = new Logger(CatalogoService.name);

  constructor(
    @InjectModel(CatalogoProduct.name)
    private readonly catalogoModel: Model<CatalogoProductDocument>,
    private readonly files: FilesService,
  ) {}

  async importFromJson(jsonPath: string) {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(raw) as {
      catalogo: {
        nombre: string;
        fecha_fuente: string;
        paginas: number;
        moneda_predeterminada: string;
        nota: string;
      };
      productos: Array<{
        id: number;
        nombre: string | null;
        descripcion: string | null;
        marca: string | null;
        modelo: string | null;
        categoria: string | null;
        canales: number | null;
        precio: number | null;
        moneda: string | null;
        imagenes?: Array<{ key: string; url: string; originalName: string }>;
        fuente?: {
          pagina: number;
          imagen: string | null;
          archivo_ocr: string | null;
          indice_en_pagina: number;
        };
        ocr?: { texto_original: string | null; fila_original: number };
      }>;
    };

    let imported = 0;
    let skipped = 0;

    for (const prod of data.productos) {
      const existing = await this.catalogoModel.findOne({
        catalogoId: prod.id,
      });
      if (existing) {
        skipped++;
        continue;
      }

      await this.catalogoModel.create({
        catalogoId: prod.id,
        nombre: prod.nombre,
        descripcion: prod.descripcion,
        marca: prod.marca,
        modelo: prod.modelo,
        categoria: prod.categoria,
        canales: prod.canales,
        precio: prod.precio,
        moneda: prod.moneda,
        imagenes: prod.imagenes ?? [],
        fuente: prod.fuente ?? null,
        ocr: prod.ocr ?? null,
      });
      imported++;
    }

    return { imported, skipped, total: data.productos.length };
  }

  async getCatalogo(query: {
    buscar?: string;
    marca?: string;
    categoria?: string;
    page?: string;
    limit?: string;
  }) {
    const filter: Record<string, unknown> = {};

    if (query.buscar) {
      filter.$or = [
        { nombre: { $regex: query.buscar, $options: 'i' } },
        { modelo: { $regex: query.buscar, $options: 'i' } },
        { marca: { $regex: query.buscar, $options: 'i' } },
      ];
    }
    if (query.marca) filter.marca = query.marca;
    if (query.categoria) filter.categoria = query.categoria;

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.catalogoModel
        .find(filter)
        .sort({ catalogoId: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.catalogoModel.countDocuments(filter),
    ]);

    const decorated = await Promise.all(
      items.map((item) => this.decorateProducto(item)),
    );

    return {
      catalogo: {
        nombre: 'Catálogo CCTV',
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      productos: decorated,
    };
  }

  async updateProducto(id: number, patch: UpdateProductoDto) {
    const product = await this.catalogoModel.findOne({ catalogoId: id });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    const hasTipo =
      patch.precioVentaTipo === 'fijo' ||
      patch.precioVentaTipo === 'porcentaje';
    const hasValor = typeof patch.precioVentaValor === 'number';
    if (hasTipo !== hasValor) {
      throw new BadRequestException(
        'El tipo de venta y su valor deben guardarse juntos',
      );
    }
    if (
      patch.precioVentaTipo === 'porcentaje' &&
      typeof patch.precio !== 'number' &&
      typeof product.precio !== 'number'
    ) {
      throw new BadRequestException(
        'Para calcular una venta por porcentaje necesitas un precio de compra',
      );
    }

    Object.assign(product, patch);
    await product.save();
    return this.decorateProducto(product.toObject());
  }

  async uploadImagenes(id: number, files: Express.Multer.File[]) {
    if (files.length === 0) {
      throw new BadRequestException('Debes enviar al menos un archivo');
    }

    const product = await this.catalogoModel.findOne({ catalogoId: id });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    const uploadedImages: Array<{
      key: string;
      url: string;
      originalName: string;
    }> = [];
    const uploadedKeys: string[] = [];

    try {
      for (const file of files) {
        const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
        const key = `catalogo/${product.catalogoId}/${randomUUID()}.${ext}`;
        await this.files.uploadObject(key, file.buffer, file.mimetype);
        uploadedKeys.push(key);
        uploadedImages.push({
          key,
          url: `minio://${key}`,
          originalName: file.originalname,
        });
      }
    } catch (err) {
      for (const key of uploadedKeys) {
        try {
          await this.files.deleteObject(key);
        } catch {
          // best-effort cleanup
        }
      }
      throw err;
    }

    product.imagenes = [...(product.imagenes ?? []), ...uploadedImages];
    await product.save();
    return this.decorateProducto(product.toObject());
  }

  async removeImagen(id: number, key: string) {
    const product = await this.catalogoModel.findOne({ catalogoId: id });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    const images = product.imagenes ?? [];
    const nextImages = images.filter((img) => img.key !== key);
    if (nextImages.length === images.length) {
      throw new NotFoundException(
        `Imagen ${key} no encontrada en el producto ${id}`,
      );
    }

    try {
      await this.files.deleteObject(key);
    } catch {
      // object may not exist
    }

    product.imagenes = nextImages;
    await product.save();
    return this.decorateProducto(product.toObject());
  }

  async removeProducto(id: number) {
    const product = await this.catalogoModel.findOne({ catalogoId: id });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    for (const img of product.imagenes ?? []) {
      try {
        await this.files.deleteObject(img.key);
      } catch {
        // best-effort cleanup
      }
    }

    await this.catalogoModel.deleteOne({ catalogoId: id });
  }

  private calculatePrecioVenta(producto: {
    precioVentaTipo?: string | null;
    precioVentaValor?: number | null;
    precio?: number | null;
  }): number | null {
    if (typeof producto.precioVentaValor !== 'number') return null;
    if (producto.precioVentaTipo === 'fijo') {
      return (
        Math.round((producto.precioVentaValor + Number.EPSILON) * 100) / 100
      );
    }
    if (producto.precioVentaTipo === 'porcentaje') {
      if (typeof producto.precio !== 'number') return null;
      return (
        Math.round(
          (producto.precio * (1 + producto.precioVentaValor / 100) +
            Number.EPSILON) *
            100,
        ) / 100
      );
    }
    return null;
  }

  private async decorateProducto(
    producto: CatalogoProductDocument | Record<string, unknown>,
  ) {
    const obj =
      typeof (producto as CatalogoProductDocument).toObject === 'function'
        ? (producto as CatalogoProductDocument).toObject()
        : (producto as Record<string, unknown>);
    const imagenes = await Promise.all(
      (
        (obj.imagenes as Array<{
          key: string;
          url: string;
          originalName: string;
        }>) ?? []
      ).map(async (img) => {
        try {
          return { ...img, accessUrl: await this.files.getSignedUrl(img.key) };
        } catch {
          return { ...img, accessUrl: img.url };
        }
      }),
    );

    return {
      ...obj,
      precioVenta: this.calculatePrecioVenta(obj),
      imagenes,
      imagenUrl: imagenes[0]?.accessUrl ?? null,
    };
  }
}
