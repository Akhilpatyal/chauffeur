import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import {
  listLeadsQuery,
  updateLeadStatusBody,
  assignLeadBody,
  addNoteBody,
  leadIdParams,
} from '../leads/schemas.js';
import {
  listLeads,
  getLead,
  updateStatus,
  assignLead,
  addNote,
  resendNotifications,
  leadsForExport,
} from '../leads/adminService.js';
import { recordAudit } from '../../services/audit.js';
import { toCsv } from '../../utils/csv.js';

const EXPORT_COLUMNS = [
  { key: 'createdAt', label: 'Received' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'topic', label: 'Interest' },
  { key: 'travelDates', label: 'Travel dates' },
  { key: 'groupSize', label: 'Travellers' },
  { label: 'Destination', value: (lead) => lead.tripPreferences?.destination },
  { label: 'Budget', value: (lead) => lead.tripPreferences?.budget },
  { label: 'Assigned to', value: (lead) => lead.assignedTo?.name },
  { label: 'Campaign', value: (lead) => lead.utm?.campaign },
  { label: 'Source page', value: (lead) => lead.context?.sourcePage },
  { key: 'enquiryCount', label: 'Enquiries' },
  { key: 'message', label: 'Message' },
];

export default async function adminLeadRoutes(fastify) {
  fastify.get(
    '/leads',
    {
      preHandler: fastify.requirePermission('leads:read'),
      preValidation: validate({ query: listLeadsQuery }),
      schema: {
        tags: ['admin:leads'],
        summary: 'List leads',
        description:
          'Filterable by status, source, assignee, free text and date range. By default ' +
          'follow-up enquiries are folded into their contact thread; pass ' +
          '`includeDuplicates=true` to see every individual submission.',
        security: [{ bearerAuth: [] }],
        querystring: docSchema(listLeadsQuery, 'ListLeadsQuery'),
        response: { 200: { description: 'A page of leads', type: 'object' } },
      },
    },
    async (request) => listLeads(request.query),
  );

  fastify.get(
    '/leads/export.csv',
    {
      preHandler: fastify.requirePermission('leads:export'),
      preValidation: validate({ query: listLeadsQuery }),
      schema: {
        tags: ['admin:leads'],
        summary: 'Export the current lead filter as CSV',
        description: 'Applies the same filters as the list endpoint. Capped at 10,000 rows.',
        security: [{ bearerAuth: [] }],
        querystring: docSchema(listLeadsQuery, 'ExportLeadsQuery'),
        response: { 200: { description: 'CSV file', type: 'string' } },
      },
    },
    async (request, reply) => {
      const rows = await leadsForExport(request.query);
      await recordAudit({
        request,
        action: 'leads.export',
        entity: 'lead',
        entityLabel: `${rows.length} rows`,
        after: { filters: request.query, count: rows.length },
      });

      const stamp = new Date().toISOString().slice(0, 10);
      reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="taifer-leads-${stamp}.csv"`);
      return toCsv(rows, EXPORT_COLUMNS);
    },
  );

  fastify.get(
    '/leads/:id',
    {
      preHandler: fastify.requirePermission('leads:read'),
      preValidation: validate({ params: leadIdParams }),
      schema: {
        tags: ['admin:leads'],
        summary: 'Get one lead with its contact thread',
        security: [{ bearerAuth: [] }],
        params: docSchema(leadIdParams, 'LeadIdParams'),
        response: {
          200: { description: 'The lead', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => ({ data: await getLead(request.params.id) }),
  );

  fastify.patch(
    '/leads/:id/status',
    {
      preHandler: fastify.requirePermission('leads:write'),
      preValidation: validate({ params: leadIdParams, body: updateLeadStatusBody }),
      schema: {
        tags: ['admin:leads'],
        summary: 'Change a lead status',
        security: [{ bearerAuth: [] }],
        params: docSchema(leadIdParams, 'LeadIdParams'),
        body: docSchema(updateLeadStatusBody, 'UpdateLeadStatus'),
        response: { 200: { description: 'Updated lead', type: 'object' } },
      },
    },
    async (request) => {
      const result = await updateStatus(request.params.id, request.body, request.user);
      if (result.previous !== undefined) {
        await recordAudit({
          request,
          action: 'lead.status',
          entity: 'lead',
          entityId: request.params.id,
          entityLabel: result.lead.email,
          before: { status: result.previous },
          after: { status: request.body.status, reason: request.body.reason },
        });
      }
      return { data: result.lead ?? result };
    },
  );

  fastify.patch(
    '/leads/:id/assign',
    {
      preHandler: fastify.requirePermission('leads:write'),
      preValidation: validate({ params: leadIdParams, body: assignLeadBody }),
      schema: {
        tags: ['admin:leads'],
        summary: 'Assign a lead to a team member',
        description: 'Pass `assignedTo: null` to unassign.',
        security: [{ bearerAuth: [] }],
        params: docSchema(leadIdParams, 'LeadIdParams'),
        body: docSchema(assignLeadBody, 'AssignLead'),
        response: { 200: { description: 'Updated lead', type: 'object' } },
      },
    },
    async (request) => {
      const result = await assignLead(request.params.id, request.body.assignedTo, request.user);
      await recordAudit({
        request,
        action: 'lead.assign',
        entity: 'lead',
        entityId: request.params.id,
        entityLabel: result.lead.email,
        before: { assignedTo: result.previous },
        after: { assignedTo: request.body.assignedTo },
      });
      return { data: result.lead };
    },
  );

  fastify.post(
    '/leads/:id/notes',
    {
      preHandler: fastify.requirePermission('leads:write'),
      preValidation: validate({ params: leadIdParams, body: addNoteBody }),
      schema: {
        tags: ['admin:leads'],
        summary: 'Add an internal note',
        security: [{ bearerAuth: [] }],
        params: docSchema(leadIdParams, 'LeadIdParams'),
        body: docSchema(addNoteBody, 'AddNote'),
        response: { 201: { description: 'The created note', type: 'object' } },
      },
    },
    async (request, reply) => {
      const note = await addNote(request.params.id, request.body.body, request.user);
      await recordAudit({
        request,
        action: 'lead.note',
        entity: 'lead',
        entityId: request.params.id,
        after: { note: request.body.body.slice(0, 200) },
      });
      return reply.status(201).send({ data: note });
    },
  );

  fastify.post(
    '/leads/:id/resend-notifications',
    {
      preHandler: fastify.requirePermission('leads:write'),
      preValidation: validate({ params: leadIdParams }),
      schema: {
        tags: ['admin:leads'],
        summary: 'Re-queue the alert and confirmation emails for a lead',
        description:
          'For a lead whose notifications exhausted their automatic retries, for example ' +
          'after a long outage at the email provider.',
        security: [{ bearerAuth: [] }],
        params: docSchema(leadIdParams, 'LeadIdParams'),
        response: { 202: { description: 'Re-queued', type: 'object' } },
      },
    },
    async (request, reply) => {
      const result = await resendNotifications(request.params.id);
      await recordAudit({
        request,
        action: 'lead.resend-notifications',
        entity: 'lead',
        entityId: request.params.id,
        after: result,
      });
      return reply.status(202).send({ data: result });
    },
  );
}
