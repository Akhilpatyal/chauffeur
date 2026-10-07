import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Refresh tokens are persisted so they can be revoked; only the SHA-256 digest
 * is stored, so a database dump cannot be replayed against the API.
 *
 * `rotatedTo` implements reuse detection: each refresh issues a new token and
 * marks the old one used. If a token that was already used comes back, the
 * whole family is revoked, because the only way that happens is theft.
 */
const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    rotatedTo: { type: String, default: null },
    userAgent: { type: String, maxlength: 500 },
    ipHash: String,
  },
  { timestamps: true },
);

/* MongoDB drops expired documents on its own; no cleanup job needed. */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken =
  mongoose.models.RefreshToken ?? mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
