import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

/*
 * Audit writes must never fail the operation they describe. If the log write
 * throws, we record that fact and let the business action stand — the
 * alternative is a lead status change rolling back because a log collection
 * hiccuped.
 */
export async function recordAudit({
  request,
  action,
  entity,
  entityId,
  entityLabel,
  before,
  after,
}) {
  try {
    const actor = request?.user;
    await AuditLog.create({
      actor: actor?.id ?? null,
      actorName: actor?.name ?? null,
      actorRole: actor?.role ?? null,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      entityLabel,
      before,
      after,
      requestId: request?.id,
      ipHash: request?.ipHash,
      userAgent: request?.headers?.['user-agent'],
    });
  } catch (error) {
    logger.error({ err: error, action, entity, entityId }, 'audit log write failed');
  }
}

/*
 * Reduces a full update to just what changed, so the audit trail stays
 * readable and does not duplicate whole documents on every edit.
 */
export function diffFields(before, after, fields) {
  const changedBefore = {};
  const changedAfter = {};
  for (const field of fields) {
    const previous = before?.[field];
    const next = after?.[field];
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changedBefore[field] = previous;
      changedAfter[field] = next;
    }
  }
  return { before: changedBefore, after: changedAfter, changed: Object.keys(changedAfter) };
}
