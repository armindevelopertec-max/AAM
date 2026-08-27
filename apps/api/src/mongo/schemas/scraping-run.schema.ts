import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScrapingRunDocument = HydratedDocument<ScrapingRun>;

@Schema({ timestamps: true, collection: 'scraping_runs', _id: true })
export class ScrapingRun {
  @Prop({ type: String, required: true })
  fuente!: string;

  @Prop({ type: String, required: true })
  categoria!: string;

  @Prop({ type: String, required: true })
  status!: 'running' | 'completed' | 'failed';

  @Prop({ type: Number, default: 0 })
  totalEncontrados!: number;

  @Prop({ type: Number, default: 0 })
  nuevosGuardados!: number;

  @Prop({ type: Number, default: 0 })
  imagenesDescargadas!: number;

  @Prop({ type: String, default: '' })
  errorMensaje!: string;

  @Prop({ type: Date, default: Date.now })
  inicioEn!: Date;

  @Prop({ type: Date, default: null })
  finEn!: Date | null;
}

export const ScrapingRunSchema = SchemaFactory.createForClass(ScrapingRun);
ScrapingRunSchema.index({ inicioEn: -1 });
