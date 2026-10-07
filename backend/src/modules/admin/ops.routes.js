import { z } from 'zod';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { paginationQuery } from '../../utils/pagination.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AdminUser } from '../../models/AdminUser.js';
import { leadAnalytics, newsletterAnalytics } from './analytics.service.js';
import { listFlags, setFlag } from '../../services/flags.js';
import { recordAudit } from '../../services/audit.js';
import { queueHealth } from '../../lib/queue.js';
import { FLAG_DEFAULTS } from '../../models/FeatureFlag.js';

const analyticsQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  granularity: z.enum(['day', 'week']).default('day'),
});

const auditQuery = paginationQuery.extend({
  entity: z.string().max(60).optional(),
  entityId: z.string().max(60).optional(),
  actor: z.string().max(60).optional(),
  action: z.string().max(80).optional(),
});

const flagBody = z.object({
  value: z.boolean(),
  message: z.string().max(300).optional(),
});

const flagParams = z.object({
  key: z.enum(Object.keys(FLAG_DEFAULTS)),
});

/*
 * Analytics, audit trail, feature flags and the team roster: everything the
 * dashboard needs that is neither a lead nor a content record.
 */
export default async function adminOpsRoutes(fastify) {
  fastify.get(
    '/analytics/leads',
    {
      preHandler: fastify.requirePermission('analytics:read'),
      preValidation: validate({ query: analyticsQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Lead analytics',
        description:
          'Leads over time, by status, by source page, by campaign and by most-enquired ' +
          'journey, plus conversion rate and a count of leads whose notifications are stuck.',
        security: [{ bearerAuth: [] }],
        querystring: docSchema(analyticsQuery, 'AnalyticsQuery'),
        response: { 200: { description: 'Aggregates', type: 'object' } },
      },
    },
    async (request) => ({ data: await leadAnalytics(request.query) }),
  );

  fastify.get(
    '/analytics/newsletter',
    {
      preHandler: fastify.requirePermission('analytics:read'),
      schema: {
        tags: ['admin:ops'],
        summary: 'Newsletter analytics',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Aggregates', type: 'object' } },
      },
    },
    async () => ({ data: await newsletterAnalytics() }),
  );

  fastify.get(
    '/audit',
    {
      preHandler: fastify.requirePermission('audit:read'),
      preValidation: validate({ query: auditQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Audit log',
        security: [{ bearerAuth: [] }],
        querystring: docSchema(auditQuery, 'AuditQuery'),
        response: { 200: { description: 'A page of audit entries', type: 'object' } },
      },
    },
    async (request) => {
      const { page, limit, ...filters } = request.query;
      const filter = {};
      if (filters.entity) filter.entity = filters.entity;
      if (filters.entityId) filter.entityId = filters.entityId;
      if (filters.actor) filter.actor = filters.actor;
      if (filters.action) filter.action = filters.action;

      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      return {
        data: items,
        meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      };
    },
  );

  /* The assignee picker in the dashboard. Readable by any agent; managing
   * users is a super_admin action handled in auth routes. */
  fastify.get(
    '/team',
    {
      preHandler: fastify.requirePermission('leads:read'),
      schema: {
        tags: ['admin:ops'],
        summary: 'List active admin users (for lead assignment)',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Team members', type: 'object' } },
      },
    },
    async () => ({
      data: await AdminUser.find({ isActive: true }).select('name email role').sort({ name: 1 }).lean(),
    }),
  );

  fastify.get(
    '/flags',
    {
      preHandler: fastify.requirePermission('content:read'),
      schema: {
        tags: ['admin:ops'],
        summary: 'List feature flags',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Flags with their effective values', type: 'object' } },
      },
    },
    async () => ({ data: await listFlags() }),
  );

  fastify.put(
    '/flags/:key',
    {
      preHandler: fastify.requirePermission('flags:write'),
      preValidation: validate({ params: flagParams, body: flagBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Set a feature flag',
        description:
          'Turning `submissions_enabled` off makes the public forms return 503 with the ' +
          'configured message, so visitors are told what is happening instead of the form ' +
          'appearing to work and losing their data.',
        security: [{ bearerAuth: [] }],
        params: docSchema(flagParams, 'FlagParams'),
        body: docSchema(flagBody, 'SetFlag'),
        response: {
          200: { description: 'Updated flag', type: 'object' },
          403: { description: 'Insufficient permission', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const flag = await setFlag(request.params.key, request.body.value, {
        userId: request.user.id,
        message: request.body.message,
      });
      await recordAudit({
        request,
        action: 'flag.set',
        entity: 'feature_flag',
        entityId: request.params.key,
        entityLabel: request.params.key,
        after: { value: request.body.value },
      });
      return { data: flag };
    },
  );

  fastify.get(
    '/queues',
    {
      preHandler: fastify.requirePermission('audit:read'),
      schema: {
        tags: ['admin:ops'],
        summary: 'Queue depth and failure counts',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Queue counts', type: 'object' } },
      },
    },
    async () => ({ data: await queueHealth() }),
  );
}
