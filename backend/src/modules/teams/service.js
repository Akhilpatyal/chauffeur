import { Team } from '../../models/Team.js';
import { AdminUser } from '../../models/AdminUser.js';
import { Lead } from '../../models/Lead.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { ROLE_SCOPE } from '../../config/permissions.js';

/*
 * Teams are the unit of record scope, so who may look at a team is the same
 * question as whose leads a person may read: everything, their own teams, or
 * nothing beyond themselves.
 */
function assertCanSeeTeam(user, teamId) {
  const scope = ROLE_SCOPE[user.role] ?? 'own';
  if (scope === 'all') return;
  const mine = (user.teams ?? []).map(String);
  if (!mine.includes(String(teamId))) {
    // Same wording as a missing team: a manager probing ids should not be able
    // to tell "exists, not yours" from "does not exist".
    throw notFound('Team');
  }
}

function teamScopeFilter(user) {
  const scope = ROLE_SCOPE[user.role] ?? 'own';
  if (scope === 'all') return {};
  const mine = (user.teams ?? []).map(String);
  if (mine.length === 0) return { _id: { $in: [] } };
  return { _id: { $in: mine } };
}

/* One aggregate instead of a count per team: with a dozen teams the per-team
 * version is a dozen round trips on every page load of the team list. */
async function memberCounts(teamIds) {
  if (teamIds.length === 0) return new Map();
  const rows = await AdminUser.aggregate([
    { $match: { teams: { $in: teamIds }, isActive: true } },
    { $unwind: '$teams' },
    { $match: { teams: { $in: teamIds } } },
    { $group: { _id: '$teams', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

export async function listTeams(query, user) {
  const filter = { ...teamScopeFilter(user) };
  if (!query.includeInactive) filter.isActive = true;

  const teams = await Team.find(filter).sort({ name: 1 }).populate('manager', 'name email role').lean();
  const counts = await memberCounts(teams.map((team) => team._id));

  return teams.map((team) => ({ ...team, memberCount: counts.get(String(team._id)) ?? 0 }));
}

export async function getTeam(id, user) {
  assertCanSeeTeam(user, id);
  const team = await Team.findById(id).populate('manager', 'name email role').lean();
  if (!team) throw notFound('Team');

  const members = await AdminUser.find({ teams: team._id })
    .select('name email role isActive lastLoginAt')
    .sort({ role: 1, name: 1 })
    .lean();

  const openLeads = await Lead.countDocuments({
    team: team._id,
    status: { $nin: ['won', 'lost', 'spam'] },
  });

  return { ...team, members, memberCount: members.filter((m) => m.isActive).length, openLeads };
}

/*
 * A manager must be someone who can actually act on the team's leads. Pointing
 * a team at a caller would produce a team whose manager cannot see it, which
 * reads as a permissions bug long after the mistake was made.
 */
async function resolveManager(managerId) {
  if (managerId === undefined) return undefined;
  if (managerId === null) return null;

  const manager = await AdminUser.findById(managerId).select('role isActive').lean();
  if (!manager) throw badRequest('That manager account does not exist.');
  if (!manager.isActive) throw badRequest('That manager account is deactivated.');
  if (!['team_manager', 'admin', 'super_admin'].includes(manager.role)) {
    throw badRequest('A team manager must hold the team manager role or higher.');
  }
  return manager._id;
}

export async function createTeam(body, actor) {
  const { name, description, manager } = body;
  const managerId = await resolveManager(manager);

  const team = await Team.create({
    name,
    description,
    manager: managerId ?? null,
    slug: await uniqueSlug(Team, name),
    createdBy: actor.id,
  });

  /* A manager who is not in their own team cannot see its leads, because scope
   * is driven by membership. Joining them is what the appointment meant. */
  if (managerId) await addMembers(team._id, [managerId]);

  return team.toJSON();
}

export async function updateTeam(id, body, actor) {
  assertCanSeeTeam(actor, id);
  const team = await Team.findById(id);
  if (!team) throw notFound('Team');

  const { manager, ...rest } = body;
  if (manager !== undefined) {
    const managerId = await resolveManager(manager);
    team.manager = managerId;
    if (managerId) await addMembers(team._id, [managerId]);
  }

  if (rest.name && rest.name !== team.name) {
    team.slug = await uniqueSlug(Team, rest.name, team._id);
  }
  team.set(rest);
  await team.save();

  return team.toJSON();
}

async function addMembers(teamId, userIds) {
  if (userIds.length === 0) return 0;
  const result = await AdminUser.updateMany(
    { _id: { $in: userIds } },
    { $addToSet: { teams: teamId } },
  );
  return result.modifiedCount ?? 0;
}

export async function setMembers(id, body, actor) {
  assertCanSeeTeam(actor, id);
  const team = await Team.findById(id).select('_id manager').lean();
  if (!team) throw notFound('Team');

  const add = body.add.filter((userId) => !body.remove.includes(userId));
  const { remove } = body;

  if (remove.some((userId) => String(userId) === String(team.manager))) {
    throw badRequest('Reassign the team manager before removing them from the team.');
  }

  if (add.length > 0) {
    const found = await AdminUser.find({ _id: { $in: add }, isActive: true }).select('_id').lean();
    if (found.length !== add.length) {
      throw badRequest('One or more of those accounts does not exist or is deactivated.');
    }
  }

  const added = await addMembers(team._id, add);

  let removed = 0;
  if (remove.length > 0) {
    const result = await AdminUser.updateMany(
      { _id: { $in: remove } },
      { $pull: { teams: team._id } },
    );
    removed = result.modifiedCount ?? 0;
  }

  /* Leads keep pointing at the team, not at the person who left. Clearing
   * assignment on their open leads instead would hide work in progress; the
   * team's manager still sees them and can reassign deliberately. */
  return { added, removed };
}

export async function deactivateTeam(id, actor) {
  assertCanSeeTeam(actor, id);
  const team = await Team.findById(id);
  if (!team) throw notFound('Team');
  if (!team.isActive) return team.toJSON();

  const openLeads = await Lead.countDocuments({
    team: team._id,
    status: { $nin: ['won', 'lost', 'spam'] },
  });
  if (openLeads > 0) {
    throw badRequest(
      `This team still has ${openLeads} open ${openLeads === 1 ? 'enquiry' : 'enquiries'}. ` +
        'Move them to another team first so nobody loses sight of them.',
    );
  }

  team.isActive = false;
  await team.save();
  /* Membership is left intact: reactivating a team should not require
   * rebuilding its roster from memory. An inactive team grants no scope
   * because the lead filter only matches leads, and no new leads arrive. */
  return team.toJSON();
}

export { assertCanSeeTeam };
