import mongoose from 'mongoose';
import { contentPlugin } from './contentBase.js';

const { Schema } = mongoose;

const teamMemberSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  bio: { type: String, trim: true, maxlength: 2000 },
  image: String,
  imageKey: String,
  email: { type: String, lowercase: true, trim: true, maxlength: 254 },
  social: {
    facebook: String,
    instagram: String,
    linkedin: String,
    x: String,
  },
});

contentPlugin(teamMemberSchema, { searchFields: ['name', 'role', 'bio'] });

export const TeamMember =
  mongoose.models.TeamMember ?? mongoose.model('TeamMember', teamMemberSchema);
export default TeamMember;
