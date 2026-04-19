import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().min(1).default('api'),
  APP_NAME: z.string().min(1).default('HR Management API'),
  JWT_SECRET: z.string().min(24),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  JWT_REFRESH_SECRET: z.string().min(24),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  PASSWORD_RESET_BASE_URL: z.string().url().default('http://localhost:3000/reset-password'),
  PASSWORD_RESET_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(30),
  MAX_FORGOT_PASSWORD_REQUESTS_PER_DAY: z.coerce.number().int().positive().default(3),
  MAX_PASSWORD_CHANGES_PER_24_HOURS: z.coerce.number().int().positive().default(3),
  MAX_LOGIN_ATTEMPTS_PER_MINUTE: z.coerce.number().int().positive().default(5),
  MAX_LOGIN_ATTEMPTS_PER_HOUR: z.coerce.number().int().positive().default(20),
  MAX_LOGIN_ATTEMPTS_PER_DAY: z.coerce.number().int().positive().default(50),
  EMPLOYEE_PII_ENCRYPTION_KEY: z.string().min(32),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string(),
  MONGODB_URI: z.string().url().or(z.string().startsWith('mongodb://')).or(
    z.string().startsWith('mongodb+srv://'),
  ),
  DEFAULT_SUPER_ADMIN_PERMISSIONS: z.string().default('*'),
});

export const envValidationSchema = (config: Record<string, unknown>) => {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(
      `Environment validation failed: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')}`,
    );
  }

  return parsed.data;
};
