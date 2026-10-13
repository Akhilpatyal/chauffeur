import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * The security timeline.
 *
 * Separate from the audit log on purpose. The audit log answers "who changed
 * this record", and it is append-only evidence about deliberate actions. This
 * answers "is someone trying to get in", and most of its entries are about
 * attempts that failed and people who are not users. Mixing the two makes
 * both harder to read: a brute-force burst would push a month of genuine
 * changes off the first page.
 */
export const SECURITY_EVENT_TYPES = [
  'login.success',
  'login.failed',
  'login.locked',
  'password.changed',
  'token.refreshed',
  /* The one that matters most: a refresh token presented twice means it was
   * either replayed or stolen, and the whole family is revoked. */
  'token.reuse_detected',
  'session.revoked',
  'permission.denied',
  'rate_limit.exceeded',
  'csrf.failed',
  'upload.rejected',
  'recaptcha.failed',
  'spam.blocked',
];

const securityEventSchema = new Schema(
  {
    type: { type: String, enum: SECURITY_EVENT_TYPES, required: true, index: true },
    /* 'info' for the ordinary (a successful sign-in), 'warn' for the
     * suspicious, 'critical' for the things somebody should look at today. */
    severity: { type: String, enum: ['info', 'warn', 'critical'], default: 'info', index: true },

    /* Both, where known. The actor id is absent for a failed sign-in with an
     * unknown address, and the email is what makes that attempt legible. */
    actor: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    actorEmail: { type: String, default: null },
    actorRole: { type: String, default: null },

    ipHash: { type: String, index: true },
    userAgent: { type: String, maxlength: 300 },
    route: String,
    method: String,
    correlationId: String,

    /* Context, never credentials. The recording service strips anything that
     * looks like a secret before it reaches here. */
    detail: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
/* "Everything this address has tried", which is how a probe gets spotted. */
securityEventSchema.index({ ipHash: 1, createdAt: -1 });
securityEventSchema.index({ actorEmail: 1, createdAt: -1 });

/*
 * Ninety days. Longer than the request metrics because an intrusion is often
 * noticed weeks later, and a timeline that stops before the first probe is
 * not a timeline.
 */
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SecurityEvent =
  mongoose.models.SecurityEvent ?? mongoose.model('SecurityEvent', securityEventSchema);
export default SecurityEvent;
