import mongoose from 'mongoose';

const { Schema } = mongoose;

export const CONTENT_STATUSES = ['draft', 'published', 'archived'];

/*
 * Whether we are selling a thing, and if not, why not.
 *
 *   open        — bookable now.
 *   coming_soon — ours eventually; no date promised.
 *   seasonal    — ours, but out of season; there is a date and we say it.
 *
 * `status` already answers "should this be on the site at all" (draft and
 * archived are filtered out of every public read). This answers the different
 * question of whether the thing on the site can be booked, which is why it is
 * a separate field rather than two more values on `status`: a trip that is
 * shut for the winter still needs its page, its photographs and its
 * itinerary, and hiding it would lose the demand as well as the sale.
 */
export const AVAILABILITY_STATES = ['open', 'coming_soon', 'seasonal'];

/*
 * Shared shape for every editorial collection.
 *
 * `slug` is the public identifier the frontend routes on. It is seeded from
 * the ids already hardcoded in the frontend data files, so existing links keep
 * working after the migration.
 *
 * `legacyId` keeps the original hardcoded id even if the slug is later
 * renamed, which is what makes the seed script re-runnable and idempotent.
 */
export function contentPlugin(schema, { searchFields = [] } = {}) {
  schema.add({
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
    legacyId: { type: String, index: true, sparse: true },
    status: { type: String, enum: CONTENT_STATUSES, default: 'published', index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    /* Manual ordering for editorially curated rails. Lower sorts first. */
    sortOrder: { type: Number, default: 100 },
    publishedAt: { type: Date, default: Date.now },

    availability: {
      state: {
        type: String,
        enum: AVAILABILITY_STATES,
        /* Closed unless somebody opens it. A record created without anybody
         * thinking about availability should not quietly go on sale. */
        default: 'coming_soon',
        index: true,
      },
      /*
       * The date it opens by itself.
       *
       * This is what lets the desk schedule a season instead of remembering
       * to flip a switch at 6am on the first of May. `effectiveAvailability`
       * treats a closed record whose date has passed as open, so nothing has
       * to run for the change to happen — no cron, no sweeper, no deploy.
       */
      opensOn: { type: Date, default: null },
      /* Shown to the customer in place of the booking controls. Left empty,
       * the site falls back to its own wording rather than printing a blank
       * panel. */
      headline: { type: String, trim: true, maxlength: 160, default: null },
      note: { type: String, trim: true, maxlength: 600, default: null },
    },
    seo: {
      title: { type: String, maxlength: 200 },
      description: { type: String, maxlength: 400 },
      ogImage: String,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  });

  schema.set('timestamps', true);
  schema.set('toJSON', {
    virtuals: true,
    transform(_doc, ret) {
      delete ret.__v;
      return ret;
    },
  });

  /* The listing query every public endpoint runs. */
  schema.index({ status: 1, sortOrder: 1, createdAt: -1 });
  schema.index({ status: 1, isFeatured: -1, sortOrder: 1 });

  if (searchFields.length > 0) {
    const textIndex = Object.fromEntries(searchFields.map((field) => [field, 'text']));
    schema.index(textIndex, { name: `${schema.options.collection ?? 'content'}_search` });
  }

  schema.statics.publicFilter = function publicFilter(extra = {}) {
    return { status: 'published', ...extra };
  };

  /*
   * What this record's availability actually is right now.
   *
   * Read this rather than `availability.state` anywhere a decision depends on
   * it. The stored state is what the desk set; this is that state with the
   * opening date applied, and the two differ for exactly as long as it takes
   * somebody to notice a season has started.
   */
  schema.methods.effectiveAvailability = function effectiveAvailability(now = new Date()) {
    const stored = this.availability ?? {};
    const state = stored.state ?? 'coming_soon';
    const opensOn = stored.opensOn ? new Date(stored.opensOn) : null;

    const open = state === 'open' || Boolean(opensOn && opensOn <= now);

    return {
      state: open ? 'open' : state,
      opensOn: opensOn ? opensOn.toISOString() : null,
      headline: stored.headline ?? null,
      note: stored.note ?? null,
      /* True only while the date is still ahead of us, so the UI can say
       * "opens on the 4th" without first comparing dates itself. */
      opensLater: Boolean(opensOn && opensOn > now),
    };
  };

  schema.index({ 'availability.state': 1, 'availability.opensOn': 1 });

  return schema;
}

/* Reusable leaf shapes. */
export const moneySchema = {
  amount: { type: Number, min: 0 },
  currency: { type: String, default: 'INR' },
  /* The pre-formatted string the designs use, kept so the frontend renders
   * exactly what it does today without locale guesswork. */
  display: { type: String, maxlength: 40 },
};

export const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, maxlength: 300 },
    width: Number,
    height: Number,
    /* S3 object key, so deleting the record can delete the file too. */
    key: String,
  },
  { _id: false },
);
