import sanitizeHtml from 'sanitize-html';

/*
 * Two layers, because they defend against different things:
 *
 *  - stripTags runs on free text that users submit (names, messages, notes).
 *    Nothing there should ever contain markup, and stripping at the boundary
 *    means the admin dashboard cannot be XSS'd by a lead submission.
 *  - stripMongoOperators removes dollar-prefixed and dotted keys from request
 *    payloads, the NoSQL-injection vector that express-mongo-sanitize covers
 *    for Express apps. Mongoose sanitizeFilter backs this up at query time.
 */
export function stripTags(value) {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

/* Rich-text fields (blog article bodies) keep a conservative tag allow-list. */
export function sanitizeRichText(value) {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'ul', 'ol', 'li',
      'h2', 'h3', 'h4', 'a', 'img', 'figure', 'figcaption', 'hr', 'code', 'pre',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}

export function stripMongoOperators(input, depth = 0) {
  if (depth > 10 || input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((item) => stripMongoOperators(item, depth + 1));

  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor') {
      continue;
    }
    output[key] = stripMongoOperators(value, depth + 1);
  }
  return output;
}
