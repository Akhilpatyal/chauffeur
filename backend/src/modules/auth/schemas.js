import { z } from 'zod';
import { ROLES } from '../../models/AdminUser.js';
import { PERMISSIONS } from '../../config/permissions.js';

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

/*
 * A length floor beats a character-class rule: "Password1!" satisfies most
 * complexity policies and is trivially guessable, whereas a 12-character
 * passphrase is not. Length is the requirement that actually correlates with
 * resistance to guessing.
 */
export const passwordField = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(200)
  .refine((value) => value.trim().length >= 12, 'Use at least 12 characters.');

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordField,
});

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.');
const permission = z.enum(PERMISSIONS);

export const createUserBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordField,
  /* Least privilege by default: a new account is a caller until
   somebody with the authority deliberately raises it. */
  role: z.enum(ROLES).default('caller'),
  teams: z.array(objectId).max(20).default([]),
  mustChangePassword: z.boolean().default(true),
});

export const updateUserBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
    password: passwordField.optional(),
    teams: z.array(objectId).max(20).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.');

/*
 * Overrides are sent as two explicit lists rather than as a single effective
 * permission set. The difference matters on screen: "this person additionally
 * has X" survives a later change to what their role grants, whereas a flattened
 * set silently freezes today's role definition onto the account.
 */
export const permissionsBody = z
  .object({
    granted: z.array(permission).max(60).optional(),
    revoked: z.array(permission).max(60).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.')
  .refine(
    (body) => {
      const granted = new Set(body.granted ?? []);
      return (body.revoked ?? []).every((name) => !granted.has(name));
    },
    'A permission cannot be granted and revoked at the same time.',
  );

export const listUsersQuery = z.object({
  role: z.enum(ROLES).optional(),
  team: objectId.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  q: z.string().trim().max(120).optional(),
});

export const userIdParams = z.object({ id: objectId });
