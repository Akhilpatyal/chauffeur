import { FIELD_POLICY, ROLE_SCOPE, outranks } from '../config/permissions.js';
import { forbidden } from '../lib/errors.js';

/*
 * Enforcement for the two layers that sit below "may they call this endpoint":
 * which records they may touch, and which fields of those records.
 *
 * Everything here is server-side by design. The dashboard hides what a person
 * cannot use, but hiding a button is decoration — these functions are the
 * control, and they behave identically whether the request came from the UI
 * or from curl.
 */

/* ── Record scope ──────────────────────────────────────────────────────── */

/*
 * A MongoDB filter restricting a lead query to what this user may see.
 *
 *   all   — no restriction
 *   team  — leads assigned to anyone in their teams, plus unassigned leads in
 *           those teams, so a manager can still distribute incoming work
 *   own   — only leads assigned to them
 *
 * A team manager with no team sees nothing rather than everything. Failing
 * closed matters here: the alternative leaks every customer record the moment
 * someone is created without a team.
 */
export function leadScopeFilter(user, teammateIds = []) {
  const scope = ROLE_SCOPE[user.role] ?? 'own';

  if (scope === 'all') return {};

  if (scope === 'team') {
    if (teammateIds.length === 0) return { assignedTo: user.id };
    return { $or: [{ assignedTo: { $in: teammateIds } }, { assignedTo: null, team: { $in: user.teams ?? [] } }] };
  }

  return { assignedTo: user.id };
}

/*
 * Whether a specific record is within reach. Used on detail routes, where a
 * list filter does not help: without this check, a caller who guesses an id
 * reads somebody else's customer — the classic insecure direct object
 * reference.
 */
export function canAccessLead(user, lead, teammateIds = []) {
  const scope = ROLE_SCOPE[user.role] ?? 'own';
  if (scope === 'all') return true;

  const assignedTo = lead.assignedTo?._id ?? lead.assignedTo;
  const assignedId = assignedTo ? String(assignedTo) : null;

  if (scope === 'own') return assignedId === user.id;

  /* team */
  if (assignedId && teammateIds.some((id) => String(id) === assignedId)) return true;
  if (!assignedId && (user.teams ?? []).length > 0) return true;
  return false;
}

export function assertCanAccessLead(user, lead, teammateIds = []) {
  if (!canAccessLead(user, lead, teammateIds)) {
    /* Deliberately the same message as a missing record would give, so the
     * endpoint cannot be used to confirm that an id exists. */
    throw forbidden('You do not have access to this lead.');
  }
}

/* ── Field-level rules ─────────────────────────────────────────────────── */

const policyFor = (resource, role) => FIELD_POLICY[resource]?.[role] ?? { deny: [], hide: [] };

/*
 * Removes fields this role may not write, and reports which were dropped.
 *
 * Silently ignoring them would be worse than refusing: a caller who edits a
 * lead's owner and sees "saved" has been told something untrue. The caller of
 * this function decides whether to reject or continue.
 */
export function filterWritableFields(resource, role, payload = {}) {
  const { deny } = policyFor(resource, role);
  if (deny.length === 0) return { data: payload, rejected: [] };

  const data = {};
  const rejected = [];

  for (const [key, value] of Object.entries(payload)) {
    if (deny.includes(key)) rejected.push(key);
    else data[key] = value;
  }

  return { data, rejected };
}

export function assertWritableFields(resource, role, payload = {}) {
  const { data, rejected } = filterWritableFields(resource, role, payload);
  if (rejected.length > 0) {
    throw forbidden(`Your role cannot change: ${rejected.join(', ')}.`);
  }
  return data;
}

/* Deletes a possibly-nested path like "context.ipHash" from a plain object. */
function removePath(target, path) {
  const parts = path.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    node = node?.[parts[i]];
    if (!node || typeof node !== 'object') return;
  }
  delete node[parts.at(-1)];
}

/*
 * Strips fields this role may not read, on the way out.
 *
 * Applied to responses rather than to queries so one policy covers every
 * endpoint that returns the resource — including exports, which are the
 * easiest place to leak a field nobody remembered to hide.
 */
export function hideFields(resource, role, document) {
  const { hide } = policyFor(resource, role);
  if (!document || hide.length === 0) return document;

  if (Array.isArray(document)) return document.map((item) => hideFields(resource, role, item));

  const clone = structuredClone(document);
  for (const path of hide) removePath(clone, path);
  return clone;
}

/* ── Acting on other people ────────────────────────────────────────────── */

/*
 * Nobody may create, edit, or assign a role at or above their own.
 *
 * This single rule blocks the three escalation routes that matter: making
 * yourself a super admin, promoting a colleague to outrank you, and two
 * admins demoting each other.
 */
export function assertCanManageUser(actor, targetRole, { action = 'manage' } = {}) {
  if (!outranks(actor.role, targetRole)) {
    throw forbidden(`You cannot ${action} a user at the ${targetRole.replace(/_/g, ' ')} level.`);
  }
}

export function assertNotSelf(actor, targetId, message) {
  if (String(actor.id) === String(targetId)) throw forbidden(message);
}
