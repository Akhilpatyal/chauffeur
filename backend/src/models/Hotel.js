import mongoose from 'mongoose';
import { contentPlugin } from './contentBase.js';

const { Schema } = mongoose;

const hotelSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  location: { type: String, trim: true, maxlength: 200, index: true },
  destination: { type: Schema.Types.ObjectId, ref: 'Destination', default: null, index: true },
  distanceLabel: { type: String, maxlength: 80 },

  /* Nightly rate in whole rupees. Numeric because the hotels page filters on
   * price ranges and sorts by price; a formatted string cannot do either. */
  price: { type: Number, min: 0, index: true },
  strikePrice: { type: Number, min: 0 },
  discountPercent: { type: Number, min: 0, max: 100 },
  currency: { type: String, default: 'INR' },

  rating: { type: Number, min: 0, max: 5, default: 0, index: true },
  ratingLabel: { type: String, maxlength: 40 },
  reviewsCount: { type: Number, min: 0, default: 0 },
  star: { type: Number, min: 0, max: 5, default: 0, index: true },

  type: { type: String, trim: true, maxlength: 80, index: true },
  amenities: { type: [String], default: [], index: true },
  experience: { type: [String], default: [], index: true },
  bookingPerks: { type: [String], default: [] },
  freeCancellation: { type: Boolean, default: false, index: true },

  badge: { type: String, maxlength: 60 },
  badgeTone: { type: String, enum: ['gold', 'forest', 'coral', ''], default: '' },
  description: { type: String, trim: true, maxlength: 3000 },
  image: String,
  gallery: { type: [String], default: [] },

  /* Editor's picks rail on the hotels page. */
  isEditorsPick: { type: Boolean, default: false, index: true },
});

contentPlugin(hotelSchema, { searchFields: ['name', 'location', 'description'] });

/* The hotels page filters on several facets at once, then sorts. These
 * compounds cover the combinations the UI can actually produce. */
hotelSchema.index({ status: 1, price: 1 });
hotelSchema.index({ status: 1, rating: -1, price: 1 });
hotelSchema.index({ status: 1, type: 1, price: 1 });
hotelSchema.index({ status: 1, amenities: 1, price: 1 });
hotelSchema.index({ status: 1, star: 1, price: 1 });

export const Hotel = mongoose.models.Hotel ?? mongoose.model('Hotel', hotelSchema);
export default Hotel;
