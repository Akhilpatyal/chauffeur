import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.');

export const teamIdParams = z.object({ id: objectId });

export const createTeamBody = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  /* Optional at creation: a team often exists before anyone is appointed to
   * run it, and forcing a placeholder manager just produces wrong data. */
  manager: objectId.nullish(),
});

export const updateTeamBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    manager: objectId.nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.');

export const listTeamsQuery = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/*
 * Membership is edited as a delta rather than as a replacement list. Two
 * managers adding people at the same time would otherwise overwrite each
 * other, and the loser would never know.
 */
export const membersBody = z
  .object({
    add: z.array(objectId).max(100).default([]),
    remove: z.array(objectId).max(100).default([]),
  })
  .refine((body) => body.add.length + body.remove.length > 0, 'Nothing to change.');
