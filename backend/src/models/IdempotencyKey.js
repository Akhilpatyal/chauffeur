import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Stores the response of a completed request against its idempotency key, so a
 * retry (double-click, flaky network, browser replay) returns the original
 * result instead of creating a second lead.
 *
 * The unique index on `key` is the actual concurrency guard: two simultaneous
 * submits race to insert, the loser gets a duplicate-key error and reads the
 * winner's stored response.
 */
const idempotencyKeySchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    scope: { type: String, required: true },
    /* Digest of the request body: same key with a different payload is a
     * client bug and is rejected rather than silently returning the old row. */
    requestHash: { type: String, required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    statusCode: Number,
    response: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyKey =
  mongoose.models.IdempotencyKey ?? mongoose.model('IdempotencyKey', idempotencyKeySchema);
export default IdempotencyKey;
