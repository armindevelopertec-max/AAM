import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PatchProductoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  nombre?: string;
}
