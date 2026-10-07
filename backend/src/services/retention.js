import { Lead } from '../models/Lead.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * Retention, implemented rather than promised.
 *
 * Leads are anonymised, not deleted: the row stays so that conversion history
 * and monthly figures do not change retroactively, but every field that
 * identifies a person is cleared. Converted leads are exempt, because those are
 * customer records with their own legal retention basis.
 */
export async function anonymiseLead(leadId) {
  await Lead.updateOne(
    { _id: leadId },
    {
      $set: {
        name: 'Anonymised',
        email: `anonymised-${leadId}@example.invalid`,
        contactKey: `anonymised-${leadId}`,
        phone: null,
        message: null,
        notes: [],
        anonymisedAt: new Date(),
        'context.userAgent': null,
        'context.ipHash': null,
        'context.referrer': null,
        'consent.ipHash': null,
      },
      $unset: { idempotencyKey: '' },
    },
  );
}

export async function runRetention({ dryRun = false } = {}) {
  const summary = { leadsAnonymised: 0, unconfirmedSubscribersDeleted: 0, dryRun };

  if (env.LEAD_RETENTION_DAYS > 0) {
    const cutoff = new Date(Date.now() - env.LEAD_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const stale = await Lead.find({
      anonymisedAt: null,
      status: { $nin: ['converted'] },
      updatedAt: { $lt: cutoff },
    })
      .select('_id')
      .limit(5_000)
      .lean();

    if (!dryRun) {
      for (const lead of stale) await anonymiseLead(lead._id);
    }
    summary.leadsAnonymised = stale.length;
  }

  if (env.NEWSLETTER_UNCONFIRMED_RETENTION_DAYS > 0) {
    const cutoff = new Date(
      Date.now() - env.NEWSLETTER_UNCONFIRMED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const filter = { status: 'pending', 'consent.requestedAt': { $lt: cutoff } };

    if (dryRun) {
      summary.unconfirmedSubscribersDeleted = await NewsletterSubscriber.countDocuments(filter);
    } else {
      const result = await NewsletterSubscriber.deleteMany(filter);
      summary.unconfirmedSubscribersDeleted = result.deletedCount;
    }
  }

  logger.info(summary, 'retention run complete');
  return summary;
}
