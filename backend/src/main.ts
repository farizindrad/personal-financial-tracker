import { existsSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // SPA fallback: non-API GET tanpa ekstensi file → index.html (React Router)
  const indexHtml = join(process.cwd(), 'public', 'index.html');
  if (existsSync(indexHtml)) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      const url = req.originalUrl.split('?')[0];
      if (url.startsWith('/api') || /\.[a-zA-Z0-9]+$/.test(url)) {
        next();
        return;
      }
      res.sendFile(indexHtml);
    });
  }

  void app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
