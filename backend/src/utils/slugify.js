export function slugify(input) {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/*
 * Appends -2, -3, ... until the slug is free. Used on content create/update so
 * two journeys called "Spiti Valley" cannot collide on the unique index.
 */
export async function uniqueSlug(Model, base, excludeId = null) {
  const root = slugify(base) || 'item';
  let candidate = root;
  let suffix = 1;
  // Bounded: a runaway loop here would hold a request open indefinitely.
  while (suffix < 200) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await Model.exists(query);
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return `${root}-${Date.now()}`;
}
