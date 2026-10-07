/*
 * Field definitions for the content editor, one entry per collection.
 *
 * This mirrors the registry on the server. Keeping it as data means adding a
 * field to a journey is a one-line change here rather than a new form
 * component, and the editor cannot drift out of sync with the API by
 * accumulating bespoke forms.
 *
 * `kind` drives the input rendered; `list` splits a textarea on newlines;
 * `money` maps to the { amount, display } shape the API expects.
 */
export const CONTENT_TYPES = [
  { key: 'journeys', label: 'Journeys', titleField: 'title' },
  { key: 'destinations', label: 'Destinations', titleField: 'name' },
  { key: 'group-tours', label: 'Group tours', titleField: 'title' },
  { key: 'hotels', label: 'Stays', titleField: 'name' },
  { key: 'testimonials', label: 'Testimonials', titleField: 'author' },
  { key: 'team', label: 'Team', titleField: 'name' },
  { key: 'articles', label: 'Journal', titleField: 'title' },
];

const STATUS_FIELD = {
  name: 'status',
  label: 'Status',
  kind: 'select',
  options: ['published', 'draft', 'archived'],
};
const COMMON_TAIL = [
  STATUS_FIELD,
  { name: 'isFeatured', label: 'Featured', kind: 'boolean' },
  { name: 'sortOrder', label: 'Sort order', kind: 'number', hint: 'Lower sorts first' },
];

export const FIELDS = {
  journeys: [
    { name: 'title', label: 'Title', kind: 'text', required: true },
    { name: 'location', label: 'Location', kind: 'text' },
    { name: 'duration', label: 'Duration label', kind: 'text', hint: 'e.g. 6 Days / 5 Nights' },
    { name: 'durationDays', label: 'Duration (days)', kind: 'number' },
    {
      name: 'difficulty',
      label: 'Difficulty',
      kind: 'select',
      options: ['', 'Easy', 'Easy to Moderate', 'Moderate', 'Moderate to Challenging', 'Challenging'],
    },
    { name: 'elevation', label: 'Max elevation', kind: 'text' },
    { name: 'groupSize', label: 'Group size', kind: 'text' },
    { name: 'price', label: 'Price', kind: 'money' },
    { name: 'originalPrice', label: 'Original price', kind: 'money' },
    { name: 'discountLabel', label: 'Discount label', kind: 'text' },
    { name: 'rating', label: 'Rating', kind: 'number', step: '0.01' },
    { name: 'reviewsCount', label: 'Reviews', kind: 'number' },
    { name: 'description', label: 'Description', kind: 'textarea' },
    { name: 'highlights', label: 'Highlights', kind: 'list' },
    { name: 'inclusions', label: 'Inclusions', kind: 'list' },
    { name: 'exclusions', label: 'Exclusions', kind: 'list' },
    { name: 'upcomingDates', label: 'Upcoming dates', kind: 'list' },
    { name: 'tags', label: 'Tags', kind: 'list' },
    { name: 'image', label: 'Hero image', kind: 'image', folder: 'journeys' },
    { name: 'secondaryImage', label: 'Secondary image', kind: 'image', folder: 'journeys' },
    ...COMMON_TAIL,
  ],

  destinations: [
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'state', label: 'State', kind: 'text' },
    { name: 'tagline', label: 'Tagline', kind: 'text' },
    { name: 'description', label: 'Description', kind: 'textarea' },
    { name: 'coordinatesLabel', label: 'Coordinates label', kind: 'text' },
    { name: 'lat', label: 'Latitude', kind: 'number', step: 'any' },
    { name: 'lng', label: 'Longitude', kind: 'number', step: 'any' },
    { name: 'elevation', label: 'Elevation', kind: 'text' },
    { name: 'bestSeason', label: 'Best season', kind: 'text' },
    { name: 'temperature', label: 'Temperature', kind: 'text' },
    { name: 'rating', label: 'Rating', kind: 'number', step: '0.01' },
    { name: 'reviewsCount', label: 'Reviews', kind: 'number' },
    { name: 'badge', label: 'Badge', kind: 'text' },
    { name: 'aspectRatio', label: 'Mosaic size', kind: 'select', options: ['standard', 'tall', 'wide'] },
    { name: 'tags', label: 'Tags', kind: 'list' },
    { name: 'image', label: 'Image', kind: 'image', folder: 'destinations' },
    ...COMMON_TAIL,
  ],

  'group-tours': [
    { name: 'title', label: 'Title', kind: 'text', required: true },
    { name: 'destinationLabel', label: 'Destination', kind: 'text' },
    { name: 'datesLabel', label: 'Dates label', kind: 'text' },
    { name: 'duration', label: 'Duration', kind: 'text' },
    { name: 'seatsTotal', label: 'Seats total', kind: 'number' },
    { name: 'seatsRemaining', label: 'Seats remaining', kind: 'number' },
    { name: 'price', label: 'Price', kind: 'money' },
    { name: 'originalPrice', label: 'Original price', kind: 'money' },
    { name: 'rating', label: 'Rating', kind: 'number', step: '0.01' },
    { name: 'reviewsCount', label: 'Reviews', kind: 'number' },
    { name: 'badge', label: 'Badge', kind: 'text' },
    { name: 'description', label: 'Description', kind: 'textarea' },
    { name: 'highlights', label: 'Highlights', kind: 'list' },
    { name: 'inclusions', label: 'Inclusions', kind: 'list' },
    { name: 'tags', label: 'Tags', kind: 'list' },
    { name: 'image', label: 'Image', kind: 'image', folder: 'group-tours' },
    ...COMMON_TAIL,
  ],

  hotels: [
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'location', label: 'Location', kind: 'text' },
    { name: 'distanceLabel', label: 'Distance', kind: 'text' },
    { name: 'price', label: 'Price per night', kind: 'number' },
    { name: 'strikePrice', label: 'Strike price', kind: 'number' },
    { name: 'discountPercent', label: 'Discount %', kind: 'number' },
    { name: 'rating', label: 'Rating', kind: 'number', step: '0.01' },
    { name: 'ratingLabel', label: 'Rating label', kind: 'text' },
    { name: 'reviewsCount', label: 'Reviews', kind: 'number' },
    { name: 'star', label: 'Star rating', kind: 'number' },
    { name: 'type', label: 'Property type', kind: 'text' },
    { name: 'amenities', label: 'Amenities', kind: 'list' },
    { name: 'experience', label: 'Experience tags', kind: 'list' },
    { name: 'bookingPerks', label: 'Booking perks', kind: 'list' },
    { name: 'freeCancellation', label: 'Free cancellation', kind: 'boolean' },
    { name: 'badge', label: 'Badge', kind: 'text' },
    { name: 'badgeTone', label: 'Badge tone', kind: 'select', options: ['', 'gold', 'forest', 'coral'] },
    { name: 'description', label: 'Description', kind: 'textarea' },
    { name: 'image', label: 'Image', kind: 'image', folder: 'hotels' },
    { name: 'isEditorsPick', label: 'Editors pick', kind: 'boolean' },
    ...COMMON_TAIL,
  ],

  testimonials: [
    { name: 'author', label: 'Author', kind: 'text', required: true },
    { name: 'quote', label: 'Quote', kind: 'textarea', required: true },
    { name: 'location', label: 'Location', kind: 'text' },
    { name: 'tripName', label: 'Trip', kind: 'text' },
    { name: 'rating', label: 'Rating', kind: 'number' },
    { name: 'travelDate', label: 'Travel date', kind: 'text' },
    {
      name: 'placements',
      label: 'Show on',
      kind: 'multiselect',
      options: ['home', 'journey', 'group_tours', 'about', 'hotels'],
    },
    { name: 'avatar', label: 'Avatar', kind: 'image', folder: 'testimonials' },
    { name: 'coverImage', label: 'Cover image', kind: 'image', folder: 'testimonials' },
    ...COMMON_TAIL,
  ],

  team: [
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'role', label: 'Role', kind: 'text', required: true },
    { name: 'bio', label: 'Bio', kind: 'textarea' },
    { name: 'email', label: 'Email', kind: 'text' },
    { name: 'image', label: 'Portrait', kind: 'image', folder: 'team' },
    ...COMMON_TAIL,
  ],

  articles: [
    { name: 'title', label: 'Title', kind: 'text', required: true },
    { name: 'category', label: 'Category', kind: 'text' },
    { name: 'author', label: 'Author', kind: 'text' },
    { name: 'dateLabel', label: 'Date label', kind: 'text' },
    { name: 'readingTime', label: 'Reading time', kind: 'text' },
    { name: 'excerpt', label: 'Excerpt', kind: 'textarea' },
    { name: 'content', label: 'Body (HTML allowed)', kind: 'textarea', rows: 10 },
    { name: 'tags', label: 'Tags', kind: 'list' },
    { name: 'image', label: 'Image', kind: 'image', folder: 'articles' },
    ...COMMON_TAIL,
  ],
};
