/*
 * Every error the client sees has the same shape:
 *   { error: { code, message, details?, requestId } }
 *
 * `code` is a stable machine-readable string the frontend can branch on;
 * `message` is safe to show a human. Stack traces never cross the boundary.
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expected = true; // distinguishes "handled" from "we have a bug"
  }
}

export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const validationFailed = (details) =>
  new AppError(422, 'VALIDATION_FAILED', 'Some fields need attention.', details);
export const unauthorized = (message = 'Authentication required.') =>
  new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this.') =>
  new AppError(403, 'FORBIDDEN', message);
/* Its own code, not plain FORBIDDEN. A failed CSRF check and a denied
 * permission are both 403 to the client and two different things on the
 * security timeline: one is a stale tab, the other is somebody reaching for
 * data they are not entitled to. */
export const csrfInvalid = (message = 'Missing or invalid CSRF token.') =>
  new AppError(403, 'CSRF_INVALID', message);
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`);
export const conflict = (message, details) => new AppError(409, 'CONFLICT', message, details);
export const tooManyRequests = (message = 'Too many requests. Please slow down.') =>
  new AppError(429, 'RATE_LIMITED', message);
export const serviceUnavailable = (message, code = 'SERVICE_UNAVAILABLE') =>
  new AppError(503, code, message);
