import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { AdminUser } from '../../models/AdminUser.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { createUserBody, updateUserBody, userIdParams } from '../auth/schemas.js';
import { logoutEverywhere } from '../auth/service.js';
import { recordAudit } from '../../services/audit.js';

/*
 * Team management, super_admin only.
 *
 * There is no self-service signup: accounts are created by an existing admin,
 * which is the right model for a five-person sales desk and removes a whole
 * class of abuse from the public surface.
 */
export default async function adminUserRoutes(fastify) {
  fastify.get(
    '/users',
    {
      preHandler: fastify.requirePermission('users:read'),
      schema: {
        tags: ['admin:ops'],
        summary: 'List admin users',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Users', type: 'object' } },
      },
    },
    async () => ({
      data: await AdminUser.find({}).sort({ createdAt: 1 }).lean(),
    }),
  );

  fastify.post(
    '/users',
    {
      preHandler: fastify.requirePermission('users:write'),
      preValidation: validate({ body: createUserBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Create an admin user',
        description:
          'The new user is flagged to change their password on first sign-in by default, so ' +
          'the password you set never remains in use.',
        security: [{ bearerAuth: [] }],
        body: docSchema(createUserBody, 'CreateUser'),
        response: {
          201: { description: 'Created', type: 'object' },
          409: { description: 'Email already in use', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const { password, ...rest } = request.body;
      const user = await AdminUser.create({
        ...rest,
        passwordHash: await AdminUser.hashPassword(password),
      });

      await recordAudit({
        request,
        action: 'user.create',
        entity: 'admin_user',
        entityId: user._id,
        entityLabel: user.email,
        after: { email: user.email, role: user.role },
      });

      return reply.status(201).send({ data: user.toJSON() });
    },
  );

  fastify.patch(
    '/users/:id',
    {
      preHandler: fastify.requirePermission('users:write'),
      preValidation: validate({ params: userIdParams, body: updateUserBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Update an admin user',
        description:
          'Changing the role or password, or deactivating the account, ends that user’s ' +
          'existing sessions immediately.',
        security: [{ bearerAuth: [] }],
        params: docSchema(userIdParams, 'UserIdParams'),
        body: docSchema(updateUserBody, 'UpdateUser'),
        response: {
          200: { description: 'Updated', type: 'object' },
          400: { description: 'Would lock everyone out', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const user = await AdminUser.findById(request.params.id);
      if (!user) throw notFound('User');

      const { password, ...rest } = request.body;
      const before = { role: user.role, isActive: user.isActive };

      /*
       * Guard against the two ways an admin can lock the whole team out: demoting
       * or deactivating the last active super_admin.
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
        after: { role: user.role, isActive: user.isActive, passwordReset: Boolean(password) },
      });

      return { data: user.toJSON() };
    },
  );
}
