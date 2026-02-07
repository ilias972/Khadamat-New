import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Middleware pour parser les données
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // ── CORS sécurisé ──────────────────────────────────────────────
  // Whitelist lue depuis CORS_ORIGINS (séparées par des virgules).
  // En production : CORS_ORIGINS=https://khadamat.ma,https://www.khadamat.ma
  // En dev        : CORS_ORIGINS=http://localhost:3000,http://localhost:8081
  // Si la variable est absente, AUCUNE origine n'est autorisée (fail-closed).
  const rawOrigins = process.env.CORS_ORIGINS || '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    logger.warn('CORS_ORIGINS is empty – no cross-origin request will be allowed');
  } else {
    logger.log(`CORS whitelist: ${allowedOrigins.join(', ')}`);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (curl, mobile, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-CSRF-PROTECTION'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600, // preflight cache 10 min
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger setup (disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Khadamat API')
      .setDescription('API Backend pour la marketplace Khadamat')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Port
  const port = process.env.API_PORT || process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`API Khadamat running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
  logger.log(`Health check: http://localhost:${port}/api/health`);
}

bootstrap();
