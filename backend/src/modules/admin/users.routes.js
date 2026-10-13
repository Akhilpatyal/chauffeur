import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { AdminUser } from '../../models/AdminUser.js';
import { Team } from '../../models/Team.js';
import { Lead } from '../../models/Lead.js';
import { notFound, badRequest } from '../../lib/errors.js';
import {
  createUserBody,
  updateUserBody,
  permissionsBody,
  listUsersQuery,
  userIdParams,
} from '../auth/schemas.js';
import { logoutEverywhere } from '../auth/service.js';
import { recordAudit } from '../../services/audit.js';
import {
  assertCanManageUser,
  assertNotSelf,
  assertWritableFields,
  hideFields,
} from '../../services/access.js';
import {
  ROLES,
  ROLE_RANK,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  ROLE_SCOPE,
} from '../../config/permissions.js';

/*
 * Account administration for the four-level hierarchy.
 *
 * There is no self-service signup: accounts are created by someone who already
 * has one, which removes a whole class of abuse from the public surface. Three
 * rules are enforced on every write here, and each closes a real escalation
 * route rather than a theoretical one:
 *
 *   1. You can never touch an account at or above your own rank, so nobody can
 *      promote themselves or demote the person who manages them.
 *   2. You can never change your own role, permissions, or active flag.
 *   3. The last active super admin cannot be demoted or switched off.
 */
export default async function adminUserRoutes(fastify) {
  /* Loaded fresh per request so a role change made elsewhere cannot be worked
   * around through a stale copy of the target. */
  async function loadTarget(request) {
    const user = await AdminUser.findById(request.params.id);
    if (!user) throw notFound('User');
    return user;
  }

  /*
   * A manager may only see their own team, so the user directory is scoped the
   * same way: they get their colleagues, not the whole company.
   */
  function visibleUserFilter(actor) {
    const scope = ROLE_SCOPE[actor.role] ?? 'own';
    if (scope === 'all') return {};
    if (scope === 'team') {
      const mine = (actor.teams ?? []).map(String);
      if (mine.length === 0) return { _id: actor.id };
      return { $or: [{ teams: { $in: mine } }, { _id: actor.id }] };
    }
    return { _id: actor.id };
  }

  fastify.get(
    '/users',
    {
      preHandler: fastify.requirePermission('users.view'),
      preValidation: validate({ query: listUsersQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'List admin users',
        description:
          'Scoped by role: a team manager sees their teammates, an admin sees everyone. ' +
          'Fields the caller may not read are stripped from the response.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Users', type: 'object' } },
      },
    },
    async (request) => {
      const { role, team, isActive, q } = request.query;
      const scoped = visibleUserFilter(request.user);
      const filter = { ...scoped };

      if (role) filter.role = role;
      if (team) filter.teams = team;
      if (isActive !== undefined) filter.isActive = isActive;
      if (q) {
        /* Escaped: a name containing regex punctuation should be searched for
         * literally, not compiled into a pattern. */
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$and = [
          { $or: [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }] },
        ];
      }

      const users = await AdminUser.find(filter)
        .sort({ createdAt: 1 })
        .populate('teams', 'name slug');

      /* One aggregate for the whole page rather than a count per row. The
       * column is what makes the list useful for reassigning work — "who is
       * carrying how much" — and a query per person would be a dozen round
       * trips every time somebody opens the screen. */
      const workload = await Lead.aggregate([
        {
          $match: {
            assignedTo: { $in: users.map((user) => user._id) },
            status: { $nin: ['won', 'lost', 'spam'] },
          },
        },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ]);
      const openLeads = new Map(workload.map((row) => [String(row._id), row.count]));

      /* Serialised through the documents so the permissions and scope virtuals
       * come along: the UI needs the effective set, not just the role name. */
      const data = users.map((user) => ({
        ...user.toJSON(),
        permissions: user.permissions,
        scope: user.scope,
        openLeads: openLeads.get(String(user._id)) ?? 0,
        canManage: (ROLE_RANK[request.user.role] ?? 0) > (ROLE_RANK[user.role] ?? 0),
      }));

      return { data: hideFields('user', request.user.role, data) };
    },
  );

  /*
   * The permission catalogue, so the override editor can be rendered without
   * hard-coding a list that would drift from the server's.
   */
  fastify.get(
    '/users/meta',
    {
      preHandler: fastify.requirePermission('users.view'),
      schema: {
        tags: ['admin:ops'],
        summary: 'Roles, permissions and scopes available to the caller',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Metadata', type: 'object' } },
      },
    },
    async (request) => ({
      data: {
        permissions: PERMISSIONS,
        rolePermissions: ROLE_PERMISSIONS,
        scopes: ROLE_SCOPE,
        /* Only the roles the caller outranks: offering a role the server will
         * then refuse is worse than not offering it. */
        assignableRoles: ROLES.filter(
          (role) => (ROLE_RANK[request.user.role] ?? 0) > (ROLE_RANK[role] ?? 0),
        ),
        canManageRoles: request.user.permissions.includes('users.manage_roles'),
        canManagePermissions: request.user.permissions.includes('users.manage_permissions'),
      },
    }),
  );

  fastify.get(
    '/users/:id',
    {
      preHandler: fastify.requirePermission('users.view'),
      preValidation: validate({ params: userIdParams }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Get one admin user',
        security: [{ bearerAuth: [] }],
        params: docSchema(userIdParams, 'UserIdParams'),
        response: {
          200: { description: 'User', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const scoped = visibleUserFilter(request.user);
      const user = await AdminUser.findOne({
        $and: [{ _id: request.params.id }, Object.keys(scoped).length > 0 ? scoped : {}],
      }).populate('teams', 'name slug');
      if (!user) throw notFound('User');

      const openLeads = await Lead.countDocuments({
        assignedTo: user._id,
        status: { $nin: ['won', 'lost', 'spam'] },
      });

      return {
        data: hideFields('user', request.user.role, {
          ...user.toJSON(),
          permissions: user.permissions,
          scope: user.scope,
          openLeads,
          canManage: (ROLE_RANK[request.user.role] ?? 0) > (ROLE_RANK[user.role] ?? 0),
        }),
      };
    },
  );

  fastify.post(
    '/users',
    {
      preHandler: fastify.requirePermission('users.create'),
      preValidation: validate({ body: createUserBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Create an admin user',
        description:
          'You may only create an account below your own level. The new user is flagged to ' +
          'change their password on first sign-in by default, so the password you set never ' +
          'remains in use.',
        security: [{ bearerAuth: [] }],
        body: docSchema(createUserBody, 'CreateUser'),
        response: {
          201: { description: 'Created', type: 'object' },
          403: { description: 'Above your level', ...errorResponseSchema },
          409: { description: 'Email already in use', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const { password, teams = [], ...rest } = request.body;
      assertCanManageUser(request.user, rest.role, { action: 'create' });

      if (teams.length > 0) {
        const found = await Team.countDocuments({ _id: { $in: teams }, isActive: true });
        if (found !== teams.length) throw badRequest('One or more of those teams does not exist.');
      }

      const user = await AdminUser.create({
        ...rest,
        teams,
        passwordHash: await AdminUser.hashPassword(password),
      });

      await recordAudit({
        request,
        action: 'user.create',
        entity: 'admin_user',
        entityId: user._id,
        entityLabel: user.email,
        after: { email: user.email, role: user.role, teams },
      });

      return reply.status(201).send({ data: user.toJSON() });
    },
  );

  fastify.patch(
    '/users/:id',
    {
      preHandler: fastify.requirePermission('users.edit'),
      preValidation: validate({ params: userIdParams, body: updateUserBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Update an admin user',
        description:
          'Changing the role or password, or deactivating the account, ends that user’s ' +
          'existing sessions immediately. You cannot edit yourself here, nor anyone at or ' +
          'above your own level.',
        security: [{ bearerAuth: [] }],
        params: docSchema(userIdParams, 'UserIdParams'),
        body: docSchema(updateUserBody, 'UpdateUser'),
        response: {
          200: { description: 'Updated', type: 'object' },
          400: { description: 'Would lock everyone out', ...errorResponseSchema },
          403: { description: 'Above your level', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const user = await loadTarget(request);
      const { password, ...rest } = request.body;

      assertNotSelf(
        request.user,
        user._id,
        'Use your own profile and password settings to change your account.',
      );
      assertCanManageUser(request.user, user.role, { action: 'edit' });

      /* The field policy is the second line of defence. The checks below refuse
       * the dangerous combinations; this refuses a field the role has no
       * business writing at all, and names it so the caller is not left
       * guessing which part was dropped. */
      assertWritableFields('user', request.user.role, rest);

      if (rest.role !== undefined) {
        if (!request.user.permissions.includes('users.manage_roles')) {
          throw badRequest('You do not have permission to change roles.');
        }
        assertCanManageUser(request.user, rest.role, { action: 'promote anyone to' });
      }

      if (rest.isActive === false && !request.user.permissions.includes('users.deactivate')) {
        throw badRequest('You do not have permission to deactivate accounts.');
      }

      if (rest.teams !== undefined) {
        if (rest.teams.length > 0) {
          const found = await Team.countDocuments({ _id: { $in: rest.teams }, isActive: true });
          if (found !== rest.teams.length) {
            throw badRequest('One or more of those teams does not exist.');
          }
        }
        /* A manager removed from the team they run would keep the title and
         * lose the visibility, which looks exactly like a permissions bug. */
        const orphaned = await Team.countDocuments({
          manager: user._id,
          isActive: true,
          _id: { $nin: rest.teams },
        });
        if (orphaned > 0) {
          throw badRequest('This person still manages a team they would be removed from.');
        }
      }

      const before = {
        role: user.role,
        isActive: user.isActive,
        teams: (user.teams ?? []).map(String),
      };

      /*
       * Guard against the two ways an admin can lock the whole company out:
       * demoting or deactivating the last active super_admin.
       */
      const losingSuperAdmin =
        user.role === 'super_admin' &&
        ((rest.role && rest.role !== 'super_admin') || rest.isActive === false);

      if (losingSuperAdmin) {
        const remaining = await AdminUser.countDocuments({
          role: 'super_admin',
          isActive: true,
          _id: { $ne: user._id },
        });
        if (remaining === 0) {
          throw badRequest('This is the last active super admin. Promote someone else first.');
        }
      }

      user.set(rest);
      if (password) {
        user.passwordHash = await AdminUser.hashPassword(password);
        user.mustChangePassword = true;
      }
      await user.save();

      // A role change or deactivation must take effect now, not in 15 minutes
      // when the current access token happens to expire.
      if (password || rest.role || rest.isActive === false) {
        await logoutEverywhere(user._id);
      }

      await recordAudit({
        request,
        action: 'user.update',
        entity: 'admin_user',
        entityId: user._id,
        entityLabel: user.email,
        before,
        after: {
          role: user.role,
          isActive: user.isActive,
          teams: (user.teams ?? []).map(String),
          passwordReset: Boolean(password),
        },
      });

      return { data: { ...user.toJSON(), permissions: user.permissions, scope: user.scope } };
    },
  );

  /*
   * Per-user overrides, kept separate from the general update because they are
   * the sharpest tool in the panel: a grant made here outlives any later change
   * to what the role itself means.
   */
  fastify.put(
    '/users/:id/permissions',
    {
      preHandler: fastify.requirePermission('users.manage_permissions'),
      preValidation: validate({ params: userIdParams, body: permissionsBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Set a user’s permission overrides',
        description:
          'Overrides are stored as grants and revocations on top of the role rather than as a ' +
          'flat set, so they survive a later change to the role. A revocation always wins over ' +
          'a grant. Takes effect on the user’s next request.',
        security: [{ bearerAuth: [] }],
        params: docSchema(userIdParams, 'UserIdParams'),
        body: docSchema(permissionsBody, 'UserPermissions'),
        response: {
          200: { description: 'Updated', type: 'object' },
          403: { description: 'Above your level', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const user = await loadTarget(request);

      assertNotSelf(request.user, user._id, 'You cannot change your own permissions.');
      assertCanManageUser(request.user, user.role, { action: 'change permissions for' });

      const { granted, revoked } = request.body;
      const before = {
        granted: [...(user.permissionOverrides?.granted ?? [])],
        revoked: [...(user.permissionOverrides?.revoked ?? [])],
      };

      /* You cannot grant what you do not hold. Without this an admin could
       * hand a caller the one permission the admin role deliberately lacks. */
      if (granted) {
        const beyond = granted.filter((name) => !request.user.permissions.includes(name));
        if (beyond.length > 0) {
          throw badRequest(
            `You cannot grant a permission you do not hold yourself: ${beyond.join(', ')}.`,
          );
        }
      }

      if (granted !== undefined) user.permissionOverrides.granted = granted;
      if (revoked !== undefined) user.permissionOverrides.revoked = revoked;
      await user.save();

      await recordAudit({
        request,
        action: 'user.permissions',
        entity: 'admin_user',
        entityId: user._id,
        entityLabel: user.email,
        before,
        after: {
          granted: user.permissionOverrides.granted,
          revoked: user.permissionOverrides.revoked,
        },
      });

      return {
        data: {
          id: String(user._id),
          overrides: {
            granted: user.permissionOverrides.granted,
            revoked: user.permissionOverrides.revoked,
          },
          permissions: user.permissions,
        },
      };
    },
  );

  /*
   * Sign a user out of every device. Separate from deactivation because the
   * common case — a laptop left on a train — should not disable the account.
   */
  fastify.post(
    '/users/:id/revoke-sessions',
    {
      preHandler: fastify.requirePermission('users.edit'),
      preValidation: validate({ params: userIdParams }),
      schema: {
        tags: ['admin:ops'],
        summary: 'End all of a user’s sessions',
        security: [{ bearerAuth: [] }],
        params: docSchema(userIdParams, 'UserIdParams'),
        response: {
          200: { description: 'Sessions ended', type: 'object' },
          403: { description: 'Above your level', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const user = await loadTarget(request);
      assertCanManageUser(request.user, user.role, { action: 'end sessions for' });

      await logoutEverywhere(user._id);

      await recordAudit({
        request,
        action: 'user.revoke_sessions',
        entity: 'admin_user',
        entityId: user._id,
        entityLabel: user.email,
      });

      return { data: { id: String(user._id), sessionsRevoked: true } };
    },
  );

  /*
   * Deactivation rather than deletion: enquiries, notes and audit entries all
   * point at this account, and a hard delete turns every one of them into an
   * unexplained blank.
   */
  fastify.delete(
    '/users/:id',
    {
      preHandler: fastify.requirePermission('users.deactivate'),
      preValidation: validate({ params: userIdParams }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Deactivate an admin user',
        description:
          'Accounts are deactivated, not deleted, so their enquiries and audit history stay ' +
          'readable. Refused while the person still has open enquiries assigned to them.',
        security: [{ bearerAuth: [] }],
        params: docSchema(userIdParams, 'UserIdParams'),
        response: {
          200: { description: 'Deactivated', type: 'object' },
          400: { description: 'Still has open enquiries', ...errorResponseSchema },
          403: { description: 'Above your level', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const user = await loadTarget(request);

      assertNotSelf(request.user, user._id, 'You cannot deactivate your own account.');
      assertCanManageUser(request.user, user.role, { action: 'deactivate' });

      if (user.isActive) {
        const openLeads = await Lead.countDocuments({
          assignedTo: user._id,
          status: { $nin: ['won', 'lost', 'spam'] },
        });
        if (openLeads > 0) {
          throw badRequest(
            `${user.name} still has ${openLeads} open ${openLeads === 1 ? 'enquiry' : 'enquiries'}. ` +
              'Reassign them first so no customer is left waiting.',
          );
        }

        const managed = await Team.countDocuments({ manager: user._id, isActive: true });
        if (managed > 0) {
          throw badRequest(
            `${user.name} still manages ${managed} ${managed === 1 ? 'team' : 'teams'}. ` +
              'Appoint a new manager first.',
          );
        }
      }

      user.isActive = false;
      await user.save();
      await logoutEverywhere(user._id);

      await recordAudit({
        request,
        action: 'user.deactivate',
        entity: 'admin_user',
        entityId: user._id,
        entityLabel: user.email,
        before: { isActive: true },
        after: { isActive: false },
      });

      return { data: user.toJSON() };
    },
  );
}
