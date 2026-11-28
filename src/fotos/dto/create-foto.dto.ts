import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateFotoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @IsOptional()
  @IsString()
  fotografo?: string | null;

  @IsNumber()
  @Min(0)
  @Max(5)
  calificacion: number;

  @IsUrl()
  ruta: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  albumId?: number | null;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((texto: unknown) =>
          typeof texto === 'string' ? texto.trim().toLowerCase() : texto,
        )
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(30, { each: true })
  etiquetas?: string[];
}
