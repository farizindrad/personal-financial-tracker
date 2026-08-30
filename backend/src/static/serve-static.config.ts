import { existsSync } from 'fs';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { DynamicModule } from '@nestjs/common';

const publicPath = join(__dirname, '..', 'public');

/** Serve React build kalau folder public sudah ada (Docker / build:frontend). */
export function serveStaticModules(): DynamicModule[] {
  if (!existsSync(publicPath)) {
    return [];
  }
  return [
    ServeStaticModule.forRoot({
      rootPath: publicPath,
      exclude: ['/api/(.*)'],
    }),
  ];
}
