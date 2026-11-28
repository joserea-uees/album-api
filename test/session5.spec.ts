import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { Repository } from 'typeorm';
import { CreateFotoDto } from '../dist/fotos/dto/create-foto.dto.js';
import { UpdateFotoDto } from '../dist/fotos/dto/update-foto.dto.js';
import { QueryFotosDto } from '../dist/fotos/dto/query-fotos.dto.js';
import { FotosService } from '../dist/fotos/fotos.service.js';
import { Foto } from '../dist/fotos/entities/foto.entity.js';
import { Etiqueta } from '../dist/fotos/entities/etiqueta.entity.js';
import { TypeOrmExceptionFilter } from '../dist/common/typeorm-exception.filter.js';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const valid = {
  titulo: 'Cerro Santa Ana',
  calificacion: 4.8,
  ruta: 'https://picsum.photos/id/1/600/400',
};

describe('DTOs de fotos', () => {
  it('convierte la query y conserva filtros del reto anterior', async () => {
    const dto = await pipe.transform(
      { min: '3', limit: '5', etiqueta: 'playa', orden: 'desc' },
      { type: 'query', metatype: QueryFotosDto },
    );
    expect(dto).toMatchObject({
      min: 3,
      max: 5,
      page: 1,
      limit: 5,
      etiqueta: 'playa',
      orden: 'desc',
    });
  });

  it.each([
    { limit: '999' },
    { min: 'abc' },
    { page: '0' },
    { orden: 'otro' },
    { hack: '1' },
  ])('rechaza query inválida: %j', async (query) => {
    await expect(
      pipe.transform(query, { type: 'query', metatype: QueryFotosDto }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('devuelve una lista de errores para el cuerpo inválido del PDF', async () => {
    try {
      await pipe.transform(
        { titulo: '', calificacion: 9, ruta: 'no-url', hack: 1 },
        { type: 'body', metatype: CreateFotoDto },
      );
      expect.fail('Debió rechazar el cuerpo');
    } catch (error) {
      const response = (
        error as { getResponse(): { message: string[] } }
      ).getResponse();
      expect(response.message).toEqual(
        expect.arrayContaining([
          'property hack should not exist',
          'titulo should not be empty',
          'calificacion must not be greater than 5',
          'ruta must be a URL address',
        ]),
      );
    }
  });

  it('normaliza las etiquetas antes de validarlas', async () => {
    const dto = await pipe.transform(
      { ...valid, etiquetas: [' Ciudad ', 'FARO'] },
      { type: 'body', metatype: CreateFotoDto },
    );
    expect(dto.etiquetas).toEqual(['ciudad', 'faro']);
  });

  it.each([
    { etiquetas: [' '] },
    { etiquetas: ['x'.repeat(31)] },
    { etiquetas: [123] },
    { etiquetas: null },
  ])('rechaza etiquetas inválidas: %j', async ({ etiquetas }) => {
    await expect(
      pipe.transform(
        { ...valid, etiquetas },
        { type: 'body', metatype: CreateFotoDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('permite PATCH parcial, quitar álbum y vaciar etiquetas', async () => {
    await expect(
      pipe.transform(
        { calificacion: 2.5 },
        { type: 'body', metatype: UpdateFotoDto },
      ),
    ).resolves.toMatchObject({ calificacion: 2.5 });
    await expect(
      pipe.transform(
        { albumId: null, etiquetas: [] },
        { type: 'body', metatype: UpdateFotoDto },
      ),
    ).resolves.toMatchObject({ albumId: null, etiquetas: [] });
  });

  it.each(['titulo', 'calificacion', 'ruta', 'etiquetas'])(
    'rechaza null en %s al editar',
    async (field) => {
      await expect(
        pipe.transform(
          { [field]: null },
          { type: 'body', metatype: UpdateFotoDto },
        ),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
});

describe('CRUD con relaciones', () => {
  function setup() {
    const foto = {
      id: 21,
      ...valid,
      album: { id: 2 },
      etiquetas: [{ id: 1, texto: 'ciudad' }],
    } as Foto;
    const fotos = {
      create: vi.fn((datos) => ({ id: 21, ...datos })),
      save: vi.fn(async (datos) => datos),
      findOne: vi.fn(async () => foto),
      remove: vi.fn(async () => foto),
    };
    const etiquetas = {
      findBy: vi.fn(async () => [{ id: 1, texto: 'ciudad' }]),
      create: vi.fn((datos) => datos),
      save: vi.fn(async (datos) =>
        datos.map((item: object, i: number) => ({ id: i + 2, ...item })),
      ),
    };
    const service = new FotosService(
      fotos as unknown as Repository<Foto>,
      etiquetas as unknown as Repository<Etiqueta>,
    );
    return { foto, fotos, etiquetas, service };
  }

  it('reutiliza etiquetas, crea solo las nuevas y devuelve relaciones', async () => {
    const { service, fotos, etiquetas } = setup();
    await service.create({
      ...valid,
      albumId: 2,
      etiquetas: [' Ciudad ', 'faro', 'CIUDAD'],
    });
    expect(etiquetas.save).toHaveBeenCalledWith([{ texto: 'faro' }]);
    expect(fotos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        album: { id: 2 },
        etiquetas: [
          { id: 1, texto: 'ciudad' },
          { id: 2, texto: 'faro' },
        ],
      }),
    );
    expect(fotos.findOne).toHaveBeenCalledWith({
      where: { id: 21 },
      relations: { album: true, etiquetas: true },
    });
  });

  it('PATCH conserva relaciones omitidas y puede vaciarlas explícitamente', async () => {
    const { service, foto, etiquetas } = setup();
    await service.update(21, { calificacion: 2.5 });
    expect(foto).toMatchObject({
      calificacion: 2.5,
      album: { id: 2 },
      etiquetas: [{ texto: 'ciudad' }],
    });
    expect(etiquetas.findBy).not.toHaveBeenCalled();
    await service.update(21, { albumId: null, etiquetas: [] });
    expect(foto.album).toBeNull();
    expect(foto.etiquetas).toEqual([]);
  });

  it('devuelve 404 antes de modificar o eliminar una foto inexistente', async () => {
    const { service, fotos } = setup();
    fotos.findOne.mockResolvedValue(null as unknown as Foto);
    await expect(service.update(99, { calificacion: 2 })).rejects.toMatchObject(
      { status: 404 },
    );
    await expect(service.remove(99)).rejects.toMatchObject({ status: 404 });
    expect(fotos.save).not.toHaveBeenCalled();
    expect(fotos.remove).not.toHaveBeenCalled();
  });

  it('espera la eliminación de la foto', async () => {
    const { service, fotos, foto } = setup();
    await expect(service.remove(21)).resolves.toBeUndefined();
    expect(fotos.remove).toHaveBeenCalledWith(foto);
  });
});

describe('errores PostgreSQL', () => {
  it.each([
    ['23505', 409],
    ['23503', 400],
    ['XX000', 500],
  ])('traduce %s a %s', (code, status) => {
    const json = vi.fn();
    const response = { status: vi.fn().mockReturnValue({ json }) };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    const error = new QueryFailedError(
      'SQL privado',
      [],
      Object.assign(new Error('driver'), { code, detail: 'detalle' }),
    );
    new TypeOrmExceptionFilter().catch(error, host);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: status }),
    );
    if (status === 500)
      expect(json.mock.calls[0][0]).not.toHaveProperty('detalle');
  });
});
