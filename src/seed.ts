import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { Foto } from './fotos/entities/foto.entity.js';

const app = await NestFactory.createApplicationContext(AppModule);

try {
  const fotosRepo = app.get(DataSource).getRepository(Foto);

  await fotosRepo.clear();
  for (let i = 1; i <= 10; i++) {
    await fotosRepo.save({
      titulo: `Foto ${i}`,
      descripcion: `Descripción de la foto ${i}`,
      fotografo: i % 2 === 0 ? `Fotógrafo ${i}` : null,
      calificacion: Math.round(Math.random() * 50) / 10,
      ruta: `https://picsum.photos/id/${i * 10}/600/400`,
    });
  }
  console.log('✓ 10 fotos insertadas');
} finally {
  await app.close();
}
