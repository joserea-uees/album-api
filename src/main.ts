import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { createValidationPipe } from './common/validation.pipe.js';
import { TypeOrmExceptionFilter } from './common/typeorm-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new TypeOrmExceptionFilter());
  const config = app.get(ConfigService);
  await app.listen(Number(config.get<string>('PORT', '3000')));
}
await bootstrap();
