import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { AuditLogModel } from '../database/models/audit-log.js';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().trim().min(1).max(120).optional(),
  entityType: z.string().trim().min(1).max(80).optional(),
  actorId: z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid actor identifier').optional(),
});

export const auditRouter = Router();
auditRouter.use(authenticate, requireRole('admin'));

auditRouter.get('/', async (request, response) => {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid audit log filters' });
    return;
  }

  const { page, limit, action, entityType, actorId } = parsed.data;
  const filter = { ...(action ? { action } : {}), ...(entityType ? { entityType } : {}), ...(actorId ? { actorId } : {}) };
  const [auditLogs, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  response.json({ auditLogs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
