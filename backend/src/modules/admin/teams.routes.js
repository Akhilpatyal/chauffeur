import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { recordAudit } from '../../services/audit.js';
import {
  createTeamBody,
  updateTeamBody,
  listTeamsQuery,
  membersBody,
  teamIdParams,
} from '../teams/schemas.js';
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  setMembers,
  deactivateTeam,
} from '../teams/service.js';

/*
 * Teams decide who sees which enquiries, so every read here is scoped the same
 * way the lead list is: a team manager can only reach the teams they belong to.
 */
export default async function adminTeamRoutes(fastify) {
  fastify.get(
    '/teams',
    {
      preHandler: fastify.requirePermission('teams.view'),
      preValidation: validate({ query: listTeamsQuery }),
      schema: {
        tags: ['admin:ops'],
        summary: 'List teams',
        description: 'Scoped: managers see only the teams they are a member of.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Teams', type: 'object' } },
      },
    },
    async (request) => ({ data: await listTeams(request.query, request.user) }),
  );

  fastify.get(
    '/teams/:id',
    {
      preHandler: fastify.requirePermission('teams.view'),
      preValidation: validate({ params: teamIdParams }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Get one team with its roster',
        security: [{ bearerAuth: [] }],
        params: docSchema(teamIdParams, 'TeamIdParams'),
        response: {
          200: { description: 'Team', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => ({ data: await getTeam(request.params.id, request.user) }),
  );

  fastify.post(
    '/teams',
    {
      preHandler: fastify.requirePermission('teams.create'),
      preValidation: validate({ body: createTeamBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Create a team',
        description:
          'Naming a manager also adds them to the team, because scope follows membership.',
        security: [{ bearerAuth: [] }],
        body: docSchema(createTeamBody, 'CreateTeam'),
        response: {
          201: { description: 'Created', type: 'object' },
          400: { description: 'Invalid manager', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const team = await createTeam(request.body, request.user);
      await recordAudit({
        request,
        action: 'team.create',
        entity: 'team',
        entityId: team._id,
        entityLabel: team.name,
        after: { name: team.name, manager: team.manager },
      });
      return reply.status(201).send({ data: team });
    },
  );

  fastify.patch(
    '/teams/:id',
    {
      preHandler: fastify.requirePermission('teams.edit'),
      preValidation: validate({ params: teamIdParams, body: updateTeamBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Update a team',
        security: [{ bearerAuth: [] }],
        params: docSchema(teamIdParams, 'TeamIdParams'),
        body: docSchema(updateTeamBody, 'UpdateTeam'),
        response: {
          200: { description: 'Updated', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const team = await updateTeam(request.params.id, request.body, request.user);
      await recordAudit({
        request,
        action: 'team.update',
        entity: 'team',
        entityId: team._id,
        entityLabel: team.name,
        after: request.body,
      });
      return { data: team };
    },
  );

  fastify.post(
    '/teams/:id/members',
    {
      preHandler: fastify.requirePermission('teams.manage_members'),
      preValidation: validate({ params: teamIdParams, body: membersBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Add or remove team members',
        description:
          'Sent as a delta (add / remove) rather than a full roster, so two people editing ' +
          'the same team at once cannot silently undo each other.',
        security: [{ bearerAuth: [] }],
        params: docSchema(teamIdParams, 'TeamIdParams'),
        body: docSchema(membersBody, 'TeamMembers'),
        response: {
          200: { description: 'Membership changed', type: 'object' },
          400: { description: 'Unknown account', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const result = await setMembers(request.params.id, request.body, request.user);
      await recordAudit({
        request,
        action: 'team.members',
        entity: 'team',
        entityId: request.params.id,
        after: { ...request.body, ...result },
      });
      return { data: result };
    },
  );

  fastify.delete(
    '/teams/:id',
    {
      preHandler: fastify.requirePermission('teams.edit'),
      preValidation: validate({ params: teamIdParams }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Deactivate a team',
        description:
          'Teams are deactivated, never deleted, so historic enquiries keep a readable owner. ' +
          'Refused while the team still has open enquiries.',
        security: [{ bearerAuth: [] }],
        params: docSchema(teamIdParams, 'TeamIdParams'),
        response: {
          200: { description: 'Deactivated', type: 'object' },
          400: { description: 'Still has open enquiries', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const team = await deactivateTeam(request.params.id, request.user);
      await recordAudit({
        request,
        action: 'team.deactivate',
        entity: 'team',
        entityId: team._id,
        entityLabel: team.name,
      });
      return { data: team };
    },
  );
}
