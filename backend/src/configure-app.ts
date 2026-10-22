import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestLogging } from './common/request-logging.middleware';
import { isIP } from 'net';

export function configureApp(app: NestExpressApplication) {
  const proxies = (process.env.TRUST_PROXY_IPS ?? '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (proxies.some((ip) => !isIP(ip)))
    throw new Error('TRUST_PROXY_IPS must contain explicit IP addresses');
  app.set(
    'trust proxy',
    proxies.length
      ? (ip: string) => proxies.includes(ip.replace(/^::ffff:/, ''))
      : false,
  );
  app.setGlobalPrefix('api');
  app.use(requestLogging);
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
}
