import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { Module } from '@nestjs/common';
import { createValidationPipe } from '../dist/common/validation.pipe.js';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FotosModule } from '../dist/fotos/fotos.module.js';
import { AlbumesModule } from '../dist/albumes/albumes.module.js';
import { Album } from '../dist/albumes/entities/album.entity.js';
import { Foto } from '../dist/fotos/entities/foto.entity.js';
import { Etiqueta } from '../dist/fotos/entities/etiqueta.entity.js';
import { TypeOrmExceptionFilter } from '../dist/common/typeorm-exception.filter.js';

// Cada ejecución usa únicamente su propio esquema temporal.
const env = { ...parseEnv(readFileSync('.env', 'utf8')), ...process.env };
const options = {
  type: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 5432),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
};
const schema = `session5_${Date.now()}`;
const admin = new DataSource(options);
let app;
await admin.initialize();
try {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  class TestModule {}
  Module({
    imports: [
      TypeOrmModule.forRoot({
        ...options,
        schema,
        entities: [Album, Foto, Etiqueta],
        synchronize: true,
        retryAttempts: 0,
      }),
      FotosModule,
      AlbumesModule,
    ],
  })(TestModule);
  app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new TypeOrmExceptionFilter());
  await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/api`;
  const ds = app.get(DataSource);
  const album = await ds
    .getRepository(Album)
    .save({ nombre: 'Prueba sesión 5' });
  const ciudad = await ds.getRepository(Etiqueta).save({ texto: 'ciudad' });
  async function request(path, method = 'GET', body) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : undefined,
      text,
    };
  }
  const valid = {
    titulo: 'Cerro Santa Ana',
    calificacion: 4.8,
    ruta: 'https://picsum.photos/id/1/600/400',
  };
  let response = await request('/fotos?limit=999');
  assert.equal(response.status, 400);
  assert.ok(Array.isArray(response.body.message));
  response = await request('/fotos', 'POST', {
    titulo: '',
    calificacion: 9,
    ruta: 'no-url',
    hack: 1,
  });
  assert.equal(response.status, 400);
  assert.ok(response.body.message.includes('El campo hack no está permitido'));
  response = await request('/fotos', 'POST', { ...valid, albumId: 2147483647 });
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Referencia a un registro inexistente');

  response = await request('/fotos', 'POST', {
    ...valid,
    albumId: album.id,
    etiquetas: [' Ciudad ', 'faro', 'CIUDAD'],
  });
  assert.equal(response.status, 201);
  const id = response.body.id;
  assert.equal(response.body.album.nombre, album.nombre);
  assert.equal(response.body.etiquetas.length, 2);
  assert.equal(
    response.body.etiquetas.find((tag) => tag.texto === 'ciudad').id,
    ciudad.id,
  );
  assert.equal(await ds.getRepository(Etiqueta).count(), 2);
  response = await request(
    '/fotos?min=3&max=5&q=CERRO&page=1&limit=5&etiqueta=ciudad&orden=desc',
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.total, 1);
  assert.equal(response.body.data[0].album.id, album.id);

  response = await request(`/fotos/${id}`, 'PATCH', { calificacion: 2.5 });
  assert.equal(response.status, 200);
  assert.equal(response.body.calificacion, 2.5);
  assert.equal(response.body.titulo, valid.titulo);
  assert.equal(response.body.etiquetas.length, 2);
  response = await request(`/fotos/${id}`, 'PATCH', { titulo: null });
  assert.equal(response.status, 400);
  response = await request(`/fotos/${id}`, 'PATCH', { etiquetas: ['noche'] });
  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.etiquetas.map((tag) => tag.texto),
    ['noche'],
  );
  response = await request(`/fotos/${id}`, 'PATCH', {
    albumId: null,
    etiquetas: [],
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.album, null);
  assert.deepEqual(response.body.etiquetas, []);
  await request(`/fotos/${id}`, 'PATCH', { etiquetas: ['ciudad'] });
  response = await request(`/fotos/${id}`, 'DELETE');
  assert.equal(response.status, 204);
  assert.equal(response.text, '');
  assert.equal((await request(`/fotos/${id}`)).status, 404);
  assert.equal(
    (await request(`/fotos/${id}`, 'PATCH', { calificacion: 1 })).status,
    404,
  );
  assert.equal((await request(`/fotos/${id}`, 'DELETE')).status, 404);
  const links = await ds.query(
    `SELECT COUNT(*)::int AS total FROM "${schema}".fotos_etiquetas`,
  );
  assert.equal(links[0].total, 0);
  response = await request('/albumes', 'POST', {
    nombre: '  Álbum del reto  ',
  });
  assert.equal(response.status, 201);
  const retoAlbumId = response.body.id;
  assert.equal(response.body.nombre, 'Álbum del reto');
  assert.equal((await request(`/albumes/${retoAlbumId}`)).status, 200);
  response = await request('/albumes', 'POST', { nombre: 'Álbum del reto' });
  assert.equal(response.status, 409);
  assert.equal(response.body.message, 'El registro ya existe');
  response = await request(`/albumes/${retoAlbumId}`, 'PATCH', {
    nombre: album.nombre,
  });
  assert.equal(response.status, 409);
  response = await request(`/albumes/${retoAlbumId}`, 'PATCH', {
    nombre: 'Álbum editado',
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.nombre, 'Álbum editado');
  for (const body of [
    { nombre: '' },
    { nombre: ' ' },
    { nombre: 'x'.repeat(81) },
    { nombre: null },
    { nombre: 7 },
    { nombre: 'Otro', hack: 1 },
  ]) {
    response = await request('/albumes', 'POST', body);
    assert.equal(response.status, 400);
    assert.ok(Array.isArray(response.body.message));
  }
  response = await request(`/albumes/${retoAlbumId}`, 'PATCH', {
    nombre: null,
  });
  assert.equal(response.status, 400);
  response = await request('/fotos', 'POST', {
    ...valid,
    albumId: retoAlbumId,
    etiquetas: ['ciudad'],
  });
  assert.equal(response.status, 201);
  const fotoConAlbumId = response.body.id;
  response = await request(`/albumes/${retoAlbumId}/fotos`);
  assert.equal(response.status, 200);
  assert.equal(response.body.fotos[0].id, fotoConAlbumId);
  response = await request(`/albumes/${retoAlbumId}`, 'DELETE');
  assert.equal(response.status, 204);
  assert.equal(response.text, '');
  response = await request(`/fotos/${fotoConAlbumId}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.album, null);
  assert.equal(response.body.etiquetas[0].texto, 'ciudad');
  assert.equal((await request(`/albumes/${retoAlbumId}`)).status, 404);
  assert.equal((await request(`/albumes/${retoAlbumId}/fotos`)).status, 404);
  assert.equal(
    (await request(`/albumes/${retoAlbumId}`, 'PATCH', { nombre: 'No existe' }))
      .status,
    404,
  );
  assert.equal(
    (await request(`/albumes/${retoAlbumId}`, 'DELETE')).status,
    404,
  );
  console.log(
    'OK: CRUD fotos y álbumes; HTTP 201/200/204/400/404/409; mensajes en español; fotos conservadas con SET NULL.',
  );
} finally {
  if (app) await app.close();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.destroy();
}
