import mongoose from 'mongoose';
import { contentPlugin, moneySchema } from './contentBase.js';

const { Schema } = mongoose;

const itineraryDaySchema = new Schema(
  {
    day: { type: String, trim: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    meta: { type: [String], default: [] },
    image: String,
  },
  { _id: false },
);

const journeySchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  location: { type: String, trim: true, maxlength: 200, index: true },
  destination: { type: Schema.Types.ObjectId, ref: 'Destination', default: null, index: true },
  duration: { type: String, trim: true, maxlength: 80 },
  durationDays: { type: Number, min: 0, index: true },
  difficulty: {
    type: String,
    enum: ['Easy', 'Easy to Moderate', 'Moderate', 'Moderate to Challenging', 'Challenging', ''],
    default: '',
    index: true,
  },
  elevation: { type: String, trim: true, maxlength: 60 },
  groupSize: { type: String, trim: true, maxlength: 60 },

  price: moneySchema,
  originalPrice: moneySchema,
  discountLabel: { type: String, maxlength: 40 },

  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewsCount: { type: Number, min: 0, default: 0 },

  description: { type: String, trim: true, maxlength: 3000 },
  highlights: { type: [String], default: [] },
  inclusions: { type: [String], default: [] },
  exclusions: { type: [String], default: [] },
  itinerary: { type: [itineraryDaySchema], default: [] },
  upcomingDates: { type: [String], default: [] },

  image: String,
  secondaryImage: String,
  gallery: { type: [String], default: [] },
  videoUrl: String,

  tags: { type: [String], default: [], index: true },

  /*
   * Fully authored detail-page content for the journeys that have one. The
   * frontend already derives a detail page from the base fields when this is
   * absent, so it stays optional and loosely typed rather than forcing every
   * journey through one rigid page schema.
   */
  detail: { type: Schema.Types.Mixed, default: null },
});

contentPlugin(journeySchema, { searchFields: ['title', 'location', 'description'] });

/* Filter combinations the listing page offers: destination, difficulty,
 * price band and tags, each sorted by rating or price. */
journeySchema.index({ status: 1, 'price.amount': 1 });
journeySchema.index({ status: 1, rating: -1 });
journeySchema.index({ status: 1, tags: 1, 'price.amount': 1 });
journeySchema.index({ status: 1, difficulty: 1, durationDays: 1 });

export const Journey = mongoose.models.Journey ?? mongoose.model('Journey', journeySchema);
export default Journey;
