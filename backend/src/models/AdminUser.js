import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

export const ROLES = ['super_admin', 'sales_agent'];

/*
 * Permissions are derived from the role rather than stored per user, so a
 * role change takes effect everywhere at once and there is no drift between
 * what a token claims and what the role actually allows.
 */
export const ROLE_PERMISSIONS = {
  super_admin: [
    'leads:read', 'leads:write', 'leads:export', 'leads:delete',
    'content:read', 'content:write', 'content:publish',
    'users:read', 'users:write',
    'analytics:read', 'audit:read', 'flags:write', 'uploads:write',
    'compliance:export', 'compliance:erase',
  ],
  sales_agent: [
    'leads:read', 'leads:write', 'leads:export',
    'content:read', 'analytics:read', 'uploads:write',
  ],
};

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
    role: { type: String, enum: ROLES, default: 'sales_agent', index: true },
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
  return ROLE_PERMISSIONS[this.role] ?? [];
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
