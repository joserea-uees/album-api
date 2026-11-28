import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryFotosDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'min debe ser un número' })
  @Min(0, { message: 'min debe ser al menos 0' })
  @Max(5, { message: 'min no debe superar 5' })
  min: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'max debe ser un número' })
  @Min(0, { message: 'max debe ser al menos 0' })
  @Max(5, { message: 'max no debe superar 5' })
  max: number = 5;

  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser un texto' })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un entero' })
  @Min(1, { message: 'La página debe ser al menos 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un entero' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(50, { message: 'El límite no debe superar 50' })
  limit: number = 10;

  @IsOptional()
  @IsString({ message: 'La etiqueta debe ser un texto' })
  etiqueta?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'El orden debe ser asc o desc' })
  orden?: string;
}
