import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ScrapedProductItemDto {
  @IsNumber()
  id!: number;

  @IsOptional()
  @IsString()
  url?: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  sku!: string;

  @IsNumber()
  precio_regular!: number;

  @IsNumber()
  precio_oferta!: number;

  @IsOptional()
  @IsNumber()
  precio_metro?: number;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsNumber()
  metros?: number;

  @IsString()
  moneda!: string;

  en_stock!: boolean;

  @IsNumber()
  stock_cantidad!: number;

  @IsString()
  stock_texto!: string;

  @IsString()
  marca!: string;

  @IsArray()
  categorias!: string[];

  @IsArray()
  tags!: string[];

  @IsString()
  descripcion_corta!: string;

  @IsString()
  descripcion_larga!: string;

  @IsArray()
  imagenes!: string[];
}

export class SaveScrapedProductsDto {
  @IsString()
  @IsNotEmpty()
  fuente!: string;

  @IsString()
  @IsNotEmpty()
  categoria!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ScrapedProductItemDto)
  productos!: ScrapedProductItemDto[];
}
