import { z } from 'zod';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { toCsv } from '../../utils/csv.js';
import { recordAudit } from '../../services/audit.js';
import { SECURITY_EVENT_TYPES } from '../../models/SecurityEvent.js';
import {
  trafficSummary,
  trafficSeries,
  routeBreakdown,
  listErrors,
  getError,
  setErrorStatus,
  securityTimeline,
  visitorSummary,
  observabilityExport,
} from './observability.service.js';

const rangeField = z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h');
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.');

const rangeQuery = z.object({ range: rangeField });

const routesQuery = z.object({
  range: rangeField,
  sort: z.enum(['requests', 'slowest', 'errors', 'time']).default('requests'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const errorsQuery = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  range: z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
  route: z.string().max(200).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const errorStatusBody = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']),
  note: z.string().trim().max(1000).optional(),
});

const securityQuery = z.object({
  range: rangeField,
  type: z.enum(SECURITY_EVENT_TYPES).optional(),
  severity: z.enum(['info', 'warn', 'critical']).optional(),
  ipHash: z.string().max(64).optional(),
  actorEmail: z.string().trim().max(254).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const visitorsQuery = z.object({
  range: rangeField,
  includeBots: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const exportQuery = z.object({
  dataset: z.enum(['routes', 'errors', 'security', 'visitors']),
  range: rangeField,
});

/* One column set per dataset. Spelled out rather than derived from the first
 * row, so an export does not silently change shape — or leak a field added to
 * a model later — just because the data did. */
const EXPORT_COLUMNS = {
  routes: [
    { key: 'method', label: 'Method' },
    { key: 'route', label: 'Route' },
    { key: 'requests', label: 'Requests' },
    { key: 'avgDurationMs', label: 'Avg ms' },
    { label: 'p95 ms', value: (row) => row.latencyMs?.p95 },
    { label: 'p99 ms', value: (row) => row.latencyMs?.p99 },
    { key: 'maxDurationMs', label: 'Max ms' },
    { key: 'serverErrors', label: 'Server errors' },
    { key: 'clientErrors', label: 'Client errors' },
    { key: 'errorRate', label: 'Error rate %' },
    { key: 'totalTimeMs', label: 'Total ms' },
  ],
  errors: [
    { label: 'First seen', value: (row) => row.firstSeenAt?.toISOString?.() ?? row.firstSeenAt },
    { label: 'Last seen', value: (row) => row.lastSeenAt?.toISOString?.() ?? row.lastSeenAt },
    { key: 'count', label: 'Occurrences' },
    { key: 'status', label: 'Status' },
    { key: 'name', label: 'Type' },
    { key: 'message', label: 'Message' },
    { key: 'method', label: 'Method' },
    { key: 'route', label: 'Route' },
    { key: 'statusCode', label: 'Status code' },
    { key: 'regressionCount', label: 'Regressions' },
    { key: 'fingerprint', label: 'Fingerprint' },
  ],
  security: [
    { label: 'At', value: (row) => row.createdAt?.toISOString?.() ?? row.createdAt },
    { key: 'type', label: 'Event' },
    { key: 'severity', label: 'Severity' },
    { key: 'actorEmail', label: 'Account' },
    { key: 'actorRole', label: 'Role' },
    { key: 'ipHash', label: 'Source (hashed)' },
    { key: 'route', label: 'Route' },
    { label: 'Detail', value: (row) => (row.detail ? JSON.stringify(row.detail) : '') },
    { key: 'correlationId', label: 'Request id' },
  ],
  visitors: [
    { label: 'Started', value: (row) => row.startedAt?.toISOString?.() ?? row.startedAt },
    { key: 'landingPath', label: 'Landing page' },
    { key: 'exitPath', label: 'Exit page' },
    { key: 'pageViewCount', label: 'Pages' },
    { label: 'Source', value: (row) => row.utm?.source ?? row.referrerHost ?? 'direct' },
    { label: 'Campaign', value: (row) => row.utm?.campaign ?? '' },
    { key: 'device', label: 'Device' },
    { key: 'browser', label: 'Browser' },
    { label: 'Enquired', value: (row) => (row.converted ? 'yes' : 'no') },
    { key: 'isBot', label: 'Bot' },
  ],
};

/*
 * The observability dashboard's API.
 *
 * Reading is gated on observability.view, which admins and the owner hold.
 * Exporting is a second, separate permission: the rows carry hashed addresses,
 * user agents and correlation ids that are reasonable on screen for someone
 * investigating an incident and worth a deliberate decision before they leave
 * as a file.
 */
export default async function adminObservabilityRoutes(fastify) {
  fastify.get(
    '/observability/summary',
    {
      preHandler: fastify.requirePermission('observability.view'),
      preValidation: validate({ query: rangeQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Traffic, latency and error-rate headline figures',
        description:
          'Percentiles are read from summed latency histograms, so p95 over a week is the real ' +
          'p95 rather than an average of per-minute percentiles.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Summary', type: 'object' } },
      },
    },
    async (request) => ({ data: await trafficSummary(request.query) }),
  );

  fastify.get(
    '/observability/series',
    {
      preHandler: fastify.requirePermission('observability.view'),
      preValidation: validate({ query: rangeQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Request volume, errors and latency over time',
        description: 'Rolled up server-side to a granularity that suits the range.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Series', type: 'object' } },
      },
    },
    async (request) => ({ data: await trafficSeries(request.query) }),
  );

  fastify.get(
    '/observability/routes',
    {
      preHandler: fastify.requirePermission('observability.view'),
      preValidation: validate({ query: routesQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Per-endpoint traffic and latency',
        description:
          'Sort by `time` to find where optimising would actually help: a slow endpoint called ' +
          'twice a day costs less than a middling one called constantly.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Routes', type: 'object' } },
      },
    },
    async (request) => ({ data: await routeBreakdown(request.query) }),
  );

  fastify.get(
    '/observability/errors',
    {
      preHandler: fastify.requirePermission('observability.view'),
      preValidation: validate({ query: errorsQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Grouped errors',
        description:
          'One row per distinct fault, not per occurrence. A group marked resolved reopens by ' +
          'itself if the fault happens again, and the regression is counted.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Error groups', type: 'object' } },
      },
    },
    async (request) => {
      const { items, total, page, pageSize, openCount } = await listErrors(request.query);
      return { data: items, meta: { total, page, pageSize, openCount } };
    },
  );

  fastify.get(
    '/observability/errors/:id',
    {
      preHandler: fastify.requirePermission('observability.view'),
      preValidation: validate({ params: z.object({ id: objectId }) }),
      schema: {
        tags: ['admin:ops'],
        summary: 'One error group with its stack and recent occurrences',
        security: [{ bearerAuth: [] }],
        response: {
          200: { description: 'Error group', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => ({ data: await getError(request.params.id) }),
  );

  fastify.patch(
    '/observability/errors/:id',
    {
      preHandler: fastify.requirePermission('observability.resolve'),
      preValidation: validate({
        params: z.object({ id: objectId }),
        body: errorStatusBody,
      }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Acknowledge or resolve an error group',
        description:
          'Resolving records who did it and when. If the same fault occurs again the group ' +
          'reopens automatically, so the status always reflects reality rather than intent.',
        security: [{ bearerAuth: [] }],
        params: docSchema(z.object({ id: objectId }), 'ErrorIdParams'),
        body: docSchema(errorStatusBody, 'ErrorStatus'),
        response: {
          200: { description: 'Updated', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const group = await setErrorStatus(request.params.id, request.body, request.user);
      await recordAudit({
        request,
        action: 'error.status',
        entity: 'error_event',
        entityId: group._id,
        entityLabel: `${group.name}: ${group.message}`.slice(0, 120),
        after: { status: group.status, note: group.note },
      });
      return { data: group };
    },
  );

  fastify.get(
    '/observability/security',
    {
      preHandler: fastify.requirePermission('security.view'),
      preValidation: validate({ query: securityQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Security timeline',
        description:
          'Sign-ins, failures, lockouts, denied permissions, tripped rate limits and refresh ' +
          'token reuse. Source addresses are keyed hashes, never the addresses themselves.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Events', type: 'object' } },
      },
    },
    async (request) => {
      const { items, total, page, pageSize, byType, bySeverity, topFailingSources } =
        await securityTimeline(request.query);
      return {
        data: items,
        meta: { total, page, pageSize, byType, bySeverity, topFailingSources },
      };
    },
  );

  fastify.get(
    '/observability/visitors',
    {
      preHandler: fastify.requirePermission('observability.view'),
      preValidation: validate({ query: visitorsQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Visitor funnel and page performance',
        description:
          'Sessions, pages per session and per-page conversion. Crawlers are excluded by ' +
          'default and counted separately, so the conversion rate is a rate among people. ' +
          '`attributionGap` is the enquiries that arrived without a tracked visit — by phone, ' +
          'or with tracking blocked — so the attributed figure is never mistaken for the total.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Visitor summary', type: 'object' } },
      },
    },
    async (request) => ({ data: await visitorSummary(request.query) }),
  );

  fastify.get(
    '/observability/export.csv',
    {
      preHandler: fastify.requirePermission('observability.export'),
      preValidation: validate({ query: exportQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Export one observability dataset as CSV',
        description: 'Datasets: routes, errors, security, visitors.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'CSV file', type: 'string' } },
      },
    },
    async (request, reply) => {
      const { dataset, range } = request.query;
      const rows = await observabilityExport({ dataset, range });

      await recordAudit({
        request,
        action: 'observability.export',
        entity: 'observability',
        entityLabel: `${dataset} (${range}), ${rows.length} rows`,
        after: { dataset, range, count: rows.length },
      });

      const stamp = new Date().toISOString().slice(0, 10);
      reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="taifer-${dataset}-${stamp}.csv"`);
      return toCsv(rows, EXPORT_COLUMNS[dataset]);
    },
  );
}
