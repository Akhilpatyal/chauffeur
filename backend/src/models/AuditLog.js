import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Append-only record of every state change an admin makes. Two questions it
 * has to answer months later: who changed this lead's status, and who edited
 * this journey's price. `before`/`after` hold only the fields that changed.
 */
const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'AdminUser', index: true },
    actorName: String,
    actorRole: String,
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    entityLabel: String,
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    requestId: String,
    ipHash: String,
    userAgent: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
