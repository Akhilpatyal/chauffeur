import mongoose from 'mongoose';
import { contentPlugin } from './contentBase.js';

const { Schema } = mongoose;

/* GeoJSON point. Both members are required, so a point is either complete or
 * absent — never half-populated. */
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const destinationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  state: { type: String, trim: true, maxlength: 120, index: true },
  tagline: { type: String, trim: true, maxlength: 300 },
  description: { type: String, trim: true, maxlength: 3000 },

  /*
   * Stored as a GeoJSON point so "journeys near me" is a schema change away,
   * not a rewrite. The display string the designs use is kept alongside.
   *
   * `default: undefined` is load-bearing: with a default on the inner `type`
   * field, every destination would be saved with a half-built point
   * ({ type: 'Point' } and no coordinates) and the 2dsphere index build would
   * fail outright, because a sparse index cannot skip a field that exists.
   */
  coordinates: { type: pointSchema, default: undefined },
  coordinatesLabel: { type: String, maxlength: 80 },

  elevation: { type: String, maxlength: 60 },
  bestSeason: { type: String, maxlength: 80 },
  temperature: { type: String, maxlength: 80 },

  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewsCount: { type: Number, min: 0, default: 0 },

  image: String,
  gallery: { type: [String], default: [] },
  /* Mosaic layout hint used by the destinations grid. */
  aspectRatio: { type: String, enum: ['tall', 'standard', 'wide'], default: 'standard' },
  badge: { type: String, maxlength: 60 },
  tags: { type: [String], default: [], index: true },
});

contentPlugin(destinationSchema, { searchFields: ['name', 'state', 'tagline', 'description'] });

destinationSchema.index({ coordinates: '2dsphere' }, { sparse: true });
destinationSchema.index({ status: 1, state: 1 });

export const Destination =
  mongoose.models.Destination ?? mongoose.model('Destination', destinationSchema);
export default Destination;
