import { z } from 'zod';
import { ROLES } from '../../models/AdminUser.js';

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

export const createUserBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordField,
  role: z.enum(ROLES).default('sales_agent'),
  mustChangePassword: z.boolean().default(true),
});

export const updateUserBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  password: passwordField.optional(),
});

export const userIdParams = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.'),
});
