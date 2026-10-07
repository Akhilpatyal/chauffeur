import { notFound } from '../../lib/errors.js';
import { cached, invalidateTags, cacheKey } from '../../lib/cache.js';
import { paginate, pageResult, parseSort } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { escapeRegex } from './registry.js';

/*
 * Shared read/write logic for every content collection.
 *
 * Public reads go through the cache; admin reads never do, because an editor
 * who saves a change and does not see it has no way to tell a cache from a bug.
 */
function searchFilter(type, search) {
  if (!search) return {};
  // Prefix-anchored regex on the label field rather than $text: editors search
  // by the first few characters of a title, which $text cannot match.
  const pattern = new RegExp(escapeRegex(search), 'i');
  return { $or: [{ [type.labelField]: pattern }, { slug: pattern }] };
}

export async function listContent(typeKey, type, query, { includeDrafts = false } = {}) {
  const statusFilter = includeDrafts
    ? query.status && query.status !== 'all'
      ? { status: query.status }
      : {}
    : { status: 'published' };

  const filter = {
    ...statusFilter,
    ...type.buildFilter(query),
    ...searchFilter(type, query.search),
  };
  if (query.featured !== undefined) filter.isFeatured = query.featured;

  const sort = parseSort(query.sort, type.sortable, type.defaultSort);
  const { skip, limit } = paginate(query);

  const run = async () => {
    // countDocuments and find are issued together; both are index-backed.
    const [items, total] = await Promise.all([
      type.model.find(filter).select(type.listFields).sort(sort).skip(skip).limit(limit).lean(),
      type.model.countDocuments(filter),
    ]);
    return pageResult(items, total, query);
  };

  if (includeDrafts) return run();

  return cached(cacheKey(`content:${typeKey}:list`, query), run, {
    tags: [type.cacheTag],
  });
}

export async function getContentBySlug(typeKey, type, slug, { includeDrafts = false } = {}) {
  const filter = includeDrafts ? { slug } : { slug, status: 'published' };

  const run = async () => {
    const doc = await type.model.findOne(filter).lean();
    if (!doc) throw notFound(type.label);
    return { data: doc };
  };

  if (includeDrafts) return run();

  return cached(cacheKey(`content:${typeKey}:detail`, { slug }), run, {
    tags: [type.cacheTag],
  });
}

export async function getContentById(type, id) {
  const doc = await type.model.findById(id).lean();
  if (!doc) throw notFound(type.label);
  return doc;
}

export async function createContent(type, data, userId) {
  const payload = type.transformWrite ? type.transformWrite(data) : data;
  const slug = await uniqueSlug(type.model, payload.slug ?? payload[type.slugSource]);

  const doc = await type.model.create({
    ...payload,
    slug,
    createdBy: userId,
    updatedBy: userId,
  });

  await invalidateTags(type.cacheTag);
  return doc.toJSON();
}

export async function updateContent(type, id, data, userId) {
  const existing = await type.model.findById(id);
  if (!existing) throw notFound(type.label);

  const payload = type.transformWrite ? type.transformWrite(data) : data;

  // Only re-slug when the editor explicitly changed it. Silently renaming a
  // slug because a title was edited would break every published link to it.
  if (payload.slug && payload.slug !== existing.slug) {
    payload.slug = await uniqueSlug(type.model, payload.slug, existing._id);
  } else {
    delete payload.slug;
  }

  existing.set({ ...payload, updatedBy: userId });
  await existing.save();

  await invalidateTags(type.cacheTag);
  return existing.toJSON();
}

export async function deleteContent(type, id) {
  const doc = await type.model.findByIdAndDelete(id);
  if (!doc) throw notFound(type.label);
  await invalidateTags(type.cacheTag);
  return doc.toJSON();
}

/* Used by the homepage aggregate endpoint below. */
export async function featuredFor(type, limit = 6) {
  return type.model
    .find({ status: 'published', isFeatured: true })
    .select(type.listFields)
    .sort(type.defaultSort)
    .limit(limit)
    .lean();
}
