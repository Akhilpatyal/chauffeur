import fp from 'fastify-plugin';
import { recordRequest, routeOf, startMetricsFlusher, stopMetricsFlusher } from '../services/metrics.js';
import { recordSecurityEvent } from '../services/securityEvents.js';

/*
 * Request instrumentation.
 *
 * One `onResponse` hook feeding the in-memory aggregator, plus the mapping
 * from "a request was rejected with this code" to "that is a security event
 * worth a line on the timeline".
 *
 * Centralising that mapping here, rather than calling the recorder from every
 * route that can refuse a request, is deliberate: a permission check added to
 * a new route next month shows up on the timeline without anybody remembering
 * to instrument it. The alternative — a call at each throw site — fails
 * silently the first time somebody forgets, and a security timeline with
 * silent gaps is worse than none because it is trusted.
 */

/*
 * Error codes that mean something security-relevant happened. Everything else
 * is an ordinary 4xx: a validation failure is a typo, not an attack, and
 * recording those would bury the real signal.
 */
const SECURITY_EVENT_BY_CODE = {
  FORBIDDEN: 'permission.denied',
  RATE_LIMITED: 'rate_limit.exceeded',
  CSRF_INVALID: 'csrf.failed',
  RECAPTCHA_FAILED: 'recaptcha.failed',
};

/*
 * Health probes are excluded from the traffic counters. Docker's healthcheck
 * and any orchestrator hit these every few seconds, which on a quiet site
 * means the probes are most of the chart and the actual traffic is a flat line
 * underneath them.
 *
 * These must match the paths in modules/health/routes.js exactly. An earlier
 * version guessed at `/health/ready`, and the real route is `/ready`, so the
 * probes were counted after all — visibly, as the second busiest endpoint on a
 * site with no visitors.
 */
const UNCOUNTED = new Set(['/health', '/ready']);

async function observabilityPlugin(fastify, options) {
  const enabled = options.enabled ?? true;
  if (!enabled) return;

  fastify.addHook('onResponse', async (request, reply) => {
    const route = routeOf(request);
    if (UNCOUNTED.has(route)) return;

    /*
     * Wrapped, and never rethrown. An exception escaping this hook would turn
     * a successful response into a failed one — observability must not be able
     * to break the thing it observes.
     */
    try {
      recordRequest({
        route,
        method: request.method,
        statusCode: reply.statusCode,
        durationMs: reply.elapsedTime,
      });
    } catch (error) {
      request.log.warn({ err: error }, 'could not record request metric');
    }
  });

  /*
   * Exposed for the error handler to call, rather than registered as another
   * hook: the handler already has the translated status code and the original
   * error, and reconstructing either from the reply would be guesswork.
   */
  fastify.decorate('noteSecurityEvent', async function noteSecurityEvent(request, translated) {
    const type = SECURITY_EVENT_BY_CODE[translated.code];
    if (!type) return;

    /*
     * A CSRF failure with no session behind it is noise, not a security event.
     *
     * The admin app tries its refresh cookie before showing the login form, so
     * every first visit produces exactly this — and it was being filed at warn
     * severity, which meant the "worth a look" figure on the dashboard counted
     * people opening the login page. Within a day that number means nothing
     * and the genuine warnings underneath it are unreadable.
     *
     * The same failure from someone who *did* present a session is kept: that
     * is a stale tab, a replayed request, or a real attempt.
     *
     * Only CSRF is treated this way. A rate limit tripped anonymously is the
     * abuse signal on the public enquiry form and the most useful line on the
     * timeline, and a failed captcha is a bot — suppressing those because
     * nobody was signed in would discard the events the timeline exists for.
     */
    if (type === 'csrf.failed' && !request.user) return;

    await recordSecurityEvent({
      type,
      request,
      actor: request.user?.id ?? null,
      actorEmail: request.user?.email ?? null,
      actorRole: request.user?.role ?? null,
      /* The message, not the request body. A forbidden response's message
       * names the permission that was missing, which is the useful part; the
       * body might contain anything. */
      detail: { message: translated.message },
    });
  });

  /* Started after the server is listening so a failed boot does not leave a
   * timer running, and stopped with a final flush so a graceful restart keeps
   * the window it was in the middle of. */
  fastify.addHook('onReady', async () => {
    startMetricsFlusher(fastify.log);
  });

  fastify.addHook('onClose', async () => {
    await stopMetricsFlusher();
  });
}

export default fp(observabilityPlugin, { name: 'observability' });
