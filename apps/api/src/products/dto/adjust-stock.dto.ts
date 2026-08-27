import { IsInt, IsNotEmpty } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  @IsNotEmpty()
  adjustment!: number;
}
