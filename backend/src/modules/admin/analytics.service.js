import { Lead } from '../../models/Lead.js';
import { NewsletterSubscriber } from '../../models/NewsletterSubscriber.js';
import { cached, cacheKey } from '../../lib/cache.js';

/*
 * Dashboard aggregates.
 *
 * All five run as one $facet so the dashboard is a single round trip over a
 * single index scan, rather than five separate passes over the same date
 * range. Cached briefly because a sales team refreshing this every few seconds
 * should not re-aggregate the collection each time.
 */
const CACHE_TTL = 60;

function rangeFilter(from, to) {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  return filter;
}

export async function leadAnalytics({ from, to, granularity = 'day' }) {
  const match = rangeFilter(from, to);

  // "%Y-%m-%d" for daily buckets, "%G-W%V" for ISO weeks.
  const format = granularity === 'week' ? '%G-W%V' : '%Y-%m-%d';

  const run = async () => {
    const [result] = await Lead.aggregate([
      { $match: match },
      {
        $facet: {
          overTime: [
            { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, bucket: '$_id', count: 1 } },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
          ],
          bySource: [
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, source: '$_id', count: 1 } },
          ],
          bySourcePage: [
            { $match: { 'context.sourcePage': { $nin: [null, ''] } } },
            { $group: { _id: '$context.sourcePage', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
            { $project: { _id: 0, page: '$_id', count: 1 } },
          ],
          byInterest: [
            {
              $project: {
                label: {
                  $ifNull: [
                    '$interest.title',
                    { $ifNull: ['$tripPreferences.destination', '$topic'] },
                  ],
                },
                status: 1,
              },
            },
            { $match: { label: { $nin: [null, ''] } } },
            {
              $group: {
                _id: '$label',
                count: { $sum: 1 },
                converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 15 },
            { $project: { _id: 0, label: '$_id', count: 1, converted: 1 } },
          ],
          byCampaign: [
            { $match: { 'utm.source': { $nin: [null, ''] } } },
            {
              $group: {
                _id: { source: '$utm.source', campaign: '$utm.campaign' },
                count: { $sum: 1 },
                converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 15 },
            {
              $project: {
                _id: 0,
                source: '$_id.source',
                campaign: '$_id.campaign',
                count: 1,
                converted: 1,
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
                lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                unhandled: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
              },
            },
            { $project: { _id: 0 } },
          ],
          /* Anything whose alerts never made it out. A non-zero number here is
           * an operational alarm, not a statistic. */
          stuckNotifications: [
            {
              $match: {
                $or: [
                  { 'notifications.adminEmail.status': { $in: ['pending', 'failed'] } },
                  { 'notifications.customerEmail.status': { $in: ['pending', 'failed'] } },
                ],
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const totals = result.totals[0] ?? { total: 0, converted: 0, lost: 0, unhandled: 0 };

    return {
      range: { from: from ?? null, to: to ?? null, granularity },
      totals: {
        ...totals,
        conversionRate: totals.total > 0 ? Number((totals.converted / totals.total).toFixed(4)) : 0,
      },
      overTime: result.overTime,
      byStatus: result.byStatus,
      bySource: result.bySource,
      bySourcePage: result.bySourcePage,
      byInterest: result.byInterest,
      byCampaign: result.byCampaign,
      stuckNotifications: result.stuckNotifications[0]?.count ?? 0,
    };
  };

  return cached(
    cacheKey('analytics:leads', { from: from?.toISOString(), to: to?.toISOString(), granularity }),
    run,
    { ttl: CACHE_TTL, tags: ['analytics'] },
  );
}

export async function newsletterAnalytics() {
  const rows = await NewsletterSubscriber.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  const byStatus = Object.fromEntries(rows.map((row) => [row.status, row.count]));
  const requested = (byStatus.pending ?? 0) + (byStatus.confirmed ?? 0);

  return {
    byStatus,
    /* The number that predicts deliverability: what share of signups ever
     * confirm. Below roughly 0.4 the opt-in email is landing in spam. */
    confirmationRate: requested > 0 ? Number(((byStatus.confirmed ?? 0) / requested).toFixed(4)) : 0,
  };
}
