import { z } from 'zod';
import { stripTags } from '../../utils/sanitize.js';
import { emailField } from '../leads/schemas.js';

export const subscribeBody = z.object({
  email: emailField,
  name: z
    .string()
    .max(120)
    .optional()
    .transform((value) => (value ? stripTags(value) : undefined)),
  sourcePage: z.string().max(500).optional(),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(200).optional(),
    })
    .partial()
    .optional(),
  /* Honeypot, same trap as the lead form. */
  website: z.string().max(200).optional(),
  recaptchaToken: z.string().max(3000).optional(),
});

export const tokenQuery = z.object({
  token: z.string().min(16).max(200),
  reason: z.string().max(300).optional(),
});
