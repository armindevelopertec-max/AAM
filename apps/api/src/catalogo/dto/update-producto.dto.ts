import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CatalogoEditableFields {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  canales?: number | null;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  precio?: number | null;

  @IsOptional()
  @IsIn(['fijo', 'porcentaje'])
  precioVentaTipo?: 'fijo' | 'porcentaje' | null;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  precioVentaValor?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string | null;
}

import { PartialType } from '@nestjs/mapped-types';

export class UpdateProductoDto extends PartialType(CatalogoEditableFields) {}
