import { existsSync } from 'fs';
import { join } from 'path';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });

  configureApp(app);

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
