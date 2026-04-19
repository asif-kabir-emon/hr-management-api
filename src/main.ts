import {
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { AuthService } from './modules/auth/auth.service';
import { Permissions } from './common/constants/permissions';
import { AppModule } from './app.module';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import { User } from './modules/auth/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const appName = configService.get<string>('app.appName', 'HR Management API');
  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService);
  const authService = app.get(AuthService);
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

  app.use(helmet());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new SuccessResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('Production-oriented HR management API')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste the access token returned from /auth/login or /auth/refresh-token',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerDocsPath = `${apiPrefix}/docs`;
  const swaggerDocsJsonPath = `${apiPrefix}/docs-json`;
  const swaggerLoginPath = `/${apiPrefix}/v1/auth/swagger-access/login`;
  const swaggerAccessCookieName = 'swagger_access_token';

  app.use([`/${swaggerDocsPath}`, `/${swaggerDocsJsonPath}`], (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    void (async () => {
      const cookieHeader = request.headers.cookie ?? '';
      const cookies = Object.fromEntries(
        cookieHeader
          .split(';')
          .map((cookiePart) => cookiePart.trim())
          .filter(Boolean)
          .map((cookiePart) => {
            const separatorIndex = cookiePart.indexOf('=');

            if (separatorIndex < 0) {
              return [cookiePart, ''];
            }

            return [
              cookiePart.slice(0, separatorIndex),
              decodeURIComponent(cookiePart.slice(separatorIndex + 1)),
            ];
          }),
      );
      const accessToken = cookies[swaggerAccessCookieName];

      if (accessToken) {
        const payload = await jwtService.verifyAsync<{
          sub: string;
          email: string;
          sid?: string;
          type?: 'access' | 'refresh';
        }>(accessToken, {
          secret: configService.get<string>('jwt.secret'),
        });

        if (payload.type === 'access') {
          await authService.validateAccessSession(
            payload.sub,
            payload.sid,
            accessToken,
          );

          const userRepository = dataSource.getRepository(User);
          const user = await userRepository.findOne({
            where: {
              id: payload.sub,
              isDelete: false,
              isActive: true,
            },
          });

          if (user) {
            const canReadDocs =
              user.permissions.includes(Permissions.All)
              || user.permissions.includes(Permissions.DocsRead)
              || user.permissions.includes(Permissions.UserManage);

            if (canReadDocs) {
              return next();
            }
          }
        }
      }

      return response.redirect(
        `${swaggerLoginPath}?returnTo=${encodeURIComponent(request.originalUrl)}`,
      );
    })().catch(() => {
      response.redirect(
        `${swaggerLoginPath}?returnTo=${encodeURIComponent(request.originalUrl)}`,
      );
    });
  });

  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    customSiteTitle: `${appName} Docs`,
  });

  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
