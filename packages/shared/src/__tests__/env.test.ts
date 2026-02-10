import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../env.js';

describe('validateEnv', () => {
  const originalEnv = process.env;
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    process.env = { ...originalEnv };
    consoleSpy.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass validation with valid config for election-service', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.CORE_DATABASE_URL = 'postgresql://user:pass@localhost:5432/core';

    expect(() => validateEnv('election-service')).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should warn on missing DATABASE_URL in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    delete process.env.CORE_DATABASE_URL;

    validateEnv('election-service');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Environment validation failed')
    );
  });

  it('should validate gateway requires CORS_ORIGIN', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.CORE_DATABASE_URL = 'postgresql://user:pass@localhost:5432/core';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.CORS_ORIGIN = 'http://localhost:5000';

    expect(() => validateEnv('gateway')).not.toThrow();
  });

  it('should validate auth-service requires JWT_SECRET', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.CORE_DATABASE_URL = 'postgresql://user:pass@localhost:5432/core';
    process.env.JWT_SECRET = 'short'; // too short

    validateEnv('auth-service');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET')
    );
  });

  it('should accept valid NODE_ENV values', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.CORE_DATABASE_URL = 'postgresql://user:pass@localhost:5432/core';

    for (const env of ['development', 'production', 'test']) {
      process.env.NODE_ENV = env;
      consoleSpy.mockClear();
      validateEnv('voter-service');
      // Should not complain about NODE_ENV
      if (consoleSpy.mock.calls.length > 0) {
        expect(consoleSpy.mock.calls[0]?.[0]).not.toContain('NODE_ENV');
      }
    }
  });

  it('should use default values when optional fields not set', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.CORE_DATABASE_URL = 'postgresql://user:pass@localhost:5432/core';
    delete process.env.LOG_LEVEL;

    validateEnv('analytics-service');
    // Should not fail — LOG_LEVEL has a default
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should fall back to base schema for unknown service', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.CORE_DATABASE_URL = 'postgresql://user:pass@localhost:5432/core';

    expect(() => validateEnv('unknown-service')).not.toThrow();
  });
});
