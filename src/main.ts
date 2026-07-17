import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { DataSource } from "typeorm";
import { AuthService } from "./modules/auth/auth.service";
import { Permissions } from "./common/constants/permissions";
import { AppModule } from "./app.module";
import { SuccessResponseInterceptor } from "./common/interceptors/success-response.interceptor";
import { User } from "./modules/auth/entities/user.entity";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");
  const port = configService.get<number>("app.port", 3000);
  const apiPrefix = configService.get<string>("app.apiPrefix", "api");
  const appName = configService.get<string>("app.appName", "HR Management API");
  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService);
  const authService = app.get(AuthService);
  const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];

  app.use(
    helmet({
      hsts: process.env.NODE_ENV === "production" ? undefined : false,
    }),
  );
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
    .setDescription("Production-oriented HR management API")
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Paste the access token returned from /auth/login or /auth/refresh-token",
      },
      "bearer",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerDocsPath = `${apiPrefix}/docs`;
  const swaggerDocsJsonPath = `${apiPrefix}/docs-json`;
  const swaggerLoginPath = `/${apiPrefix}/v1/auth/swagger-access/login`;
  const swaggerLogoutPath = `/${apiPrefix}/v1/auth/swagger-access/logout`;
  const swaggerLogoutButtonScriptPath = `/${apiPrefix}/docs/logout-button.js`;
  const swaggerAccessCookieName = "swagger_access_token";

  app.use(
    [`/${swaggerDocsPath}`, `/${swaggerDocsJsonPath}`],
    (request: Request, response: Response, next: NextFunction) => {
      void (async () => {
        const cookieHeader = request.headers.cookie ?? "";
        const cookies = Object.fromEntries(
          cookieHeader
            .split(";")
            .map((cookiePart) => cookiePart.trim())
            .filter(Boolean)
            .map((cookiePart) => {
              const separatorIndex = cookiePart.indexOf("=");

              if (separatorIndex < 0) {
                return [cookiePart, ""];
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
            type?: "access" | "refresh";
          }>(accessToken, {
            secret: configService.get<string>("jwt.secret"),
          });

          if (payload.type === "access") {
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
                user.permissions.includes(Permissions.All) ||
                user.permissions.includes(Permissions.DocsRead) ||
                user.permissions.includes(Permissions.UserManage);

              if (canReadDocs) {
                return next();
              }
            }
          }
        }

        return response.redirect(`${swaggerLoginPath}`);
      })().catch(() => {
        response.redirect(`${swaggerLoginPath}`);
      });
    },
  );

  app.use(swaggerLogoutButtonScriptPath, (_request: Request, response: Response) => {
    response.type("application/javascript").send(`
      (function addSwaggerLogoutButton() {
        var logoutPath = "${swaggerLogoutPath}";
        var loginPath = "${swaggerLoginPath}";

        function getLocalSafeUrl(path) {
          var host = window.location.host;

          if (
            host.indexOf("localhost") === 0 ||
            host.indexOf("127.0.0.1") === 0 ||
            host.indexOf("[::1]") === 0
          ) {
            return "http://" + host + path;
          }

          return path;
        }

        function mountButton() {
          if (document.querySelector(".swagger-logout-button")) {
            return;
          }

          var button = document.createElement("button");
          button.type = "button";
          button.className = "swagger-logout-button";
          button.textContent = "Logout";
          button.addEventListener("click", function () {
            fetch(getLocalSafeUrl(logoutPath), {
              method: "POST",
              credentials: "include",
            }).finally(function () {
              window.location.href = getLocalSafeUrl(loginPath);
            });
          });

          document.body.appendChild(button);
        }

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", mountButton);
        } else {
          mountButton();
        }
      })();
    `);
  });

  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    customCss: `
      .swagger-logout-button {
        border: 1px solid #dc2626;
        border-radius: 4px;
        background: #dc2626;
        color: #fff;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 13px;
        font-weight: 700;
        line-height: 1;
        padding: 8px 12px;
        position: fixed;
        right: 16px;
        top: 12px;
        z-index: 10000;
      }

      .swagger-logout-button:hover {
        background: #b91c1c;
        border-color: #b91c1c;
      }
    `,
    customJs: swaggerLogoutButtonScriptPath,
    customSiteTitle: `${appName} Docs`,
  });

  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
