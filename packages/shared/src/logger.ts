import pino from 'pino';
import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

export interface LoggerOptions {
  logDir?: string;
  enableFileLogging?: boolean;
}

/**
 * Resolve the monorepo root logs directory.
 * Walks up from cwd looking for turbo.json, or uses LOG_DIR env var.
 */
function resolveLogRoot(): string {
  if (process.env.LOG_DIR) return process.env.LOG_DIR;

  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'turbo.json'))) {
      return join(dir, 'logs');
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback: logs/ relative to cwd
  return join(process.cwd(), 'logs');
}

export function createLogger(serviceName: string, options?: LoggerOptions) {
  const isProduction = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL || 'info';

  const enableFileLogging = options?.enableFileLogging ??
    (process.env.ENABLE_FILE_LOGGING === 'true' || isProduction);

  // Development without file logging: console-only (existing behavior)
  if (!enableFileLogging) {
    return pino({
      name: serviceName,
      level,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    });
  }

  // Resolve log directory for this service
  const logRoot = resolveLogRoot();
  const serviceLogDir = options?.logDir || join(logRoot, serviceName);

  // Ensure directories exist
  if (!existsSync(serviceLogDir)) {
    mkdirSync(serviceLogDir, { recursive: true });
  }

  const combinedLogPath = join(serviceLogDir, 'combined.log');
  const errorLogPath = join(serviceLogDir, 'error.log');

  if (isProduction) {
    // Production: file-only with daily rotation via pino-roll
    return pino({
      name: serviceName,
      level,
      transport: {
        targets: [
          {
            target: 'pino-roll',
            options: {
              file: combinedLogPath,
              frequency: 'daily',
              dateFormat: 'yyyy-MM-dd',
              mkdir: true,
            },
            level: 'info',
          },
          {
            target: 'pino-roll',
            options: {
              file: errorLogPath,
              frequency: 'daily',
              dateFormat: 'yyyy-MM-dd',
              mkdir: true,
            },
            level: 'error',
          },
        ],
      },
    });
  }

  // Development with file logging: console (pretty) + file output
  return pino({
    name: serviceName,
    level,
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: { colorize: true },
          level,
        },
        {
          target: 'pino/file',
          options: { destination: combinedLogPath, mkdir: true },
          level: 'info',
        },
        {
          target: 'pino/file',
          options: { destination: errorLogPath, mkdir: true },
          level: 'error',
        },
      ],
    },
  });
}

export type Logger = pino.Logger;
