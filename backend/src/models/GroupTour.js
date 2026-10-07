import mongoose from 'mongoose';
import { contentPlugin, moneySchema } from './contentBase.js';

const { Schema } = mongoose;

/*
 * A departure is a dated instance of a tour. Seats are tracked per departure
 * because "4 seats left" is the single most conversion-critical number on the
 * group tours page, and it has to be editable without touching the tour copy.
 */
const departureSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 120 },
    startDate: { type: Date, index: true },
    endDate: Date,
    seatsTotal: { type: Number, min: 0, default: 0 },
    seatsRemaining: { type: Number, min: 0, default: 0 },
    price: moneySchema,
    status: {
      type: String,
      enum: ['open', 'filling_fast', 'sold_out', 'cancelled'],
      default: 'open',
    },
  },
  { _id: true },
);

const groupTourSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  destinationLabel: { type: String, trim: true, maxlength: 200 },
  destination: { type: Schema.Types.ObjectId, ref: 'Destination', default: null, index: true },
  datesLabel: { type: String, trim: true, maxlength: 120 },
  duration: { type: String, trim: true, maxlength: 80 },

  seatsTotal: { type: Number, min: 0, default: 0 },
  seatsRemaining: { type: Number, min: 0, default: 0 },

  price: moneySchema,
  originalPrice: moneySchema,

  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewsCount: { type: Number, min: 0, default: 0 },
  badge: { type: String, maxlength: 80 },

  leader: {
    name: { type: String, maxlength: 160 },
    role: { type: String, maxlength: 160 },
    avatar: String,
  },

  description: { type: String, trim: true, maxlength: 3000 },
  highlights: { type: [String], default: [] },
  inclusions: { type: [String], default: [] },
  image: String,
  gallery: { type: [String], default: [] },
  tags: { type: [String], default: [], index: true },
  filters: { type: [String], default: [] },

  departures: { type: [departureSchema], default: [] },
});

contentPlugin(groupTourSchema, {
  searchFields: ['title', 'destinationLabel', 'description'],
});

groupTourSchema.index({ status: 1, 'departures.startDate': 1 });
groupTourSchema.index({ status: 1, seatsRemaining: 1 });
groupTourSchema.index({ status: 1, 'price.amount': 1 });

export const GroupTour = mongoose.models.GroupTour ?? mongoose.model('GroupTour', groupTourSchema);
export default GroupTour;
