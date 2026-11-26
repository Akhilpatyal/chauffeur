import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

/* The same cost factor AdminUser uses. Raising it is a deliberate decision
 * taken for both at once, not one drifting from the other. */
const BCRYPT_ROUNDS = 12;

/*
 * A traveller with an account.
 *
 * WHY THIS IS NOT AdminUser
 *
 * It would have been less code to add a `customer` role to AdminUser and be
 * done. That would have been a mistake. The two populations differ in every
 * way that matters to the schema: an admin is one of five people with a
 * permission set and a team; a customer is one of thousands with a phone
 * number, saved fellow travellers and an emergency contact. More importantly
 * they differ in blast radius — a bug that lets a customer record acquire a
 * role is a total compromise, and the only reliable way to prevent it is for
 * customer records to have no role field in the first place.
 *
 * The two never share a token either. Admin tokens are signed with audience
 * `taifer-admin` and customer tokens with `taifer-customer`, verified through
 * separate namespaces, so a customer token presented to an admin route fails
 * at the signature check rather than at a permission check somebody might
 * forget to write.
 */
const travellerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    /* Dates of birth are collected only where an operator needs them for a
     * permit, so it is optional and nothing breaks without it. */
    dateOfBirth: { type: Date, default: null },
    /* Free text rather than an enum: "female", "non-binary" and "prefer not
     * to say" all have to be expressible, and room allocation is a human
     * decision anyway. */
    gender: { type: String, trim: true, maxlength: 40, default: null },
    /* Stored only when a trip genuinely requires it — an inner line permit,
     * for instance. Never requested by default. */
    idType: { type: String, trim: true, maxlength: 40, default: null },
    idNumber: { type: String, trim: true, maxlength: 60, select: false, default: null },
    relationship: { type: String, trim: true, maxlength: 60, default: null },
  },
  { _id: true, timestamps: false },
);

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    /*
     * Never selected by default, so no query can return it by accident — the
     * same guard AdminUser uses. A password reaching a JSON response is the
     * kind of bug that only shows up in somebody else's logs.
     */
    passwordHash: { type: String, required: true, select: false },

    phone: { type: String, trim: true, maxlength: 32, default: null },

    /* Asked for once a booking is confirmed rather than at signup: it is the
     * most intrusive field here and is useless until somebody is actually
     * travelling. */
    emergencyContact: {
      name: { type: String, trim: true, maxlength: 120, default: null },
      phone: { type: String, trim: true, maxlength: 32, default: null },
      relationship: { type: String, trim: true, maxlength: 60, default: null },
    },

    /* Re-used across bookings so a returning customer does not retype their
     * family's details every time. */
    savedTravellers: { type: [travellerSchema], default: [] },

    isActive: { type: Boolean, default: true, index: true },

    /* Bumped to invalidate every outstanding access token at once — a
     * password change, or the customer asking to be signed out everywhere. */
    tokenVersion: { type: Number, default: 0 },

    lastLoginAt: { type: Date, default: null },
    lastLoginIpHash: { type: String, default: null, select: false },

    /* Per-account lockout. The IP rate limit in front of the route handles
     * distributed guessing; this handles one address being hammered. */
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },

    /* Separate from the newsletter list: consenting to booking emails is not
     * consenting to marketing, and conflating them is what gets a sender
     * domain blocked. */
    marketingOptIn: { type: Boolean, default: false },

    /* Set by the compliance erase flow rather than deleting the row, because
     * bookings and invoices reference it and a hard delete turns a year of
     * accounts into orphans. */
    anonymisedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.failedLoginAttempts;
        delete ret.lockedUntil;
        delete ret.lastLoginIpHash;
        delete ret.__v;
        /* Id numbers are collected for permits and must never leave the
         * server in a list response. */
        for (const traveller of ret.savedTravellers ?? []) delete traveller.idNumber;
        return ret;
      },
    },
  },
);

customerSchema.index({ createdAt: -1 });
customerSchema.index({ anonymisedAt: 1 }, { sparse: true });

customerSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

customerSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

export const Customer = mongoose.models.Customer ?? mongoose.model('Customer', customerSchema);
export default Customer;
