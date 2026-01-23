import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middleware pour accepter les données urlencoded (callback CMI)
  app.use(express.urlencoded({ extended: true }));

  // CORS (permissif en mode dev)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Khadamat API')
    .setDescription('API Backend pour la marketplace Khadamat')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Port
  const port = process.env.API_PORT || process.env.PORT || 3001;
  await app.listen(port);

  console.log(`\n🚀 API Khadamat running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  console.log(`💚 Health check: http://localhost:${port}/api/health\n`);
}

bootstrap();
