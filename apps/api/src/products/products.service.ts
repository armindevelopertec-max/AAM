import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface ProductWithImage extends Product {
  imageUrl: string | null;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    storeId: number,
  ): Promise<ProductWithImage> {
    const product = await this.prisma.product.create({
      data: {
        storeId,
        name: createProductDto.name,
        sku:
          createProductDto.sku ??
          `SKU-${randomUUID().slice(0, 8).toUpperCase()}`,
        category: createProductDto.category ?? 'General',
        costPrice: createProductDto.costPrice ?? createProductDto.price,
        regularPrice: createProductDto.regularPrice ?? createProductDto.price,
        price: createProductDto.price,
        stock: createProductDto.stock ?? 0,
      },
    });

    return this.toDto(product);
  }

  async findAll(
    storeId: number,
    q?: string,
    category?: string,
  ): Promise<ProductWithImage[]> {
    const products = await this.prisma.product.findMany({
      where: {
        storeId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(category
          ? { category: { equals: category, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { id: 'asc' },
    });

    return Promise.all(products.map((product) => this.toDto(product)));
  }

  async findOne(id: number, storeId: number): Promise<ProductWithImage> {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
    });
    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return this.toDto(product);
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    storeId: number,
  ): Promise<ProductWithImage> {
    const product = await this.prisma.product.updateMany({
      where: { id, storeId },
      data: updateProductDto,
    });
    if (product.count === 0) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return this.findOne(id, storeId);
  }

  async remove(id: number, storeId: number): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
    });
    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          `El producto ${id} tiene ventas o cotizaciones asociadas y no puede eliminarse`,
        );
      }
      throw err;
    }
  }

  async adjustStock(
    id: number,
    adjustment: number,
    storeId: number,
  ): Promise<ProductWithImage> {
    if (!Number.isInteger(adjustment) || adjustment === 0) {
      throw new BadRequestException(
        'El ajuste de stock debe ser un entero distinto de cero',
      );
    }

    if (adjustment < 0) {
      const result = await this.prisma.product.updateMany({
        where: { id, storeId, stock: { gte: -adjustment } },
        data: { stock: { increment: adjustment } },
      });
      if (result.count === 0) {
        const product = await this.prisma.product.findFirst({
          where: { id, storeId },
        });
        if (!product) {
          throw new NotFoundException(`Producto ${id} no encontrado`);
        }
        throw new BadRequestException(
          `Stock insuficiente para ${product.name}: disponible ${product.stock}, solicitado ${-adjustment}`,
        );
      }
    } else {
      await this.prisma.product.updateMany({
        where: { id, storeId },
        data: { stock: { increment: adjustment } },
      });
    }

    return this.findOne(id, storeId);
  }

  async uploadImage(
    id: number,
    storeId: number,
    file: Express.Multer.File,
  ): Promise<ProductWithImage> {
    const product = await this.findOne(id, storeId);
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
    const key = `productos/${product.id}/${randomUUID()}.${ext}`;

    await this.files.uploadObject(key, file.buffer, file.mimetype);

    if (product.imageKey) {
      try {
        await this.files.deleteObject(product.imageKey);
      } catch {
        // imagen anterior inexistente en el bucket, se ignora
      }
    }

    await this.prisma.product.update({
      where: { id },
      data: { imageKey: key },
    });

    return this.findOne(id, storeId);
  }

  async getImageKey(id: number): Promise<string | null> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    return product?.imageKey ?? null;
  }

  private async toDto(product: Product): Promise<ProductWithImage> {
    const imageUrl = product.imageKey ? `/products/${product.id}/image` : null;
    return { ...product, imageUrl };
  }
}
