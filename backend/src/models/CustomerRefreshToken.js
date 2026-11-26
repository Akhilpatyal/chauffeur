import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Refresh tokens for customer sessions.
 *
 * Identical in shape to RefreshToken, and deliberately a separate collection.
 *
 * Sharing one collection with a `subjectKind` discriminator would have been
 * less code, and would have meant every query in both auth paths had to
 * remember to filter on it. One that forgot would hand an admin session row
 * to customer logic, or the reverse. A separate collection makes that
 * impossible rather than unlikely — the same reasoning that keeps Customer
 * apart from AdminUser and the two JWT audiences apart.
 *
 * The rotation and reuse-detection logic is NOT duplicated: both go through
 * lib/refreshTokens.js, which takes the model as an argument. One
 * implementation of the security-critical part, two isolated stores.
 */
const customerRefreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    /* Only the SHA-256 digest, so a database dump cannot be replayed. */
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    /* Reuse detection: a token that comes back after being rotated was
     * either replayed or stolen, and the whole family is revoked. */
    rotatedTo: { type: String, default: null },
    userAgent: { type: String, maxlength: 500 },
    ipHash: String,
  },
  { timestamps: true },
);

/* MongoDB drops expired documents on its own. */
customerRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CustomerRefreshToken =
  mongoose.models.CustomerRefreshToken ??
  mongoose.model('CustomerRefreshToken', customerRefreshTokenSchema);
export default CustomerRefreshToken;
