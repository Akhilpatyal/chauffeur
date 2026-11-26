import mongoose from 'mongoose';
import { minorAmountField, DEFAULT_CURRENCY } from '../utils/money.js';

const { Schema } = mongoose;

/*
 * A supplier: a guesthouse, a driver, a trekking outfit, a permit agent.
 *
 * Modelled separately from the allocations made against them because one
 * vendor serves many bookings, and because their contact details and agreed
 * rates are reference data the desk maintains once rather than retyping into
 * every trip.
 */
export const VENDOR_SERVICES = [
  'accommodation',
  'transport',
  'guide',
  'activity',
  'permit',
  'meals',
  'other',
];

const vendorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 180 },

    services: { type: [{ type: String, enum: VENDOR_SERVICES }], default: [] },
    /* Where they operate. Plain strings rather than a place reference: a
     * vendor's coverage is fuzzy ("upper Spiti") and forcing it into the
     * coordinates table would make it less accurate, not more. */
    locations: { type: [String], default: [] },

    contact: {
      person: { type: String, trim: true, maxlength: 120, default: null },
      phone: { type: String, trim: true, maxlength: 32, default: null },
      altPhone: { type: String, trim: true, maxlength: 32, default: null },
      email: { type: String, trim: true, lowercase: true, maxlength: 254, default: null },
      /* Most Himalayan suppliers answer WhatsApp long after they stop
       * answering email. */
      whatsapp: { type: String, trim: true, maxlength: 32, default: null },
    },

    /* Agreed rates, as reference for whoever builds a quotation. Internal:
     * these are our cost, not the customer's price. */
    rates: {
      type: [
        new Schema(
          {
            label: { type: String, trim: true, maxlength: 160 },
            service: { type: String, enum: VENDOR_SERVICES, default: 'other' },
            unitLabel: { type: String, trim: true, maxlength: 60, default: null },
            amount: minorAmountField(),
            season: { type: String, trim: true, maxlength: 80, default: null },
            note: { type: String, trim: true, maxlength: 300, default: null },
          },
          { _id: true },
        ),
      ],
      default: [],
      select: false,
    },

    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },

    /* How reliably they answer, maintained by the desk. Not shown to
     * customers; it exists so whoever is checking availability at 7am knows
     * who to ring first. */
    reliability: {
      type: String,
      enum: ['untested', 'reliable', 'slow', 'avoid'],
      default: 'untested',
    },

    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, maxlength: 4000, default: null, select: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  },
  { timestamps: true },
);

vendorSchema.index({ isActive: 1, name: 1 });
vendorSchema.index({ services: 1, isActive: 1 });

export const Vendor = mongoose.models.Vendor ?? mongoose.model('Vendor', vendorSchema);
export default Vendor;
