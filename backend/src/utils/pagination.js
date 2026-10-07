import { z } from 'zod';

/*
 * Every list endpoint is paginated. Unbounded arrays are how a fast endpoint
 * becomes a 12-second endpoint the week a content editor adds 400 rows.
 */
export const MAX_PAGE_SIZE = 100;

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export function paginate({ page, limit }) {
  return { skip: (page - 1) * limit, limit };
}

export function pageResult(items, total, { page, limit }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

/*
 * Parses "sort=-createdAt,title" into a Mongoose sort object, allowing only
 * fields on an explicit allow-list so a caller cannot force an unindexed sort
 * (and a collection scan) on a public endpoint.
 */
export function parseSort(input, allowed, fallback = { createdAt: -1 }) {
  if (!input) return fallback;
  const sort = {};
  for (const token of String(input).split(',')) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const direction = trimmed.startsWith('-') ? -1 : 1;
    const field = trimmed.replace(/^[-+]/, '');
    if (allowed.includes(field)) sort[field] = direction;
  }
  return Object.keys(sort).length > 0 ? sort : fallback;
}
