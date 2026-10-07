import mongoose from 'mongoose';

const { Schema } = mongoose;

export const CONTENT_STATUSES = ['draft', 'published', 'archived'];

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
