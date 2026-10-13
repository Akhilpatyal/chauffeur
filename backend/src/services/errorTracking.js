import crypto from 'node:crypto';
import { ErrorEvent } from '../models/ErrorEvent.js';

/*
 * Error grouping.
 *
 * Every fault becomes one document identified by a fingerprint, with a count
 * and a few recent examples, rather than one document per occurrence. The
 * whole value of the dashboard rests on the fingerprint being stable across
 * occurrences and distinct between genuinely different faults.
 */
const MAX_SAMPLES = 10;
const MAX_STACK_FRAMES = 6;

/*
 * Messages are deliberately excluded from the fingerprint.
 *
 * "Cast to ObjectId failed for value 665f1a…" interpolates an id, so
 * fingerprinting on the message would file every occurrence as a brand new
 * error and the dashboard would be a list of thousands of groups of one. The
 * stack frame where it was thrown is what identifies the fault; the message is
 * stored for reading, not for grouping.
 */
function normaliseStack(stack) {
  if (!stack) return '';
  return stack
    .split('\n')
    .slice(1, MAX_STACK_FRAMES + 1)
    .map(normaliseFrame)
    .join('\n');
}

/*
 * One stack frame, reduced to the part that identifies the code.
 *
 * Absolute paths differ between a developer's laptop, the container and any
 * future host, so a frame has to be made project-relative or the same fault
 * fingerprints differently in each place — and every deploy then looks like a
 * fresh set of errors nobody has seen before.
 *
 * Separators are normalised first. An earlier version tried to handle both
 * conventions in one pattern and silently mangled Windows paths into
 * `C:Usersdevproject…`, which fingerprinted the same fault twice depending on
 * which machine threw it. Converting to one convention and then cutting is
 * both shorter and actually correct.
 */
function normaliseFrame(line) {
  return line
    .trim()
    .replace(/\\/g, '/')
    /* Everything up to the last `src/` is the machine's own directory layout:
     * drive letters, home directories, container mount points, file:// URLs.
     * Bounded by whitespace and `(` so it cannot eat the function name in
     * front of the path. */
    .replace(/[^\s(]*\/(?=src\/)/g, '')
    /* Line and column numbers move whenever anything above them is edited, so
     * keeping them would split one fault into a new group on every commit. */
    .replace(/:\d+:\d+/g, '');
}

export function fingerprintOf({ name, code, route, method, stack }) {
  const basis = [name ?? 'Error', code ?? '', method ?? '', route ?? '', normaliseStack(stack)].join('|');
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 24);
}

/*
 * Only the first few frames are kept. A full Fastify trace is around forty
 * lines of framework internals below the two that say where the bug is, and
 * at thousands of groups that is tens of megabytes of collection holding
 * nothing anybody will read.
 */
function trimStack(stack) {
  if (!stack) return undefined;
  return stack.split('\n').slice(0, MAX_STACK_FRAMES + 1).join('\n').slice(0, 4000);
}

/*
 * Recorded individually rather than aggregated like the request metrics,
 * because an error is not a statistic: losing one changes what you conclude
 * about whether something is broken.
 */
export async function recordError({ error, request, statusCode }) {
  const route = request?.routeOptions?.url ?? null;
  const fingerprint = fingerprintOf({
    name: error.name,
    code: error.code,
    route,
    method: request?.method,
    stack: error.stack,
  });

  const now = new Date();
  const occurrence = {
    at: now,
    correlationId: request?.correlationId,
    route,
    method: request?.method,
    statusCode,
    userId: request?.user?.id ?? null,
    userRole: request?.user?.role ?? null,
    ipHash: request?.ipHash ?? null,
    userAgent: String(request?.headers?.['user-agent'] ?? '').slice(0, 300),
  };

  /*
   * One round trip, and no read-then-write: `$inc` with `$setOnInsert` makes
   * the first occurrence create the group and every later one increment it,
   * with no window in which two concurrent errors both think they are first.
   * `$slice` on the push is what bounds the samples array without a second
   * query to trim it.
   */
  const update = {
    $setOnInsert: {
      fingerprint,
      name: error.name ?? 'Error',
      firstSeenAt: now,
      stack: trimStack(error.stack),
    },
    $set: {
      /* Refreshed each time: the newest message is the most useful one to
       * read, and route/status can legitimately change for the same fault. */
      message: String(error.message ?? '').slice(0, 1000),
      code: error.code,
      route,
      method: request?.method,
      statusCode,
      lastSeenAt: now,
    },
    $inc: { count: 1 },
    $push: { samples: { $each: [occurrence], $slice: -MAX_SAMPLES } },
  };

  const group = await ErrorEvent.findOneAndUpdate({ fingerprint }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  /*
   * Reopen a resolved group.
   *
   * Marking an error fixed is a claim, and this is the check on it: if the
   * same fault happens again afterwards it goes back to open and the
   * regression is counted. Without this, a dashboard full of "resolved" says
   * nothing about whether anything was actually resolved.
   */
  if (group.status === 'resolved') {
    await ErrorEvent.updateOne(
      { _id: group._id, status: 'resolved' },
      {
        $set: { status: 'open', resolvedAt: null, resolvedBy: null },
        $inc: { regressionCount: 1 },
      },
    );
  }

  return group;
}
