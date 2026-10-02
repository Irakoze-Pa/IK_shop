import type { AuthenticatedRequest } from '../auth/types.js';
import { AuditLogModel } from '../database/models/audit-log.js';

type AuditInput = {
  action: string;
  entityType: string;
  entityId: { toString: () => string } | string;
  metadata?: Record<string, string | number | boolean | null>;
};

export const recordAdminAudit = async (request: AuthenticatedRequest, input: AuditInput): Promise<void> => {
  if (!request.user || request.user.role !== 'admin') throw new Error('Admin identity required for audit logging');

  await AuditLogModel.create({
    actorId: request.user.id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId.toString(),
    metadata: input.metadata ?? {},
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
  });
};
