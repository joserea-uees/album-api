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
  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @Matches(/\S/, { message: 'El título no puede contener solo espacios' })
  @MaxLength(100, { message: 'El título no debe superar los 100 caracteres' })
  titulo: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  descripcion?: string | null;

  @IsOptional()
  @IsString({ message: 'El fotógrafo debe ser un texto' })
  fotografo?: string | null;

  @IsNumber({}, { message: 'La calificación debe ser un número' })
  @Min(0, { message: 'La calificación debe ser al menos 0' })
  @Max(5, { message: 'La calificación no debe superar 5' })
  calificacion: number;

  @IsUrl({}, { message: 'La ruta debe ser una URL válida' })
  ruta: string;

  @IsOptional()
  @IsInt({ message: 'El ID del álbum debe ser un entero' })
  @Min(1, { message: 'El ID del álbum debe ser mayor que 0' })
  albumId?: number | null;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((texto: unknown) =>
          typeof texto === 'string' ? texto.trim().toLowerCase() : texto,
        )
      : value,
  )
  @IsArray({ message: 'Las etiquetas deben ser un arreglo' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto' })
  @IsNotEmpty({ each: true, message: 'Las etiquetas no pueden estar vacías' })
  @MaxLength(30, {
    each: true,
    message: 'Cada etiqueta debe tener como máximo 30 caracteres',
  })
  etiquetas?: string[];
}
