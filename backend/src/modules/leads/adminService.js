import mongoose from 'mongoose';
import { Lead } from '../../models/Lead.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { paginate, pageResult, parseSort } from '../../utils/pagination.js';
import { enqueue, QUEUE_NAMES, JOB_NAMES } from '../../lib/queue.js';
import { escapeRegex } from '../content/registry.js';
import { AdminUser } from '../../models/AdminUser.js';
import { Team } from '../../models/Team.js';
import {
  assertCanAccessLead,
  assertWritableFields,
  hideFields,
  leadScopeFilter,
} from '../../services/access.js';

const SORTABLE = ['createdAt', 'updatedAt', 'lastEnquiryAt', 'status', 'name'];

/*
 * Everyone whose leads this user is allowed to see.
 *
 * A team manager's reach is their teams' members, so the list is resolved
 * once per request rather than per lead. Cached nowhere on purpose: team
 * membership changes must take effect immediately, and this is one indexed
 * query against a table of staff, not customers.
 */
export async function teammateIdsFor(user) {
  if (!user || user.scope !== 'team' || (user.teams ?? []).length === 0) return [];

  const members = await AdminUser.find({ teams: { $in: user.teams } })
    .select('_id')
    .lean();

  return members.map((member) => String(member._id));
}

export function buildLeadFilter(query) {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;

  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo === 'unassigned' ? null : query.assignedTo;
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  /*
   * By default the list shows one row per person: follow-up enquiries are
   * folded into the thread they belong to. `includeDuplicates=true` shows
   * every individual submission.
   */
  if (!query.includeDuplicates) filter.duplicateOf = null;

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }, { topic: pattern }];
  }

  return filter;
}

export async function listLeads(query, user) {
  /* Scope first, then the user's own filters. Combining with $and means a
   * crafted query string can narrow the result but never widen it past what
   * this person is allowed to see. */
  const scope = leadScopeFilter(user, await teammateIdsFor(user));
  const requested = buildLeadFilter(query);
  const filter = Object.keys(scope).length > 0 ? { $and: [scope, requested] } : requested;
  const sort = parseSort(query.sort, SORTABLE, { createdAt: -1 });
  const { skip, limit } = paginate(query);

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .select('-statusHistory -notes -context.userAgent')
      .populate('assignedTo', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return pageResult(hideFields('lead', user.role, items), total, query);
}

export async function getLead(id, user) {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('notes.author', 'name email')
    .lean();
  if (!lead) throw notFound('Lead');

  /* Guessing an id must not reach someone else's customer. */
  assertCanAccessLead(user, lead, await teammateIdsFor(user));

  // The rest of the contact thread, so an agent sees the full history of this
  // person on one screen rather than searching for their other enquiries.
  const threadRoot = lead.duplicateOf ?? lead._id;
  const thread = await Lead.find({
    $or: [{ _id: threadRoot }, { duplicateOf: threadRoot }],
    _id: { $ne: lead._id },
  })
    .select('source topic message createdAt status')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return hideFields('lead', user.role, { ...lead, thread });
}

export async function updateStatus(id, { status, reason }, actor) {
  const lead = await Lead.findById(id);
  if (!lead) throw notFound('Lead');
  assertCanAccessLead(actor, lead, await teammateIdsFor(actor));
  if (lead.status === status) return lead.toJSON();

  const previous = lead.status;
  lead.status = status;
  if (status === 'lost' && reason) lead.lostReason = reason;
  lead.statusHistory.push({
    from: previous,
    to: status,
    at: new Date(),
    by: actor.id,
    byName: actor.name,
    reason,
  });
  await lead.save();

  return { lead: lead.toJSON(), previous };
}

export async function assignLead(id, assignedTo, actor) {
  const lead = await Lead.findById(id);
  if (!lead) throw notFound('Lead');
  assertCanAccessLead(actor, lead, await teammateIdsFor(actor));

  /* Field policy: a caller may move a lead through the pipeline but may not
   * decide who owns it. Checked here rather than only in the UI. */
  assertWritableFields('lead', actor.role, { assignedTo });

  if (assignedTo && !mongoose.isValidObjectId(assignedTo)) {
    throw badRequest('assignedTo must be a user id or null.');
  }

  const previous = lead.assignedTo ? String(lead.assignedTo) : null;
  lead.assignedTo = assignedTo || null;
  lead.assignedAt = assignedTo ? new Date() : null;

  /*
   * Stamp the assignee's team onto the lead. Without this an unassigned lead
   * belongs to nobody, and a team manager redistributing work would lose
   * sight of it the moment they unassigned it.
   */
  if (assignedTo) {
    const assignee = await AdminUser.findById(assignedTo).select('teams').lean();
    lead.team = assignee?.teams?.[0] ?? lead.team ?? null;
  }

  await lead.save();

  return { lead: lead.toJSON(), previous, actorId: actor.id };
}

export async function addNote(id, body, actor) {
  const existing = await Lead.findById(id).select('assignedTo team').lean();
  if (!existing) throw notFound('Lead');
  assertCanAccessLead(actor, existing, await teammateIdsFor(actor));

  const lead = await Lead.findByIdAndUpdate(
    id,
    { $push: { notes: { body, author: actor.id, authorName: actor.name, createdAt: new Date() } } },
    { new: true },
  ).lean();
  if (!lead) throw notFound('Lead');
  return lead.notes[lead.notes.length - 1];
}

/* Manual retry for an alert that exhausted its automatic attempts. */
export async function resendNotifications(id, actor) {
  const lead = await Lead.findById(id).lean();
  if (!lead) throw notFound('Lead');
  assertCanAccessLead(actor, lead, await teammateIdsFor(actor));

  const results = await Promise.all([
    enqueue(QUEUE_NAMES.notifications, JOB_NAMES.leadAdminAlert, { leadId: String(lead._id) }),
    enqueue(QUEUE_NAMES.notifications, JOB_NAMES.leadCustomerEmail, { leadId: String(lead._id) }),
  ]);

  await Lead.updateOne(
    { _id: id },
    {
      $set: {
        'notifications.adminEmail.status': 'queued',
        'notifications.adminWhatsapp.status': 'queued',
        'notifications.customerEmail.status': 'queued',
      },
    },
  );

  return { queued: results.every((result) => result.queued) };
}

/* Rows for the CSV export. Streams would be better above ~50k rows; the cap
 * keeps a careless export from pulling the whole collection into memory. */
export async function leadsForExport(query, user, cap = 10_000) {
  /* An export that ignored scope would be the simplest way to walk out with
   * every customer record in the business. */
  const scope = leadScopeFilter(user, await teammateIdsFor(user));
  const requested = buildLeadFilter(query);
  const filter = Object.keys(scope).length > 0 ? { $and: [scope, requested] } : requested;

  const rows = await Lead.find(filter)
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .limit(cap)
    .lean();

  return hideFields('lead', user.role, rows);
}
