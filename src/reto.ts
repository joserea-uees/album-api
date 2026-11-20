import { NestFactory } from '@nestjs/core';
import { DataSource, EntitySchema } from 'typeorm';
import { AppModule } from './app.module.js';

const app = await NestFactory.createApplicationContext(AppModule);
const principal = app.get(DataSource);
const schema = `reto_${Date.now()}`;
let demo: DataSource | undefined;

try {
  await principal.query(`CREATE SCHEMA "${schema}"`);
  const options = { ...principal.options, schema, synchronize: false };
  const autor = new EntitySchema({
    name: 'FotoReto',
    tableName: 'fotos',
    columns: {
      id: { type: Number, primary: true, generated: true },
      autor: { type: 'text', nullable: true },
    },
  });
  demo = new DataSource({ ...options, entities: [autor] });
  await demo.initialize();
  await demo.synchronize();
  await demo.getRepository(autor).save({ autor: 'Ana Pérez' });
  console.log('Antes:', await demo.getRepository(autor).find());
  await demo.destroy();

  const fotografo = new EntitySchema({
    name: 'FotoReto',
    tableName: 'fotos',
    columns: {
      id: { type: Number, primary: true, generated: true },
      fotografo: { type: 'text', nullable: true },
    },
  });
  demo = new DataSource({ ...options, entities: [fotografo] });
  await demo.initialize();
  const cambios = await demo.driver.createSchemaBuilder().log();
  console.log(
    'SQL generado:',
    cambios.upQueries.map((query) => query.query),
  );
  await demo.synchronize();
  console.log('Después:', await demo.getRepository(fotografo).find());
} finally {
  if (demo?.isInitialized) await demo.destroy();
  await principal.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await app.close();
}
