import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    process.loadEnvFile();
  } catch {
    // .env opcional: usar variables de entorno existentes
  }

  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN?.trim()
    ? process.env.CORS_ORIGIN.split(',')
    : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
