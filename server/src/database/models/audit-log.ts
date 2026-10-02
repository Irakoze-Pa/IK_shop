import { model, Schema, type InferSchemaType } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    entityType: { type: String, required: true, trim: true, maxlength: 80 },
    entityId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true, maxlength: 64 },
    userAgent: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model<AuditLog>('AuditLog', auditLogSchema);
