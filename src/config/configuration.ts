export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    appName: process.env.APP_NAME ?? 'HR Management API',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'replace-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'replace-refresh-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  auth: {
    passwordResetBaseUrl:
      process.env.PASSWORD_RESET_BASE_URL ??
      'http://localhost:3000/reset-password',
    passwordResetExpiresInMinutes: Number(
      process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES ?? 30,
    ),
    maxForgotPasswordRequestsPerDay: Number(
      process.env.MAX_FORGOT_PASSWORD_REQUESTS_PER_DAY ?? 3,
    ),
    maxPasswordChangesPer24Hours: Number(
      process.env.MAX_PASSWORD_CHANGES_PER_24_HOURS ?? 3,
    ),
    maxLoginAttemptsPerMinute: Number(
      process.env.MAX_LOGIN_ATTEMPTS_PER_MINUTE ?? 5,
    ),
    maxLoginAttemptsPerHour: Number(
      process.env.MAX_LOGIN_ATTEMPTS_PER_HOUR ?? 20,
    ),
    maxLoginAttemptsPerDay: Number(
      process.env.MAX_LOGIN_ATTEMPTS_PER_DAY ?? 50,
    ),
  },
  accessControl: {
    defaultSuperAdminPermissions: (process.env.DEFAULT_SUPER_ADMIN_PERMISSIONS ?? '*')
      .split(',')
      .map((permission) => permission.trim())
      .filter(Boolean),
  },
  security: {
    employeePiiEncryptionKey: process.env.EMPLOYEE_PII_ENCRYPTION_KEY ?? '',
  },
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? 'hr_management',
      username: process.env.POSTGRES_USER ?? 'postgres',
      password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    },
    mongodb: {
      uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/hr_audit',
    },
  },
});
