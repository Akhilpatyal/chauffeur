/*
 * Single import point for models, so scripts and the index sync step can walk
 * every schema without knowing the file layout.
 */
export { AdminUser, ROLES, ROLE_PERMISSIONS } from './AdminUser.js';
export { RefreshToken } from './RefreshToken.js';
export { Lead, LEAD_SOURCES, LEAD_STATUSES } from './Lead.js';
export { NewsletterSubscriber } from './NewsletterSubscriber.js';
export { IdempotencyKey } from './IdempotencyKey.js';
export { AuditLog } from './AuditLog.js';
export { FeatureFlag, FLAG_DEFAULTS } from './FeatureFlag.js';
export { Journey } from './Journey.js';
export { Destination } from './Destination.js';
export { GroupTour } from './GroupTour.js';
export { Hotel } from './Hotel.js';
export { Testimonial } from './Testimonial.js';
export { TeamMember } from './TeamMember.js';
export { Article } from './Article.js';
export { CONTENT_STATUSES } from './contentBase.js';

/* Observability. */
export { RequestMetric } from './RequestMetric.js';
export { ErrorEvent } from './ErrorEvent.js';
export { SecurityEvent, SECURITY_EVENT_TYPES } from './SecurityEvent.js';
export { VisitorSession } from './VisitorSession.js';
export { Team } from './Team.js';

/*
 * Booking.
 *
 * These are exported here and the module is imported at app start, which is
 * not only tidiness: Mongoose resolves a `ref` by looking the model up in its
 * registry at populate time, so a model that nothing imports does not exist
 * as far as a populate is concerned. VendorAllocation referencing Vendor
 * failed at runtime with "Schema hasn't been registered" for exactly that
 * reason — the file existed and was never loaded.
 */
export { Customer } from './Customer.js';
export { CustomerRefreshToken } from './CustomerRefreshToken.js';
export {
  Booking,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  TRIP_STATUSES,
  CLOSED_STATUSES,
} from './Booking.js';
export { BookingEvent, BOOKING_EVENT_TYPES } from './BookingEvent.js';
export { Quotation, QUOTATION_STATUSES } from './Quotation.js';
export { Payment, PAYMENT_RECORD_STATUSES } from './Payment.js';
export { Departure, DEPARTURE_STATUSES } from './Departure.js';
export { Vendor, VENDOR_SERVICES } from './Vendor.js';
export { VendorAllocation, ALLOCATION_STATUSES } from './VendorAllocation.js';
export { InventoryHold, HOLD_STATUSES } from './InventoryHold.js';
