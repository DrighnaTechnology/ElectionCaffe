import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const dbEnvSchema = z.object({
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  CORE_DATABASE_URL: z.string().url().min(1, 'CORE_DATABASE_URL is required'),
});

const authEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional(),
  JWT_EXPIRY: z.string().default('24h'),
});

const gatewayEnvSchema = baseEnvSchema.merge(z.object({
  CORS_ORIGIN: z.string().default('http://localhost:5000,http://localhost:5174'),
}));

/**
 * Validate environment variables for a given service.
 * Call this at service startup. Throws with clear error messages on failure.
 */
export function validateEnv(serviceName: string): void {
  const schemas: Record<string, z.ZodTypeAny> = {
    gateway: gatewayEnvSchema.merge(dbEnvSchema).merge(authEnvSchema),
    'auth-service': baseEnvSchema.merge(dbEnvSchema).merge(authEnvSchema),
    'election-service': baseEnvSchema.merge(dbEnvSchema),
    'voter-service': baseEnvSchema.merge(dbEnvSchema),
    'cadre-service': baseEnvSchema.merge(dbEnvSchema),
    'analytics-service': baseEnvSchema.merge(dbEnvSchema),
    'reporting-service': baseEnvSchema.merge(dbEnvSchema),
    'ai-analytics-service': baseEnvSchema.merge(dbEnvSchema),
    'super-admin-service': baseEnvSchema.merge(dbEnvSchema),
  };

  const schema = schemas[serviceName] || baseEnvSchema.merge(dbEnvSchema);
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`\nEnvironment validation failed for ${serviceName}:\n${errors}\n`);
    // In production, exit. In development, just warn.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
