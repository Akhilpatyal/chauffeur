import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { CONTENT_TYPES } from '../content/registry.js';
import { adminListQuery, idParams } from '../content/schemas.js';
import {
  listContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
} from '../content/service.js';
import { recordAudit, diffFields } from '../../services/audit.js';

/*
 * Admin CRUD for every content collection, generated from the registry.
 *
 * Writes are audited and invalidate the collection's cache tag through the
 * service layer, so a published edit is visible on the site immediately rather
 * than whenever the TTL happens to lapse.
 */
export default async function adminContentRoutes(fastify) {
  for (const [key, type] of Object.entries(CONTENT_TYPES)) {
    const base = `/content/${key}`;

    fastify.get(
      base,
      {
        preHandler: fastify.requirePermission('content:read'),
        preValidation: validate({ query: adminListQuery }),
        schema: {
          tags: ['admin:content'],
          summary: `List ${type.label.toLowerCase()}s including drafts`,
          security: [{ bearerAuth: [] }],
          querystring: docSchema(adminListQuery, `Admin${key}Query`),
          response: { 200: { description: 'A page of results', type: 'object' } },
        },
      },
      async (request) => listContent(key, type, request.query, { includeDrafts: true }),
    );

    fastify.get(
      `${base}/:id`,
      {
        preHandler: fastify.requirePermission('content:read'),
        preValidation: validate({ params: idParams }),
        schema: {
          tags: ['admin:content'],
          summary: `Get one ${type.label.toLowerCase()} by id`,
          security: [{ bearerAuth: [] }],
          params: docSchema(idParams, 'IdParams'),
          response: {
            200: { description: 'The record', type: 'object' },
            404: { description: 'Not found', ...errorResponseSchema },
          },
        },
      },
      async (request) => ({ data: await getContentById(type, request.params.id) }),
    );

    fastify.post(
      base,
      {
        preHandler: fastify.requirePermission('content:write'),
        preValidation: validate({ body: type.writeSchema }),
        schema: {
          tags: ['admin:content'],
          summary: `Create a ${type.label.toLowerCase()}`,
          security: [{ bearerAuth: [] }],
          body: docSchema(type.writeSchema, `${key}Write`),
          response: {
            201: { description: 'Created', type: 'object' },
            422: { description: 'Validation failed', ...errorResponseSchema },
          },
        },
      },
      async (request, reply) => {
        const created = await createContent(type, request.body, request.user.id);
        await recordAudit({
          request,
          action: 'content.create',
          entity: key,
          entityId: created._id,
          entityLabel: created[type.labelField],
          after: created,
        });
        return reply.status(201).send({ data: created });
      },
    );

    fastify.put(
      `${base}/:id`,
      {
        preHandler: fastify.requirePermission('content:write'),
        preValidation: validate({ params: idParams, body: type.writeSchema.partial() }),
        schema: {
          tags: ['admin:content'],
          summary: `Update a ${type.label.toLowerCase()}`,
          security: [{ bearerAuth: [] }],
          params: docSchema(idParams, 'IdParams'),
          body: docSchema(type.writeSchema.partial(), `${key}Update`),
          response: {
            200: { description: 'Updated', type: 'object' },
            404: { description: 'Not found', ...errorResponseSchema },
          },
        },
      },
      async (request) => {
        const before = await getContentById(type, request.params.id);
        const updated = await updateContent(type, request.params.id, request.body, request.user.id);

        // Only the fields that actually changed reach the audit log.
        const { before: prev, after: next } = diffFields(
          before,
          updated,
          Object.keys(request.body),
        );
        await recordAudit({
          request,
          action: 'content.update',
          entity: key,
          entityId: updated._id,
          entityLabel: updated[type.labelField],
          before: prev,
          after: next,
        });

        return { data: updated };
      },
    );

    fastify.delete(
      `${base}/:id`,
      {
        preHandler: fastify.requirePermission('content:publish'),
        preValidation: validate({ params: idParams }),
        schema: {
          tags: ['admin:content'],
          summary: `Delete a ${type.label.toLowerCase()}`,
          description:
            'Hard delete. Prefer setting status to `archived` for anything that has ever ' +
            'been published, so existing links do not 404 without warning.',
          security: [{ bearerAuth: [] }],
          params: docSchema(idParams, 'IdParams'),
          response: {
            200: { description: 'Deleted', type: 'object' },
            404: { description: 'Not found', ...errorResponseSchema },
          },
        },
      },
      async (request) => {
        const deleted = await deleteContent(type, request.params.id);
        await recordAudit({
          request,
          action: 'content.delete',
          entity: key,
          entityId: deleted._id,
          entityLabel: deleted[type.labelField],
          before: deleted,
        });
        return { data: { id: deleted._id, deleted: true } };
      },
    );
  }
}
