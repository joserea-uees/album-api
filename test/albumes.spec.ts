import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { createValidationPipe } from '../dist/common/validation.pipe.js';
import { CreateAlbumDto } from '../dist/albumes/dto/create-album.dto.js';
import { UpdateAlbumDto } from '../dist/albumes/dto/update-album.dto.js';

const pipe = createValidationPipe();

describe('DTOs de álbumes', () => {
  it('recorta el nombre antes de validarlo', async () => {
    await expect(
      pipe.transform(
        { nombre: '  Viajes  ' },
        { type: 'body', metatype: CreateAlbumDto },
      ),
    ).resolves.toMatchObject({ nombre: 'Viajes' });
  });

  it.each([
    {},
    { nombre: '' },
    { nombre: '   ' },
    { nombre: null },
    { nombre: 12 },
    { nombre: 'x'.repeat(81) },
  ])('rechaza un nombre inválido: %j', async (body) => {
    await expect(
      pipe.transform(body, { type: 'body', metatype: CreateAlbumDto }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('permite PATCH vacío y rechaza null', async () => {
    await expect(
      pipe.transform({}, { type: 'body', metatype: UpdateAlbumDto }),
    ).resolves.toBeInstanceOf(UpdateAlbumDto);
    await expect(
      pipe.transform(
        { nombre: null },
        { type: 'body', metatype: UpdateAlbumDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('devuelve los mensajes de campo obligatorio y extra en español', async () => {
    try {
      await pipe.transform(
        { nombre: '', hack: 1 },
        { type: 'body', metatype: CreateAlbumDto },
      );
      expect.fail('Debió rechazar el cuerpo');
    } catch (error) {
      const response = (
        error as { getResponse(): { message: string[] } }
      ).getResponse();
      expect(response.message).toEqual(
        expect.arrayContaining([
          'El nombre del álbum es obligatorio',
          'El campo hack no está permitido',
        ]),
      );
    }
  });
});
