import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ScrapedProductDocument = HydratedDocument<ScrapedProduct>;

export class ScrapedImage {
  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  originalUrl!: string;
}

@Schema({ timestamps: true, collection: 'scraped_products' })
export class ScrapedProduct {
  @Prop({ type: String, required: true })
  fuente!: string;

  @Prop({ type: String, required: true })
  categoriaScrape!: string;

  @Prop({ type: Date, default: Date.now })
  fechaScrape!: Date;

  @Prop({ type: String, required: true })
  urlOriginal!: string;

  @Prop({ type: Object, required: true })
  datosCrudos!: {
    idExterno: number;
    nombre: string;
    sku: string;
    precioRegular: number;
    precioOferta: number;
    precioMetro?: number;
    unidad?: string;
    metros?: number;
    moneda: string;
    enStock: boolean;
    stockCantidad: number;
    stockTexto: string;
    marca: string;
    categorias: string[];
    tags: string[];
    descripcionCorta: string;
    descripcionLarga: string;
  };

  @Prop({ type: [Object], default: [] })
  imagenesDescargadas!: ScrapedImage[];

  @Prop({ default: false })
  importadoAPostgres!: boolean;

  @Prop({ type: Number, default: null })
  postgresProductId!: number | null;

  @Prop({ type: [Object], default: [] })
  historialPrecios!: {
    fecha: Date;
    precioRegular: number;
    precioOferta: number;
  }[];

  @Prop({ default: false })
  descartado!: boolean;

  @Prop({ default: '' })
  notas!: string;
}

export const ScrapedProductSchema =
  SchemaFactory.createForClass(ScrapedProduct);
ScrapedProductSchema.index({ fuente: 1, categoriaScrape: 1 });
ScrapedProductSchema.index({ 'datosCrudos.sku': 1 });
ScrapedProductSchema.index({ importadoAPostgres: 1, descartado: 1 });
