import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatalogoProductDocument = HydratedDocument<CatalogoProduct>;

@Schema({ timestamps: true, collection: 'catalogo_products' })
export class CatalogoImagenStored {
  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  url!: string;

  @Prop({ type: String, required: true })
  originalName!: string;
}

@Schema({ timestamps: true, collection: 'catalogo_products' })
export class CatalogoProduct {
  @Prop({ type: Number, required: true })
  catalogoId!: number;

  @Prop({ type: String, default: null })
  nombre!: string | null;

  @Prop({ type: String, default: null })
  descripcion!: string | null;

  @Prop({ type: String, default: null })
  marca!: string | null;

  @Prop({ type: String, default: null })
  modelo!: string | null;

  @Prop({ type: String, default: null })
  categoria!: string | null;

  @Prop({ type: Number, default: null })
  canales!: number | null;

  @Prop({ type: Number, default: null })
  precio!: number | null;

  @Prop({ type: String, default: null })
  precioVentaTipo!: string | null;

  @Prop({ type: Number, default: null })
  precioVentaValor!: number | null;

  @Prop({ type: String, default: null })
  moneda!: string | null;

  @Prop({ type: [Object], default: [] })
  imagenes!: CatalogoImagenStored[];

  @Prop({ type: Object, default: null })
  fuente!: {
    pagina: number;
    imagen: string | null;
    archivo_ocr: string | null;
    indice_en_pagina: number;
  } | null;

  @Prop({ type: Object, default: null })
  ocr!: {
    texto_original: string | null;
    fila_original: number;
  } | null;
}

export const CatalogoProductSchema =
  SchemaFactory.createForClass(CatalogoProduct);
CatalogoProductSchema.index({ catalogoId: 1 }, { unique: true });
CatalogoProductSchema.index({ marca: 1, modelo: 1 });
