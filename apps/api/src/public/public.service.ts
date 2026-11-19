import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { KitsService } from '../kits/kits.service';

export interface PublicStoreInfo {
  name: string;
  currency: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  subtitle?: string;
}

export interface ContactFormInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
  type: 'instalacion' | 'cotizacion' | 'otro';
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    private readonly kitsService: KitsService,
  ) {}

  async getStoreInfo(): Promise<PublicStoreInfo> {
    const store = await this.prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        currency: true,
      },
    });

    if (!store) {
      return {
        name: 'SEGTECAM',
        currency: 'BOB',
      };
    }

    return {
      name: store.name,
      currency: store.currency,
      phone: process.env.STORE_PHONE,
      email: process.env.STORE_EMAIL,
      address: process.env.STORE_ADDRESS,
      description: process.env.STORE_DESCRIPTION,
      subtitle: process.env.STORE_SUBTITLE,
    };
  }

  async getPublicKits() {
    return this.kitsService.findAllPublic();
  }

  async getPublicKit(id: string) {
    const store = await this.prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!store) {
      return null;
    }

    return this.kitsService.findOne(id, store.id);
  }

  async submitContactForm(input: ContactFormInput): Promise<{ success: boolean; message: string }> {
    // TODO: Implementar envío de email o guardado en BD
    console.log('Nuevo contacto:', input);
    
    return {
      success: true,
      message: 'Gracias por contactarnos. Te responderemos a la brevedad.',
    };
  }
}