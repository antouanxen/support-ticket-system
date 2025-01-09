import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',  
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true }
  }))

  const port = process.env.PORT || 8080;
    // Swagger Config
  const swagConfig = new DocumentBuilder()
  .setDescription(`Use the base API URL as http://localhost:8000. If it does not work ask Tony`)
  .setTermsOfService(`http://localhost:8000/api/terms-of-service`)
  .addServer('http://192.168.1.160:8000')
  .addServer(process.env.SERVER_URL)
  .setTitle('Support Ticket System app - API')
  .addBearerAuth()
  .setVersion('1.0')
  .build()
  // Instatiate Swagger
  const swagDocument = SwaggerModule.createDocument(app, swagConfig)
  SwaggerModule.setup('api', app, swagDocument, {
    customSiteTitle: 'Support Ticket System Doc-station',
    customCss: '.swagger-ui .topbar { display: none }',
  })
     

  await app.listen(port);
}
bootstrap();
