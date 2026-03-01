import { coreDb as prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';
import { Request } from 'express';

const logger = createLogger('super-admin-service');

export interface AuditLogParams {
  /** The actor performing the action (from req.superAdmin or manual for unauthenticated routes) */
  actorId: string;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, any> | null;
  req?: Request;
}

/**
 * Fire-and-forget audit log writer.
 * Never throws — failures are logged to pino but don't break the calling endpoint.
 */
export function recordAuditLog(params: AuditLogParams): void {
  const {
    actorId,
    actorType = 'super_admin',
    action,
    entityType,
    entityId,
    tenantId,
    metadata,
    req,
  } = params;

  prisma.platformAuditLog
    .create({
      data: {
        actorId,
        actorType,
        action,
        entityType,
        entityId: entityId ?? undefined,
        tenantId: tenantId ?? undefined,
        metadata: metadata ?? undefined,
        ipAddress: req ? (req.headers['x-forwarded-for'] as string || req.ip) : undefined,
        userAgent: req?.headers['user-agent'] ?? undefined,
      },
    })
    .catch((err) => {
      logger.error({ err, action, entityType, entityId }, 'Failed to write audit log');
    });
}

/**
 * Convenience: extract actorId from authenticated request.
 */
export function auditLog(
  req: Request,
  action: string,
  entityType: string,
  entityId?: string | null,
  tenantId?: string | null,
  metadata?: Record<string, any> | null,
): void {
  recordAuditLog({
    actorId: req.superAdmin?.id ?? 'unknown',
    action,
    entityType,
    entityId,
    tenantId,
    metadata,
    req,
  });
}
