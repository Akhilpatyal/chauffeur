import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Double opt-in is not optional here: single opt-in lists get throttled by
 * every serious ESP, and the consent timestamp + IP below is the record you
 * need if a subscriber ever disputes the signup.
 */
const newsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'unsubscribed', 'bounced'],
      default: 'pending',
      index: true,
    },

    /* Consent record */
    consent: {
      requestedAt: { type: Date, default: Date.now },
      confirmedAt: Date,
      ipHash: String,
      userAgent: { type: String, maxlength: 500 },
      sourcePage: { type: String, maxlength: 500 },
    },

    /* Opt-in token digest; the plaintext only ever exists in the email link. */
    confirmTokenHash: { type: String, default: null },
    confirmTokenExpiresAt: { type: Date, default: null },
    confirmationsSent: { type: Number, default: 0 },

    unsubscribeTokenHash: { type: String, default: null },
    unsubscribedAt: Date,
    unsubscribeReason: { type: String, maxlength: 300 },

    utm: {
      source: String,
      medium: String,
      campaign: String,
    },

    welcomeEmail: {
      status: { type: String, enum: ['pending', 'queued', 'sent', 'failed', 'skipped'], default: 'pending' },
      attempts: { type: Number, default: 0 },
      sentAt: Date,
      lastError: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.confirmTokenHash;
        delete ret.unsubscribeTokenHash;
        return ret;
      },
    },
  },
);

newsletterSubscriberSchema.index({ status: 1, createdAt: -1 });
newsletterSubscriberSchema.index({ confirmTokenHash: 1 }, { sparse: true });
newsletterSubscriberSchema.index({ unsubscribeTokenHash: 1 }, { sparse: true });
/* Retention sweep: unconfirmed signups are deleted, not kept forever. */
newsletterSubscriberSchema.index({ status: 1, 'consent.requestedAt': 1 });

export const NewsletterSubscriber =
  mongoose.models.NewsletterSubscriber ??
  mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
export default NewsletterSubscriber;
