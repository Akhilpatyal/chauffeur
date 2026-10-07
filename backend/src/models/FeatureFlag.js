import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Runtime switches, editable from the dashboard without a redeploy.
 *
 * The one that matters operationally is `submissions_enabled`: turning it off
 * makes the forms return a 503 with a message the frontend can show, instead
 * of the silent failure this backend exists to fix.
 */
export const FLAG_DEFAULTS = {
  submissions_enabled: {
    value: true,
    description: 'Master switch for public form submissions (leads + newsletter).',
    message: 'Our enquiry desk is briefly offline for maintenance. Please call us or try again in a few minutes.',
  },
  newsletter_enabled: {
    value: true,
    description: 'Accept new newsletter signups.',
    message: 'Newsletter signups are paused right now. Please try again shortly.',
  },
  maintenance_mode: {
    value: false,
    description: 'Return 503 for every write endpoint, public and admin.',
    message: 'We are performing scheduled maintenance. Please try again in a few minutes.',
  },
};

const featureFlagSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Boolean, required: true },
    description: { type: String, maxlength: 300 },
    /* Shown to the user when the flag blocks their action. */
    message: { type: String, maxlength: 300 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

export const FeatureFlag =
  mongoose.models.FeatureFlag ?? mongoose.model('FeatureFlag', featureFlagSchema);
export default FeatureFlag;
