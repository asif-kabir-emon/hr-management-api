import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { DataSource, QueryFailedError, Repository } from "typeorm";
import { RegisterUserDto } from "./dto/register-user.dto";
import { AuthSession } from "./entities/auth-session.entity";
import { LoginAttemptHistory } from "./entities/login-attempt-history.entity";
import { PasswordChangeHistory } from "./entities/password-change-history.entity";
import { PasswordResetRequest } from "./entities/password-reset-request.entity";
import { User } from "./entities/user.entity";
import { UserRole } from "./enums/user-role.enum";
import { AuditService } from "../audit/audit.service";
import { ActionModule } from "../audit/enums/action-module.enum";
import { Action } from "../audit/enums/action.enum";
import { Permissions } from "../../common/constants/permissions";
import { RolePermissions } from "../../common/constants/role-permissions";
import { CurrentUser } from "./interfaces/current-user.interface";
import { UpdateUserAccessDto } from "./dto/update-user-access.dto";

@Injectable()
export class AuthService {
  private static readonly MAX_ACTIVE_DEVICE_SESSIONS = 3;
  private static readonly MAX_FAILED_LOGIN_ATTEMPTS = 3;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly authSessionRepository: Repository<AuthSession>,
    @InjectRepository(LoginAttemptHistory)
    private readonly loginAttemptHistoryRepository: Repository<LoginAttemptHistory>,
    @InjectRepository(PasswordChangeHistory)
    private readonly passwordChangeHistoryRepository: Repository<PasswordChangeHistory>,
    @InjectRepository(PasswordResetRequest)
    private readonly passwordResetRequestRepository: Repository<PasswordResetRequest>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(
    registerUserDto: RegisterUserDto,
    ip?: string,
    deviceInfo?: string,
  ) {
    const normalizedEmail = registerUserDto.email.trim().toLowerCase();
    const permissions =
      registerUserDto.permissions ??
      this.getDefaultPermissionsForRole(registerUserDto.role);

    let savedUser: User;

    try {
      savedUser = await this.dataSource.transaction(async (manager) => {
        const user = manager.create(User, {
          ...registerUserDto,
          email: normalizedEmail,
          permissions,
        });

        return manager.save(User, user);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Email is already registered");
      }

      throw error;
    }

    try {
      await this.auditService.create({
        actorId: savedUser.id,
        action: Action.REGISTER,
        module: ActionModule.User,
        payload: {
          userId: savedUser.id,
          email: savedUser.email,
          role: savedUser.role,
          permissions: savedUser.permissions,
        },
      });
    } catch (error) {
      this.logger.warn(
        `User ${savedUser.id} was registered but audit logging failed`,
      );
    }

    return this.buildAuthResponse(savedUser, ip, deviceInfo);
  }

  listAvailablePermissions() {
    return Object.values(Permissions)
      .filter((permission) => permission !== Permissions.All)
      .map((permission) => {
        const [module, action] = permission.split(":");
        return {
          code: permission,
          module,
          permission: action,
        };
      })
      .sort((a, b) => {
        const moduleCompare = a.module.localeCompare(b.module);
        return moduleCompare !== 0
          ? moduleCompare
          : a.permission.localeCompare(b.permission);
      })
      .reduce<{ module: string; permissions: string[] }[]>((acc, curr) => {
        const existingModule = acc.find((m) => m.module === curr.module);

        if (existingModule) {
          existingModule.permissions.push(curr.permission);
        } else {
          acc.push({
            module: curr.module,
            permissions: [curr.permission],
          });
        }

        return acc;
      }, []);
  }

  listRoleTemplates() {
    return Object.values(UserRole).map((role) => ({
      role,
      permissions: this.getDefaultPermissionsForRole(role),
    }));
  }

  async listUsersForAccess() {
    const users = await this.userRepository.find({
      where: {
        isDelete: false,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return users.map((user) => this.mapUserAccessResponse(user));
  }

  async updateUserAccess(
    id: string,
    updateUserAccessDto: UpdateUserAccessDto,
    currentUser: CurrentUser,
  ) {
    const user = await this.userRepository.findOne({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (updateUserAccessDto.role) {
      user.role = updateUserAccessDto.role;
    }

    if (updateUserAccessDto.isActive !== undefined) {
      user.isActive = updateUserAccessDto.isActive;
    }

    if (
      updateUserAccessDto.permissions ||
      updateUserAccessDto.mergeWithRoleTemplate ||
      updateUserAccessDto.role
    ) {
      const rolePermissions = this.getDefaultPermissionsForRole(user.role);
      const explicitPermissions = updateUserAccessDto.permissions ?? [];
      const resolvedPermissions = updateUserAccessDto.mergeWithRoleTemplate
        ? [...new Set([...rolePermissions, ...explicitPermissions])]
        : updateUserAccessDto.permissions
          ? [...new Set(explicitPermissions)]
          : rolePermissions;

      this.validatePermissions(resolvedPermissions);
      user.permissions = resolvedPermissions;
    }

    const savedUser = await this.userRepository.save(user);

    await this.safeAudit({
      actorId: currentUser.id ?? currentUser.sub,
      action: Action.UPDATE,
      module: ActionModule.User,
      payload: {
        updatedUserId: savedUser.id,
        updatedUserEmail: savedUser.email,
        role: savedUser.role,
        permissions: savedUser.permissions,
        isActive: savedUser.isActive,
      },
      description: `Access updated for ${savedUser.email}`,
    });

    return {
      message: "User access updated successfully",
      user: this.mapUserAccessResponse(savedUser),
    };
  }

  async changePassword(
    userId: string,
    currentSessionId: string | undefined,
    currentPassword: string,
    newPassword: string,
    ip?: string,
    deviceInfo?: string,
  ) {
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        "New password must be different from current password",
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isCurrentPasswordValid = await user.validatePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const passwordChangesLast24Hours =
      await this.passwordChangeHistoryRepository
        .createQueryBuilder("history")
        .where("history.user_id = :userId", { userId: user.id })
        .andWhere("history.createdAt >= :last24Hours", { last24Hours })
        .getCount();

    const maxPasswordChangesPer24Hours = this.configService.get<number>(
      "auth.maxPasswordChangesPer24Hours",
      3,
    );

    if (passwordChangesLast24Hours >= maxPasswordChangesPer24Hours) {
      throw new HttpException(
        "Maximum password changes reached in the last 24 hours",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
    await this.passwordChangeHistoryRepository.save(
      this.passwordChangeHistoryRepository.create({
        user,
        ip,
        deviceInfo,
      }),
    );
    await this.revokeAllUserSessions(user.id, currentSessionId);

    await this.safeAudit({
      actorId: user.id,
      action: Action.CHANGE_PASSWORD,
      module: ActionModule.User,
      payload: {
        userId: user.id,
        email: user.email,
        ip,
        deviceInfo,
        passwordChangesLast24Hours: passwordChangesLast24Hours + 1,
        maxPasswordChangesPer24Hours,
      },
      description: `Password changed for ${user.email}`,
    });

    return {
      message: "Password changed successfully. Please log in again.",
    };
  }

  async forgotPassword(email: string, ip?: string, deviceInfo?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        message:
          "If an account exists for that email, a password reset link has been generated.",
      };
    }

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const requestsCountToday = await this.passwordResetRequestRepository
      .createQueryBuilder("request")
      .where("request.user_id = :userId", { userId: user.id })
      .andWhere("request.createdAt >= :last24Hours", {
        last24Hours,
      })
      .getCount();

    const maxRequestsPerDay = this.configService.get<number>(
      "auth.maxForgotPasswordRequestsPerDay",
      3,
    );

    if (requestsCountToday >= maxRequestsPerDay) {
      await this.safeAudit({
        actorId: user.id,
        action: Action.FORGOT_PASSWORD,
        module: ActionModule.User,
        payload: {
          userId: user.id,
          email: user.email,
          ip,
          deviceInfo,
          requestsCountToday,
          maxRequestsPerDay,
          status: "rate_limited",
        },
        description: `Forgot password request limit reached for ${user.email}`,
      });

      throw new HttpException(
        "Maximum forgot password requests reached for today",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = this.hashToken(token);
    const expiresAt = new Date(
      Date.now() +
        this.configService.get<number>(
          "auth.passwordResetExpiresInMinutes",
          30,
        ) *
          60 *
          1000,
    );
    const resetBaseUrl = this.configService.get<string>(
      "auth.passwordResetBaseUrl",
      "http://localhost:3000/reset-password",
    );
    const resetUrl = `${resetBaseUrl}?token=${token}`;

    const requestRecord = this.passwordResetRequestRepository.create({
      user,
      token: hashedToken,
      resetUrl,
      expiresAt,
      requestedIp: ip,
      requestedDeviceInfo: deviceInfo,
    });

    await this.passwordResetRequestRepository.save(requestRecord);

    await this.safeAudit({
      actorId: user.id,
      action: Action.FORGOT_PASSWORD,
      module: ActionModule.User,
      payload: {
        userId: user.id,
        email: user.email,
        resetRequestId: requestRecord.id,
        resetUrl: requestRecord.resetUrl,
        expiresAt: requestRecord.expiresAt,
        ip,
        deviceInfo,
        requestsCountToday: requestsCountToday + 1,
      },
      description: `Password reset requested for ${user.email}`,
    });

    return {
      message:
        "If an account exists for that email, a password reset link has been generated.",
      resetUrl: requestRecord.resetUrl,
      expiresAt: requestRecord.expiresAt,
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    ip?: string,
    deviceInfo?: string,
  ) {
    const hashedToken = this.hashToken(token);
    const resetRequest = await this.passwordResetRequestRepository.findOne({
      where: { token: hashedToken },
    });

    if (!resetRequest) {
      throw new NotFoundException("Invalid password reset token");
    }

    if (resetRequest.isUsed) {
      throw new ForbiddenException(
        "Password reset token has already been used",
      );
    }

    if (resetRequest.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException("Password reset token has expired");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.dataSource.transaction(async (manager) => {
      resetRequest.isUsed = true;
      resetRequest.usedAt = new Date();
      resetRequest.usedIp = ip;
      resetRequest.usedDeviceInfo = deviceInfo;

      resetRequest.user.password = hashedPassword;
      resetRequest.user.failedLoginAttempts = 0;
      resetRequest.user.isActive = true;

      await manager.save(User, resetRequest.user);
      await manager.save(PasswordResetRequest, resetRequest);
    });
    await this.revokeAllUserSessions(resetRequest.user.id);

    await this.safeAudit({
      actorId: resetRequest.user.id,
      action: Action.RESET_PASSWORD,
      module: ActionModule.User,
      payload: {
        userId: resetRequest.user.id,
        email: resetRequest.user.email,
        resetRequestId: resetRequest.id,
        usedAt: resetRequest.usedAt,
        ip,
        deviceInfo,
      },
      description: `Password reset completed for ${resetRequest.user.email}`,
    });

    return {
      message: "Password has been reset successfully",
    };
  }

  async refreshToken(refreshToken: string, ip?: string, deviceInfo?: string) {
    let payload: {
      sub: string;
      email: string;
      role: UserRole;
      permissions: string[];
      sid?: string;
      type?: "access" | "refresh";
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>("jwt.refreshSecret"),
      });
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive || !payload.sid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await this.authSessionRepository.findOne({
      where: {
        id: payload.sid,
        user: { id: user.id },
        isActive: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokens = await this.buildAuthResponse(
      user,
      ip ?? session.ip,
      deviceInfo ?? session.deviceInfo,
      session,
    );

    await this.safeAudit({
      actorId: user.id,
      action: Action.REFRESH_TOKEN,
      module: ActionModule.User,
      payload: {
        userId: user.id,
        email: user.email,
        ip,
        deviceInfo,
      },
      description: `Refresh token rotated for ${user.email}`,
    });

    return tokens;
  }

  async login(
    email: string,
    password: string,
    ip?: string,
    deviceInfo?: string,
    accessToken?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const loginAttemptCounts =
      await this.getLoginAttemptCounts(normalizedEmail);
    await this.ensureLoginAttemptsWithinLimit(
      normalizedEmail,
      loginAttemptCounts,
      ip,
      deviceInfo,
    );

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await this.recordLoginAttempt(
        normalizedEmail,
        undefined,
        ip,
        deviceInfo,
        false,
        "user_not_found",
      );
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new ForbiddenException("User account is disabled");
    }

    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      await this.recordLoginAttempt(
        normalizedEmail,
        user,
        ip,
        deviceInfo,
        false,
        "invalid_password",
      );
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts > AuthService.MAX_FAILED_LOGIN_ATTEMPTS) {
        user.isActive = false;
      }

      await this.userRepository.save(user);

      if (!user.isActive) {
        try {
          await this.auditService.create({
            actorId: user.id,
            action: Action.UPDATE,
            module: ActionModule.User,
            payload: {
              userId: user.id,
              email: user.email,
              failedLoginAttempts: user.failedLoginAttempts,
              isActive: user.isActive,
              ip,
              deviceInfo,
            },
          });
        } catch (error) {
          this.logger.warn(
            `User ${user.id} was disabled after failed login attempts but audit logging failed`,
          );
        }

        throw new ForbiddenException(
          "User account has been disabled after too many failed login attempts",
        );
      }

      throw new UnauthorizedException("Invalid credentials");
    }

    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    user.lastLoginDeviceInfo = deviceInfo;
    await this.userRepository.save(user);
    await this.recordLoginAttempt(normalizedEmail, user, ip, deviceInfo, true);

    // Log the login action, but don't fail the login if audit logging fails
    try {
      await this.auditService.create({
        actorId: user.id,
        action: Action.LOGIN,
        module: ActionModule.User,
        payload: {
          userId: user.id,
          email: user.email,
          ip,
          deviceInfo,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (error) {
      this.logger.warn(`User ${user.id} logged in but audit logging failed`);
    }

    return this.buildAuthResponse(user, ip, deviceInfo, undefined, accessToken);
  }

  private async buildAuthResponse(
    user: User,
    ip?: string,
    deviceInfo?: string,
    existingSession?: AuthSession,
    accessTokenToValidate?: string,
  ) {
    const normalizedDeviceInfo = deviceInfo?.trim() || "unknown";
    const session = existingSession
      ? existingSession
      : await this.findOrCreateSession(
          user,
          normalizedDeviceInfo,
          ip,
          accessTokenToValidate,
        );

    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions ?? [],
      sid: session.id,
      type: "access" as const,
    };
    const refreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions ?? [],
      sid: session.id,
      type: "refresh" as const,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>("jwt.refreshSecret"),
      expiresIn: this.configService.get<string>("jwt.refreshExpiresIn"),
    });

    session.accessTokenHash = await bcrypt.hash(accessToken, 10);
    session.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    session.ip = ip ?? session.ip;
    session.deviceInfo = normalizedDeviceInfo;
    session.lastUsedAt = new Date();
    session.isActive = true;
    await this.authSessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions ?? [],
      },
    };
  }

  async validateAccessSession(
    userId: string,
    sessionId: string | undefined,
    accessToken: string,
  ) {
    if (!sessionId) {
      throw new UnauthorizedException("Invalid access token");
    }

    const session = await this.authSessionRepository.findOne({
      where: {
        id: sessionId,
        user: { id: userId },
        isActive: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException("Session is not active");
    }

    const isAccessTokenValid = await bcrypt.compare(
      accessToken,
      session.accessTokenHash,
    );

    if (!isAccessTokenValid) {
      throw new UnauthorizedException("Invalid access token");
    }

    session.lastUsedAt = new Date();
    await this.authSessionRepository.save(session);

    return session;
  }

  private async findOrCreateSession(
    user: User,
    deviceInfo: string,
    ip?: string,
    accessTokenToValidate?: string,
  ) {
    const existingSession = await this.authSessionRepository.findOne({
      where: {
        user: { id: user.id },
        deviceInfo,
        isActive: true,
      },
      order: {
        updatedAt: "DESC",
      },
    });

    if (existingSession) {
      if (accessTokenToValidate) {
        const isAccessTokenValid = await bcrypt.compare(
          accessTokenToValidate,
          existingSession.accessTokenHash,
        );

        if (!isAccessTokenValid) {
          existingSession.isActive = false;
          existingSession.accessTokenHash = "";
          existingSession.refreshTokenHash = "";
          await this.authSessionRepository.save(existingSession);
        } else {
          existingSession.ip = ip ?? existingSession.ip;
          existingSession.lastUsedAt = new Date();
          return existingSession;
        }
      } else {
        existingSession.ip = ip ?? existingSession.ip;
        existingSession.lastUsedAt = new Date();
        return existingSession;
      }
    }

    const activeSessionsCount = await this.authSessionRepository.count({
      where: {
        user: { id: user.id },
        isActive: true,
      },
    });

    if (activeSessionsCount >= AuthService.MAX_ACTIVE_DEVICE_SESSIONS) {
      const oldestActiveSession = await this.authSessionRepository.findOne({
        where: {
          user: { id: user.id },
          isActive: true,
        },
        order: {
          lastUsedAt: "ASC",
          createdAt: "ASC",
        },
      });

      if (oldestActiveSession) {
        oldestActiveSession.isActive = false;
        oldestActiveSession.accessTokenHash = "";
        oldestActiveSession.refreshTokenHash = "";
        await this.authSessionRepository.save(oldestActiveSession);

        await this.safeAudit({
          actorId: user.id,
          action: Action.LOGOUT,
          module: ActionModule.User,
          payload: {
            userId: user.id,
            revokedSessionId: oldestActiveSession.id,
            revokedDeviceInfo: oldestActiveSession.deviceInfo,
            revokedIp: oldestActiveSession.ip,
            reason: "auto_revoked_oldest_session_for_new_device_login",
            replacementDeviceInfo: deviceInfo,
            replacementIp: ip,
          },
          description: `Oldest device session auto-revoked for ${user.email} to allow a new device login`,
        });
      }
    }

    return this.authSessionRepository.create({
      user,
      deviceInfo,
      ip,
      accessTokenHash: "",
      refreshTokenHash: "",
      isActive: true,
      lastUsedAt: new Date(),
    });
  }

  private async revokeAllUserSessions(
    userId: string,
    excludeSessionId?: string,
  ) {
    const query = this.authSessionRepository
      .createQueryBuilder()
      .update(AuthSession)
      .set({ isActive: false, accessTokenHash: "", refreshTokenHash: "" })
      .where("user_id = :userId", { userId });

    if (excludeSessionId) {
      query.andWhere("id != :excludeSessionId", { excludeSessionId });
    }

    await query.execute();
  }

  private async getLoginAttemptCounts(email: string) {
    const lastMinute = new Date(Date.now() - 60 * 1000);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [lastMinuteCount, lastHourCount, lastDayCount] = await Promise.all([
      this.loginAttemptHistoryRepository
        .createQueryBuilder("history")
        .where("history.email = :email", { email })
        .andWhere("history.createdAt >= :lastMinute", { lastMinute })
        .getCount(),
      this.loginAttemptHistoryRepository
        .createQueryBuilder("history")
        .where("history.email = :email", { email })
        .andWhere("history.createdAt >= :lastHour", { lastHour })
        .getCount(),
      this.loginAttemptHistoryRepository
        .createQueryBuilder("history")
        .where("history.email = :email", { email })
        .andWhere("history.createdAt >= :lastDay", { lastDay })
        .getCount(),
    ]);

    return {
      lastMinuteCount,
      lastHourCount,
      lastDayCount,
    };
  }

  private async ensureLoginAttemptsWithinLimit(
    email: string,
    counts: {
      lastMinuteCount: number;
      lastHourCount: number;
      lastDayCount: number;
    },
    ip?: string,
    deviceInfo?: string,
  ) {
    const maxLoginAttemptsPerMinute = this.configService.get<number>(
      "auth.maxLoginAttemptsPerMinute",
      5,
    );
    const maxLoginAttemptsPerHour = this.configService.get<number>(
      "auth.maxLoginAttemptsPerHour",
      20,
    );
    const maxLoginAttemptsPerDay = this.configService.get<number>(
      "auth.maxLoginAttemptsPerDay",
      50,
    );

    let message: string | null = null;

    if (counts.lastMinuteCount >= maxLoginAttemptsPerMinute) {
      message = "Maximum login attempts reached in the last minute";
    } else if (counts.lastHourCount >= maxLoginAttemptsPerHour) {
      message = "Maximum login attempts reached in the last hour";
    } else if (counts.lastDayCount >= maxLoginAttemptsPerDay) {
      message = "Maximum login attempts reached in the last 24 hours";
    }

    if (!message) {
      return;
    }

    await this.recordLoginAttempt(
      email,
      undefined,
      ip,
      deviceInfo,
      false,
      "rate_limited",
    );
    await this.safeAudit({
      actorId: `login:${email}`,
      action: Action.LOGIN,
      module: ActionModule.User,
      payload: {
        email,
        ip,
        deviceInfo,
        status: "rate_limited",
        ...counts,
        maxLoginAttemptsPerMinute,
        maxLoginAttemptsPerHour,
        maxLoginAttemptsPerDay,
      },
      description: `Login rate limit triggered for ${email}`,
    });

    throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  private async recordLoginAttempt(
    email: string,
    user?: User,
    ip?: string,
    deviceInfo?: string,
    isSuccessful = false,
    failureReason?: string,
  ) {
    await this.loginAttemptHistoryRepository.save(
      this.loginAttemptHistoryRepository.create({
        user,
        email,
        ip,
        deviceInfo,
        isSuccessful,
        failureReason,
      }),
    );
  }

  private async safeAudit(payload: {
    actorId: string;
    action: Action;
    module: ActionModule;
    payload?: Record<string, unknown>;
    description?: string;
  }) {
    try {
      await this.auditService.create(payload);
    } catch (error) {
      this.logger.warn("Audit logging failed");
    }
  }

  private isUniqueViolation(error: unknown) {
    return (
      error instanceof QueryFailedError &&
      typeof (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === "string" &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === "23505"
    );
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private getDefaultPermissionsForRole(role: UserRole) {
    if (role === UserRole.SuperAdmin) {
      return this.configService.get<string[]>(
        "accessControl.defaultSuperAdminPermissions",
        RolePermissions[UserRole.SuperAdmin],
      );
    }

    return [...(RolePermissions[role] ?? [])];
  }

  private validatePermissions(permissions: string[]) {
    const validPermissions = new Set<string>(Object.values(Permissions));
    const invalidPermissions = permissions.filter(
      (permission) => !validPermissions.has(permission),
    );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(", ")}`,
      );
    }
  }

  private mapUserAccessResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions ?? [],
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
