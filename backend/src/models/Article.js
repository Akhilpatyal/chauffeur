import mongoose from 'mongoose';
import { contentPlugin } from './contentBase.js';

const { Schema } = mongoose;

const articleSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 250 },
  category: { type: String, trim: true, maxlength: 120, index: true },
  excerpt: { type: String, trim: true, maxlength: 1000 },
  /* Sanitised HTML, see utils/sanitize.js. Stored as rich text because the
   * journal reader renders formatting, not plain paragraphs. */
  content: { type: String, maxlength: 200000 },
  readingTime: { type: String, maxlength: 40 },
  author: { type: String, trim: true, maxlength: 120 },
  authorRef: { type: Schema.Types.ObjectId, ref: 'TeamMember', default: null },
  dateLabel: { type: String, maxlength: 60 },
  image: String,
  tags: { type: [String], default: [], index: true },
  relatedJourneys: [{ type: Schema.Types.ObjectId, ref: 'Journey' }],
});

contentPlugin(articleSchema, { searchFields: ['title', 'excerpt', 'category', 'author'] });

articleSchema.index({ status: 1, category: 1, publishedAt: -1 });
articleSchema.index({ status: 1, publishedAt: -1 });

export const Article = mongoose.models.Article ?? mongoose.model('Article', articleSchema);
export default Article;
