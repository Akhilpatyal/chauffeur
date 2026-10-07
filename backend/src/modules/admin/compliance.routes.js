import { z } from 'zod';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { Lead } from '../../models/Lead.js';
import { NewsletterSubscriber } from '../../models/NewsletterSubscriber.js';
import { notFound } from '../../lib/errors.js';
import { recordAudit } from '../../services/audit.js';
import { contactKeyFor } from '../../utils/identity.js';
import { anonymiseLead } from '../../services/retention.js';

const subjectQuery = z.object({
  email: z.string().email().max(254),
});

/*
 * Data-subject requests, as endpoints rather than as a paragraph in the privacy
 * policy. Someone will eventually email asking what you hold on them, and the
 * answer needs to take a minute, not a developer.
 */
export default async function complianceRoutes(fastify) {
  fastify.get(
    '/compliance/subject',
    {
      preHandler: fastify.requirePermission('compliance:export'),
      preValidation: validate({ query: subjectQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Export everything held about one email address',
        description:
          'Matches on the normalised contact key, so aliases of the same address ' +
          '(plus-tags, Gmail dots) are included.',
        security: [{ bearerAuth: [] }],
        querystring: docSchema(subjectQuery, 'SubjectQuery'),
        response: {
          200: { description: 'All records for that person', type: 'object' },
          404: { description: 'Nothing held', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const email = request.query.email.toLowerCase();
      const contactKey = contactKeyFor(email);

      const [leads, subscriptions] = await Promise.all([
        Lead.find({ $or: [{ email }, { contactKey }] }).lean(),
        NewsletterSubscriber.find({ email }).lean(),
      ]);

      if (leads.length === 0 && subscriptions.length === 0) {
        throw notFound('Any record for that address');
      }

      await recordAudit({
        request,
        action: 'compliance.export',
        entity: 'data_subject',
        entityId: contactKey,
        entityLabel: email,
        after: { leads: leads.length, subscriptions: subscriptions.length },
      });

      return {
        data: {
          email,
          exportedAt: new Date().toISOString(),
          leads,
          newsletterSubscriptions: subscriptions,
        },
      };
    },
  );

  fastify.delete(
    '/compliance/subject',
    {
      preHandler: fastify.requirePermission('compliance:erase'),
      preValidation: validate({ query: subjectQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Erase everything held about one email address',
        description:
          'Leads are anonymised rather than deleted: the personal fields are cleared while ' +
          'the row survives, so historical conversion figures do not silently change. ' +
          'Newsletter records are deleted outright.',
        security: [{ bearerAuth: [] }],
        querystring: docSchema(subjectQuery, 'SubjectQuery'),
        response: { 200: { description: 'What was erased', type: 'object' } },
      },
    },
    async (request) => {
      const email = request.query.email.toLowerCase();
      const contactKey = contactKeyFor(email);

      const leads = await Lead.find({ $or: [{ email }, { contactKey }] }).select('_id').lean();
      for (const lead of leads) await anonymiseLead(lead._id);

      const removed = await NewsletterSubscriber.deleteMany({ email });

      await recordAudit({
        request,
        action: 'compliance.erase',
        entity: 'data_subject',
        entityId: contactKey,
        entityLabel: email,
        after: { leadsAnonymised: leads.length, subscriptionsDeleted: removed.deletedCount },
      });

      return {
        data: {
          leadsAnonymised: leads.length,
          subscriptionsDeleted: removed.deletedCount,
        },
      };
    },
  );
}
