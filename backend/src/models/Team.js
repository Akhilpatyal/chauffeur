import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * A team is the unit of data scope.
 *
 * Team managers see their team's leads and nobody else's; callers see what is
 * assigned to them inside it. Membership lives on the user rather than as a
 * separate join collection — a person belongs to a handful of teams at most,
 * so an indexed array answers "who is in this team" and "what can this person
 * see" without a second query on every request.
 */
const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 500 },

    /* Informational: the authoritative membership list is AdminUser.teams.
     * Kept so a team can name its manager without scanning every user. */
    manager: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },

    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

teamSchema.index({ isActive: 1, name: 1 });

export const Team = mongoose.models.Team ?? mongoose.model('Team', teamSchema);
export default Team;
