import { existsSync } from 'fs';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { DynamicModule } from '@nestjs/common';

// cwd = /app in Docker (public at /app/public). Compiled file lives in dist/static/
// so __dirname/../public would wrongly resolve to dist/public.
const publicPath = join(process.cwd(), 'public');

/** Serve React build kalau folder public sudah ada (Docker / build:frontend). */
export function serveStaticModules(): DynamicModule[] {
  if (!existsSync(publicPath)) {
    return [];
  }
  return [
    ServeStaticModule.forRoot({
      rootPath: publicPath,
      exclude: ['/api/{*path}'],
      // Do not catch-all GET {*any} → sendFile index (hides real 404s, fights SPA middleware).
      renderPath: '/',
    }),
  ];
}
