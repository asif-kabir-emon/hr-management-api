import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { Permissions } from "../../common/constants/permissions";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SwaggerLoginDto } from "./dto/swagger-login.dto";
import { UpdateUserAccessDto } from "./dto/update-user-access.dto";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./interfaces/current-user.interface";

@ApiTags("auth")
@Controller({
  path: "auth",
  version: "1",
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get("swagger-access/login")
  showSwaggerLoginPage(
    @Query("returnTo") returnTo: string | undefined,
    @Query("error") error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const normalizedReturnTo = this.normalizeSwaggerReturnTo(returnTo);
    const errorMessage = error ? this.escapeHtml(error) : "";
    const swaggerLoginUrl = this.getLocalSafeUrl(
      request,
      this.getSwaggerLoginPath(),
    );

    return response.type("html").send(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Swagger Login</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { width: 100%; max-width: 420px; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 20px; color: #555; }
            label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #222; }
            input { width: 100%; box-sizing: border-box; margin-bottom: 16px; padding: 12px; border: 1px solid #d0d7de; border-radius: 8px; font-size: 14px; }
            button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #111827; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
            .error { margin-bottom: 16px; padding: 12px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Swagger Access</h1>
            <p>Sign in with your HR system account to open the API documentation.</p>
            ${errorMessage ? `<div class="error">${errorMessage}</div>` : ""}
            <form method="post" action="${swaggerLoginUrl}">
              <input type="hidden" name="returnTo" value="${this.escapeHtml(normalizedReturnTo)}" />
              <label for="email">Email</label>
              <input id="email" name="email" type="email" required />
              <label for="password">Password</label>
              <input id="password" name="password" type="password" required />
              <button type="submit">Open Swagger</button>
            </form>
          </div>
        </body>
      </html>`);
  }

  @Post("swagger-access/login")
  async loginForSwagger(
    @Body() loginDto: SwaggerLoginDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const { ip, deviceInfo } = this.getRequestMetadata(request);

    try {
      const authResponse = await this.authService.login(
        loginDto.email,
        loginDto.password,
        ip ?? undefined,
        deviceInfo,
      );

      const canReadDocs =
        authResponse.user.permissions.includes(Permissions.All) ||
        authResponse.user.permissions.includes(Permissions.DocsRead) ||
        authResponse.user.permissions.includes(Permissions.UserManage);

      if (!canReadDocs) {
        throw new ForbiddenException(
          "Your account does not have permission to access Swagger docs",
        );
      }

      response.cookie("swagger_access_token", authResponse.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: `/${this.getApiPrefix()}`,
      });

      return response.redirect(
        this.getLocalSafeUrl(
          request,
          this.normalizeSwaggerReturnTo(loginDto.returnTo),
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof ForbiddenException
          ? error.message
          : "Invalid credentials";

      return response.redirect(
        this.getLocalSafeUrl(
          request,
          `${this.getSwaggerLoginPath()}?error=${encodeURIComponent(
            errorMessage,
          )}`,
        ),
      );
    }
  }

  @Post("swagger-access/logout")
  logoutFromSwagger(@Req() request: Request, @Res() response: Response) {
    response.clearCookie("swagger_access_token", {
      path: `/${this.getApiPrefix()}`,
    });
    response.clearCookie("swagger_access_token", { path: "/" });
    return response.redirect(
      this.getLocalSafeUrl(request, this.getSwaggerLoginPath()),
    );
  }

  @Get("access-control/permissions")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.UserManage)
  listAvailablePermissions() {
    return this.authService.listAvailablePermissions();
  }

  @Get("access-control/roles")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.UserManage)
  listRoleTemplates() {
    return this.authService.listRoleTemplates();
  }

  @Get("access-control/users")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.UserManage)
  listUsersForAccess() {
    return this.authService.listUsersForAccess();
  }

  @Patch("access-control/users/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.UserManage)
  updateUserAccess(
    @Param("id") id: string,
    @Body() updateUserAccessDto: UpdateUserAccessDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.authService.updateUserAccess(
      id,
      updateUserAccessDto,
      request.user,
    );
  }

  @Post("register")
  @ApiBody({ type: RegisterUserDto })
  @ApiOkResponse({
    description: "User registered successfully",
    schema: {
      example: {
        accessToken: "jwt-access-token",
        refreshToken: "jwt-refresh-token",
        user: {
          id: "uuid",
          email: "user@example.com",
          fullName: "John Doe",
          role: "employee",
          permissions: ["leave:create"],
        },
      },
    },
  })
  register(@Body() registerUserDto: RegisterUserDto, @Req() request: Request) {
    const { ip, deviceInfo } = this.getRequestMetadata(request);
    return this.authService.register(registerUserDto, ip, deviceInfo);
  }

  @Post("change-password")
  @ApiBearerAuth()
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: "Password changed successfully",
    schema: {
      example: {
        message: "Password changed successfully. Please log in again.",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Missing token or current password is incorrect",
  })
  @ApiForbiddenResponse({
    description:
      "Authenticated user is no longer allowed to access this resource",
  })
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() request: Request & { user: { sub: string; sessionId?: string } },
  ) {
    const { ip, deviceInfo } = this.getRequestMetadata(request);

    return this.authService.changePassword(
      request.user.sub,
      request.user.sessionId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
      ip,
      deviceInfo,
    );
  }

  @Post("forgot-password")
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: "Reset request created or masked for unknown email",
    schema: {
      example: {
        message:
          "If an account exists for that email, a password reset link has been generated.",
        resetUrl: "http://localhost:3000/reset-password?token=raw-token",
        expiresAt: "2026-04-15T10:30:00.000Z",
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description:
      "Maximum forgot password requests reached in the last 24 hours",
  })
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() request: Request,
  ) {
    const { ip, deviceInfo } = this.getRequestMetadata(request);

    return this.authService.forgotPassword(
      forgotPasswordDto.email,
      ip,
      deviceInfo,
    );
  }

  @Post("reset-password")
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: "Password reset successfully",
    schema: {
      example: {
        message: "Password has been reset successfully",
      },
    },
  })
  @ApiForbiddenResponse({
    description: "Reset token is expired or already used",
  })
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() request: Request,
  ) {
    const { ip, deviceInfo } = this.getRequestMetadata(request);

    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
      ip,
      deviceInfo,
    );
  }

  @Post("refresh-token")
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: "New access and refresh tokens issued",
    schema: {
      example: {
        accessToken: "jwt-access-token",
        refreshToken: "jwt-refresh-token",
        user: {
          id: "uuid",
          email: "user@example.com",
          fullName: "John Doe",
          role: "employee",
          permissions: ["leave:create"],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Refresh token is invalid or session is inactive",
  })
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
  ) {
    const { ip, deviceInfo } = this.getRequestMetadata(request);

    return this.authService.refreshToken(
      refreshTokenDto.refreshToken,
      ip,
      deviceInfo,
    );
  }

  @Post("login")
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: "Login successful",
    schema: {
      example: {
        accessToken: "jwt-access-token",
        refreshToken: "jwt-refresh-token",
        user: {
          id: "uuid",
          email: "user@example.com",
          fullName: "John Doe",
          role: "employee",
          permissions: ["leave:create"],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: "Email or password is incorrect" })
  @ApiForbiddenResponse({
    description: "Account is disabled after too many failed login attempts",
  })
  login(@Body() loginDto: LoginDto, @Req() request: Request) {
    const { ip, deviceInfo } = this.getRequestMetadata(request);
    const accessToken = this.getBearerToken(request);

    return this.authService.login(
      loginDto.email,
      loginDto.password,
      ip ?? undefined,
      deviceInfo,
      accessToken,
    );
  }

  private getRequestMetadata(request: Request) {
    const forwardedFor = request.headers["x-forwarded-for"];
    const ip =
      typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0]?.trim()
        : request.ip;
    const deviceInfo = request.headers["user-agent"] ?? "unknown";

    return {
      ip: ip ?? undefined,
      deviceInfo: Array.isArray(deviceInfo)
        ? deviceInfo.join(", ")
        : deviceInfo,
    };
  }

  private getBearerToken(request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return undefined;
    }

    return authorization.slice("Bearer ".length).trim();
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private normalizeSwaggerReturnTo(returnTo?: string) {
    const trimmedReturnTo = returnTo?.trim();

    if (!trimmedReturnTo || !trimmedReturnTo.startsWith("/")) {
      return this.getSwaggerDocsPath();
    }

    if (trimmedReturnTo.startsWith("//")) {
      return this.getSwaggerDocsPath();
    }

    return trimmedReturnTo;
  }

  private getApiPrefix() {
    return this.configService.get<string>("app.apiPrefix", "api");
  }

  private getSwaggerDocsPath() {
    return `/${this.getApiPrefix()}/docs`;
  }

  private getSwaggerLoginPath() {
    return `/${this.getApiPrefix()}/v1/auth/swagger-access/login`;
  }

  private getLocalSafeUrl(request: Request, path: string) {
    const host = request.headers.host;

    if (
      host?.startsWith("localhost") ||
      host?.startsWith("127.0.0.1") ||
      host?.startsWith("[::1]")
    ) {
      return `http://${host}${path}`;
    }

    return path;
  }
}
