/*
 * The permission catalogue, the role hierarchy, and the field-level rules.
 *
 * One file so there is a single answer to "what can this person do", rather
 * than role checks scattered through route handlers that drift apart.
 *
 * Three layers, applied in order:
 *
 *   1. ACTION      — may they call this endpoint at all?        (`leads:read`)
 *   2. SCOPE       — which records may they see or touch?       (own team only)
 *   3. FIELD       — which columns may they read or write?      (not `assignedTo`)
 *
 * All three are enforced on the server. A caller who crafts their own request
 * gets the same answer as one clicking a button, because the UI is not the
 * control — it only reflects what these rules already decided.
 */

export const ROLES = ['super_admin', 'admin', 'team_manager', 'caller'];

/*
 * Rank exists for one job: stopping horizontal and upward privilege moves.
 * Nobody may create, edit or assign a role at or above their own, which is
 * what prevents an admin quietly making themselves a super admin.
 */
export const ROLE_RANK = {
  super_admin: 40,
  admin: 30,
  team_manager: 20,
  caller: 10,
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_manager: 'Team Manager',
  caller: 'Caller',
};

/* Every permission the application recognises. A string not in this list is a
 * typo, and granting it is rejected rather than silently doing nothing. */
export const PERMISSIONS = [
  'dashboard.view',

  'users.view',
  'users.create',
  'users.edit',
  'users.deactivate',
  'users.manage_roles',
  'users.manage_permissions',

  /* Reservations. Separate from leads: an enquiry is a conversation, a
   * booking is money and a commitment, and the people trusted with one are
   * not automatically trusted with the other. */
  'bookings.view',
  'bookings.manage',
  'bookings.assign',
  'bookings.refund',

  'teams.view',
  'teams.create',
  'teams.edit',
  'teams.manage_members',

  'leads.view',
  'leads.create',
  'leads.edit',
  'leads.assign',
  'leads.edit_status',
  'leads.add_activity',
  'leads.export',
  'leads.delete',

  'content.view',
  'content.edit',
  'content.publish',
  'content.delete',
  'uploads.write',

  'analytics.view',
  'audit.view',
  'observability.view',
  'observability.export',
  /* Marking an error fixed is a claim about the code, so it is a separate
   * permission from reading the dashboard. */
  'observability.resolve',
  'security.view',

  'settings.manage',
  'flags.write',
  'compliance.export',
  'compliance.erase',
];

const CALLER = [
  'dashboard.view',
  'leads.view',
  'leads.edit_status',
  'leads.add_activity',
  'bookings.view',
  'content.view',
];

const TEAM_MANAGER = [
  ...CALLER,
  'leads.edit',
  'leads.assign',
  'leads.export',
  'bookings.manage',
  'bookings.assign',
  'teams.view',
  'users.view',
  'analytics.view',
];

const ADMIN = [
  ...TEAM_MANAGER,
  'leads.create',
  'leads.delete',
  /* Money back is an admin decision, not a manager's. */
  'bookings.refund',
  'users.create',
  'users.edit',
  'users.deactivate',
  /* An admin may set roles, but the rank guard in services/access.js means the
   * only roles they can reach are the ones below their own. Per-user permission
   * overrides stay with the super admin: they are a sharper tool than a role,
   * and a mistake there is far harder to spot in a user list. */
  'users.manage_roles',
  'teams.create',
  'teams.edit',
  'teams.manage_members',
  'content.edit',
  'content.publish',
  'uploads.write',
  'audit.view',
  'observability.view',
  'observability.export',
  'observability.resolve',
  'security.view',
];

/*
 * Super admin is the full catalogue rather than a hand-written list, so a new
 * permission is never accidentally unreachable by the platform owner.
 */
export const ROLE_PERMISSIONS = {
  caller: CALLER,
  team_manager: TEAM_MANAGER,
  admin: ADMIN,
  super_admin: [...PERMISSIONS],
};

/*
 * How much of the data each role can see.
 *
 *   all    — every record
 *   team   — records belonging to the teams they are a member of
 *   own    — only records assigned to them
 */
export const ROLE_SCOPE = {
  super_admin: 'all',
  admin: 'all',
  team_manager: 'team',
  caller: 'own',
};

/*
 * Field-level rules, per resource.
 *
 * `deny` lists the fields a role may NOT write. `hide` lists the fields it may
 * not read. Anything not listed is allowed, so adding a harmless field does
 * not require touching this table — but adding a sensitive one does.
 */
export const FIELD_POLICY = {
  lead: {
    caller: {
      /* A caller works a lead but does not own it: they cannot hand it to
       * someone else, change what it is worth, or alter the audit trail. */
      deny: ['assignedTo', 'duplicateOf', 'booking', 'consent', 'statusHistory', 'notes', 'email', 'phone', 'name'],
      hide: ['spamScore', 'context.ipHash', 'consent.ipHash'],
    },
    team_manager: {
      deny: ['duplicateOf', 'statusHistory', 'consent'],
      hide: ['context.ipHash', 'consent.ipHash'],
    },
    admin: {
      deny: ['statusHistory'],
      hide: [],
    },
    super_admin: { deny: [], hide: [] },
  },

  user: {
    /* Writing `role` is gated by the users.manage_roles permission and then by
     * rank, both checked in the route — so the two roles that hold it are not
     * denied the field here. The roles that do not hold it are, which means a
     * request naming it is refused by field policy before anything else looks
     * at it. `permissions` is never writable through this resource at all:
     * overrides have their own endpoint, with its own stricter rules. */
    caller: { deny: ['role', 'permissions', 'isActive', 'teams'], hide: ['lastLoginIpHash'] },
    team_manager: { deny: ['role', 'permissions', 'isActive'], hide: ['lastLoginIpHash'] },
    admin: { deny: ['permissions'], hide: [] },
    super_admin: { deny: ['permissions'], hide: [] },
  },
};

export const isPermission = (value) => PERMISSIONS.includes(value);

/* Can `actor` act on something belonging to role `target`? Equal rank counts
 * as too high: two admins must not be able to demote each other. */
export const outranks = (actorRole, targetRole) =>
  (ROLE_RANK[actorRole] ?? 0) > (ROLE_RANK[targetRole] ?? 0);
