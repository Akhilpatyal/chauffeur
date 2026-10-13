import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  ROLES,
  ROLE_PERMISSIONS,
  ROLE_SCOPE,
  isPermission,
} from '../config/permissions.js';

const { Schema } = mongoose;

/*
 * Roles, their permissions and their data scope all come from
 * config/permissions.js. Re-exported here because most callers already import
 * them from the model.
 */
export { ROLES, ROLE_PERMISSIONS };

const BCRYPT_ROUNDS = 12;

const adminUserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    /* select:false so a stray .find() can never leak hashes into a response. */
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'caller', index: true },

    /* Which teams this person belongs to. Drives data scope for team managers
     * and callers; ignored for admins and above, who see everything. */
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team', index: true }],

    /*
     * Per-user exceptions to the role's permissions.
     *
     * `granted` adds, `revoked` removes, and revoked wins — so taking export
     * away from one person is a single edit rather than inventing a role for
     * them. Both are validated against the catalogue on save, so a typo
     * cannot silently grant nothing or hide a real permission.
     */
    permissionOverrides: {
      granted: { type: [String], default: [] },
      revoked: { type: [String], default: [] },
    },

    isActive: { type: Boolean, default: true, index: true },

    /* Failed-login lockout state. */
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: Date,
    lastLoginIpHash: String,

    /*
     * Bumped on password change or forced logout. Access tokens carry this
     * value; a mismatch invalidates every token issued before the change,
     * which is what makes "log out everywhere" actually work with JWTs.
     */
    tokenVersion: { type: Number, default: 0 },

    mustChangePassword: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

adminUserSchema.virtual('permissions').get(function permissions() {
  const base = new Set(ROLE_PERMISSIONS[this.role] ?? []);
  for (const granted of this.permissionOverrides?.granted ?? []) base.add(granted);
  /* Revoked last: an explicit removal beats both the role and a grant. */
  for (const revoked of this.permissionOverrides?.revoked ?? []) base.delete(revoked);
  return [...base];
});

adminUserSchema.virtual('scope').get(function scope() {
  return ROLE_SCOPE[this.role] ?? 'own';
});

/* Reject unknown permission strings rather than storing them. A typo that
 * silently does nothing is harder to notice than a failed save. */
adminUserSchema.pre('validate', function validateOverrides(next) {
  const all = [
    ...(this.permissionOverrides?.granted ?? []),
    ...(this.permissionOverrides?.revoked ?? []),
  ];
  const unknown = all.filter((value) => !isPermission(value));
  if (unknown.length > 0) {
    return next(new Error(`Unknown permission(s): ${unknown.join(', ')}`));
  }
  return next();
});

adminUserSchema.virtual('isLocked').get(function isLocked() {
  return Boolean(this.lockedUntil && this.lockedUntil > new Date());
});

adminUserSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

adminUserSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

export const AdminUser = mongoose.models.AdminUser ?? mongoose.model('AdminUser', adminUserSchema);
export default AdminUser;
