import mongoose from 'mongoose';
import { contentPlugin } from './contentBase.js';

const { Schema } = mongoose;

const testimonialSchema = new Schema({
  quote: { type: String, required: true, trim: true, maxlength: 2000 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  location: { type: String, trim: true, maxlength: 160 },
  tripName: { type: String, trim: true, maxlength: 200 },
  journey: { type: Schema.Types.ObjectId, ref: 'Journey', default: null },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  avatar: String,
  coverImage: String,
  travelDate: { type: String, maxlength: 60 },
  /* Which surfaces this testimonial is allowed to appear on. */
  placements: {
    type: [String],
    enum: ['home', 'journey', 'group_tours', 'about', 'hotels'],
    default: ['home'],
    index: true,
  },
});

contentPlugin(testimonialSchema, { searchFields: ['author', 'quote', 'tripName'] });

export const Testimonial =
  mongoose.models.Testimonial ?? mongoose.model('Testimonial', testimonialSchema);
export default Testimonial;
