import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { Foto } from './fotos/entities/foto.entity.js';
import { Album } from './albumes/entities/album.entity.js';
import { Etiqueta } from './fotos/entities/etiqueta.entity.js';

const app = await NestFactory.createApplicationContext(AppModule);

try {
  const ds = app.get(DataSource);
  await ds.transaction(async (manager) => {
    await manager.query(
      'TRUNCATE fotos_etiquetas, fotos, etiquetas, albumes RESTART IDENTITY CASCADE',
    );
    const albumes = await manager
      .getRepository(Album)
      .save(
        ['Viajes', 'Guayaquil', 'Naturaleza'].map((nombre) => ({ nombre })),
      );
    const etiquetas = await manager.getRepository(Etiqueta).save(
      ['playa', 'ciudad', 'noche', 'cielo', 'montaña', 'río'].map((texto) => ({
        texto,
      })),
    );
    const azar = <T>(lista: T[]): T =>
      lista[Math.floor(Math.random() * lista.length)];

    for (let i = 1; i <= 20; i++) {
      await manager.getRepository(Foto).save({
        titulo: `Foto ${i}`,
        descripcion: `Descripción de la foto ${i}`,
        fotografo: i % 2 === 0 ? `Fotógrafo ${i}` : null,
        calificacion: Math.round(Math.random() * 50) / 10,
        ruta: `https://picsum.photos/id/${i * 10}/600/400`,
        album: azar(albumes),
        etiquetas: [...new Set([azar(etiquetas), azar(etiquetas)])],
      });
    }
  });
  console.log('✓ 3 álbumes, 6 etiquetas y 20 fotos insertadas');
} finally {
  await app.close();
}
