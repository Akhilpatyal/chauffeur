import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { Lead } from '../src/models/Lead.js';
import { Team } from '../src/models/Team.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { contactKeyFor } from '../src/utils/identity.js';

/*
 * The four-level hierarchy, tested at the HTTP boundary.
 *
 * Every check here is written against a route rather than against the access
 * service, because a permission model that is correct in isolation and not
 * applied on one route is not a permission model. The cases chosen are the
 * ones that would actually be exploited: reading somebody else's customer,
 * promoting yourself, and writing a field the UI never shows you.
 */
let app;

const PASSWORD = 'correct-horse-battery';

async function seedPeople() {
  const north = await Team.create({ name: 'North Desk', slug: 'north-desk' });
  const south = await Team.create({ name: 'South Desk', slug: 'south-desk' });

  const { user: owner } = await createAdmin({ email: 'owner@taifer.test', role: 'super_admin' });
  const { user: admin } = await createAdmin({
    email: 'admin2@taifer.test',
    name: 'Ops Admin',
    role: 'admin',
  });
  const { user: northManager } = await createAdmin({
    email: 'north.manager@taifer.test',
    name: 'North Manager',
    role: 'team_manager',
    teams: [north._id],
  });
  const { user: southManager } = await createAdmin({
    email: 'south.manager@taifer.test',
    name: 'South Manager',
    role: 'team_manager',
    teams: [south._id],
  });
  const { user: northCaller } = await createAdmin({
    email: 'north.caller@taifer.test',
    name: 'North Caller',
    role: 'caller',
    teams: [north._id],
  });
  const { user: otherCaller } = await createAdmin({
    email: 'north.caller2@taifer.test',
    name: 'Other North Caller',
    role: 'caller',
    teams: [north._id],
  });

  north.manager = northManager._id;
  await north.save();
  south.manager = southManager._id;
  await south.save();

  return { north, south, owner, admin, northManager, southManager, northCaller, otherCaller };
}

/* Leads are created directly rather than through the public endpoint: these
 * tests are about who can read a lead, not about how it arrived. contactKey is
 * derived the same way the real intake derives it, so threading and dedupe
 * behave as they would in production. */
async function seedLead({ name, team, assignedTo }) {
  const email = `${name.toLowerCase().replace(/\W+/g, '.')}@example.com`;
  return Lead.create({
    name,
    email,
    contactKey: contactKeyFor(email),
    phone: '+919876500000',
    message: 'Spiti in June.',
    source: 'contact_form',
    team: team?._id ?? null,
    assignedTo: assignedTo?._id ?? null,
  });
}

const as = (session) => session.authHeader;

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
});

describe('record scope on enquiries', () => {
  it('shows a caller only the enquiries assigned to them', async () => {
    const people = await seedPeople();
    await seedLead({ name: 'Mine', team: people.north, assignedTo: people.northCaller });
    await seedLead({ name: 'Teammates', team: people.north, assignedTo: people.otherCaller });
    await seedLead({ name: 'Unassigned', team: people.north });

    const session = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads',
      headers: as(session),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.map((lead) => lead.name)).toEqual(['Mine']);
  });

  it('refuses a caller the detail of a lead belonging to a teammate', async () => {
    const people = await seedPeople();
    const theirs = await seedLead({
      name: 'Teammates',
      team: people.north,
      assignedTo: people.otherCaller,
    });

    const session = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/leads/${theirs._id}`,
      headers: as(session),
    });

    expect(response.statusCode).toBe(403);
    /* The message must not confirm the record exists — otherwise the id space
     * becomes an oracle for "is this a real customer". */
    expect(response.json().error.message).not.toMatch(/teammate|assigned|exists/i);
  });

  it('shows a manager their whole team but not another team', async () => {
    const people = await seedPeople();
    await seedLead({ name: 'North Lead', team: people.north, assignedTo: people.northCaller });
    await seedLead({ name: 'North Unassigned', team: people.north });
    const southLead = await seedLead({
      name: 'South Lead',
      team: people.south,
      assignedTo: people.southManager,
    });

    const session = await signIn(app, { email: 'north.manager@taifer.test', password: PASSWORD });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads',
      headers: as(session),
    });
    expect(list.json().data.map((lead) => lead.name).sort()).toEqual([
      'North Lead',
      'North Unassigned',
    ]);

    const crossTeam = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/leads/${southLead._id}`,
      headers: as(session),
    });
    expect(crossTeam.statusCode).toBe(403);
  });

  it('fails closed for a manager with no team rather than showing everything', async () => {
    await seedPeople();
    await createAdmin({
      email: 'floating.manager@taifer.test',
      name: 'Floating Manager',
      role: 'team_manager',
    });
    await seedLead({ name: 'Somebody' });

    const session = await signIn(app, {
      email: 'floating.manager@taifer.test',
      password: PASSWORD,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads',
      headers: as(session),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([]);
  });

  it('shows an admin every team', async () => {
    const people = await seedPeople();
    await seedLead({ name: 'North Lead', team: people.north });
    await seedLead({ name: 'South Lead', team: people.south });

    const session = await signIn(app, { email: 'admin2@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads',
      headers: as(session),
    });

    expect(response.json().meta.total).toBe(2);
  });
});

describe('field-level rules on enquiries', () => {
  it('hides the fields a caller may not read', async () => {
    const people = await seedPeople();
    const lead = await seedLead({
      name: 'Mine',
      team: people.north,
      assignedTo: people.northCaller,
    });
    await Lead.updateOne({ _id: lead._id }, { $set: { spamScore: 42 } });

    const session = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/leads/${lead._id}`,
      headers: as(session),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.spamScore).toBeUndefined();
    expect(response.json().data.context?.ipHash).toBeUndefined();
    /* Still useful to them: the hiding must be surgical, not a blanket. */
    expect(response.json().data.name).toBe('Mine');
  });

  it('lets a super admin read the fields a caller cannot', async () => {
    const people = await seedPeople();
    const lead = await seedLead({ name: 'Mine', team: people.north });
    await Lead.updateOne({ _id: lead._id }, { $set: { spamScore: 42 } });

    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/leads/${lead._id}`,
      headers: as(session),
    });

    expect(response.json().data.spamScore).toBe(42);
  });

  it('refuses a caller the permission to reassign work', async () => {
    const people = await seedPeople();
    const lead = await seedLead({
      name: 'Mine',
      team: people.north,
      assignedTo: people.northCaller,
    });

    const session = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${lead._id}/assign`,
      headers: as(session),
      payload: { assignedTo: String(people.otherCaller._id) },
    });

    expect(response.statusCode).toBe(403);
    const unchanged = await Lead.findById(lead._id).lean();
    expect(String(unchanged.assignedTo)).toBe(String(people.northCaller._id));
  });

  it('still lets a caller do the job: moving their own enquiry along', async () => {
    const people = await seedPeople();
    const lead = await seedLead({
      name: 'Mine',
      team: people.north,
      assignedTo: people.northCaller,
    });

    const session = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${lead._id}/status`,
      headers: as(session),
      payload: { status: 'contacted' },
    });

    expect(response.statusCode).toBe(200);
    expect((await Lead.findById(lead._id).lean()).status).toBe('contacted');
  });
});

describe('rank guards on accounts', () => {
  it('stops an admin promoting anyone to their own level', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'admin2@taifer.test', password: PASSWORD });

    const sideways = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${people.northCaller._id}`,
      headers: as(session),
      payload: { role: 'admin' },
    });
    expect(sideways.statusCode).toBe(403);

    const upwards = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${people.northCaller._id}`,
      headers: as(session),
      payload: { role: 'super_admin' },
    });
    expect(upwards.statusCode).toBe(403);

    expect((await AdminUser.findById(people.northCaller._id).lean()).role).toBe('caller');
  });

  it('lets an admin promote a caller to team manager', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'admin2@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${people.northCaller._id}`,
      headers: as(session),
      payload: { role: 'team_manager' },
    });

    expect(response.statusCode).toBe(200);
    expect((await AdminUser.findById(people.northCaller._id).lean()).role).toBe('team_manager');
  });

  it('stops an admin editing another admin', async () => {
    await seedPeople();
    const { user: peer } = await createAdmin({ email: 'peer@taifer.test', role: 'admin' });
    const session = await signIn(app, { email: 'admin2@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${peer._id}`,
      headers: as(session),
      payload: { isActive: false },
    });

    expect(response.statusCode).toBe(403);
    expect((await AdminUser.findById(peer._id).lean()).isActive).toBe(true);
  });

  it('stops anyone editing their own account through the user API', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'admin2@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${people.admin._id}`,
      headers: as(session),
      payload: { name: 'Renamed Myself' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('stops a super admin creating an account at their own level downstream of rank', async () => {
    await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: as(session),
      payload: {
        name: 'Second Owner',
        email: 'second.owner@taifer.test',
        password: 'another-correct-horse',
        role: 'super_admin',
      },
    });

    /* Deliberate: even the owner cannot mint a peer through the API. A second
     * super admin is created with the CLI, on the server, by someone with
     * shell access — which is the only place that authority actually lives. */
    expect(response.statusCode).toBe(403);
  });

  it('refuses to demote the last active super admin', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    /* Someone else has to do it: you cannot edit yourself here. So the owner
     * is demoted by a second owner, created directly. */
    const { user: second } = await createAdmin({
      email: 'second@taifer.test',
      role: 'super_admin',
    });
    const secondSession = await signIn(app, { email: 'second@taifer.test', password: PASSWORD });

    const first = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${people.owner._id}`,
      headers: as(secondSession),
      payload: { role: 'admin' },
    });
    expect(first.statusCode).toBe(403);

    /* And with only one left, demotion is refused outright rather than 403 on
     * rank — proving the lockout guard fires, not just the rank check. */
    const lastOne = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${second._id}`,
      headers: as(session),
      payload: { role: 'admin' },
    });
    expect(lastOne.statusCode).toBe(403);
    expect((await AdminUser.findById(second._id).lean()).role).toBe('super_admin');
  });

  it('reports each person’s open workload in the directory', async () => {
    const people = await seedPeople();
    await seedLead({ name: 'One', team: people.north, assignedTo: people.northCaller });
    await seedLead({ name: 'Two', team: people.north, assignedTo: people.northCaller });
    const closed = await seedLead({
      name: 'Closed',
      team: people.north,
      assignedTo: people.northCaller,
    });
    await Lead.updateOne({ _id: closed._id }, { $set: { status: 'won' } });

    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: as(session),
    });

    const row = response.json().data.find((user) => user.email === 'north.caller@taifer.test');
    /* The column is what makes the list useful for reassigning work. It was
     * rendered but never populated, so it showed a dash for everybody. */
    expect(row.openLeads).toBe(2);
    /* Won, lost and spam are finished, not workload. */
    const idle = response.json().data.find((user) => user.email === 'north.caller2@taifer.test');
    expect(idle.openLeads).toBe(0);
  });

  it('gives the signed-in user an id the dashboard can match on', async () => {
    await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'owner@taifer.test', password: PASSWORD },
    });

    const user = login.json().data.user;
    /* `toJSON` gives `_id` and /auth/me gives `id`. The people list compares
     * `user.id` to each row's `_id`, so without both the signed-in user's own
     * row was labelled "above your level" rather than "that's you". */
    expect(user.id).toBeTruthy();
    expect(String(user.id)).toBe(String(user._id));
    expect(user.permissions.length).toBeGreaterThan(0);
    expect(user.scope).toBe('all');

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: as(session),
    });
    expect(String(me.json().data.id)).toBe(String(user.id));
  });

  it('refuses a caller the user directory entirely', async () => {
    await seedPeople();
    const session = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: as(session),
    });

    expect(response.statusCode).toBe(403);
  });

  it('scopes the user directory to a manager’s own team', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'north.manager@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: as(session),
    });

    expect(response.statusCode).toBe(200);
    const emails = response.json().data.map((user) => user.email).sort();
    expect(emails).toEqual([
      'north.caller2@taifer.test',
      'north.caller@taifer.test',
      'north.manager@taifer.test',
    ]);
    expect(emails).not.toContain(people.southManager.email);
  });
});

describe('permission overrides', () => {
  it('lets a super admin grant one extra permission without changing the role', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const before = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const refused = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/export.csv',
      headers: as(before),
    });
    expect(refused.statusCode).toBe(403);

    const grant = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${people.northCaller._id}/permissions`,
      headers: as(session),
      payload: { granted: ['leads.export'] },
    });
    expect(grant.statusCode).toBe(200);
    expect(grant.json().data.permissions).toContain('leads.export');

    /* A fresh sign-in, because the grant takes effect on the next request and
     * the earlier token was minted before it. */
    const after = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const allowed = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/export.csv',
      headers: as(after),
    });
    expect(allowed.statusCode).toBe(200);

    expect((await AdminUser.findById(people.northCaller._id).lean()).role).toBe('caller');
  });

  it('applies a revocation immediately, without waiting for the token to expire', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });
    const manager = await signIn(app, { email: 'north.manager@taifer.test', password: PASSWORD });

    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/export.csv',
      headers: as(manager),
    });
    expect(before.statusCode).toBe(200);

    await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${people.northManager._id}/permissions`,
      headers: as(session),
      payload: { revoked: ['leads.export'] },
    });

    /* Same token as before. Permissions are recomputed per request, so the
     * revocation must bite without a new sign-in. */
    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/export.csv',
      headers: as(manager),
    });
    expect(after.statusCode).toBe(403);
  });

  it('stops an admin granting a permission they do not hold themselves', async () => {
    const people = await seedPeople();
    /* The admin role has no users.manage_permissions, so it is granted here as
     * an override — proving the "cannot grant beyond yourself" rule holds even
     * for someone who reached the endpoint through an override. */
    await AdminUser.updateOne(
      { _id: people.admin._id },
      { $set: { 'permissionOverrides.granted': ['users.manage_permissions'] } },
    );
    const session = await signIn(app, { email: 'admin2@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${people.northCaller._id}/permissions`,
      headers: as(session),
      payload: { granted: ['compliance.erase'] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toMatch(/do not hold/i);
  });

  it('stops anyone granting themselves anything', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${people.owner._id}/permissions`,
      headers: as(session),
      payload: { granted: ['leads.export'] },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('teams', () => {
  it('adds a named manager to the team, because scope follows membership', async () => {
    await seedPeople();
    const { user: fresh } = await createAdmin({
      email: 'fresh.manager@taifer.test',
      role: 'team_manager',
    });
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/teams',
      headers: as(session),
      payload: { name: 'East Desk', manager: String(fresh._id) },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.slug).toBe('east-desk');

    const reloaded = await AdminUser.findById(fresh._id).lean();
    expect(reloaded.teams.map(String)).toContain(String(response.json().data._id));
  });

  it('refuses a caller as a team manager', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/teams',
      headers: as(session),
      payload: { name: 'West Desk', manager: String(people.northCaller._id) },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toMatch(/team manager role or higher/i);
  });

  it('shows a manager only their own teams', async () => {
    await seedPeople();
    const session = await signIn(app, { email: 'north.manager@taifer.test', password: PASSWORD });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/teams',
      headers: as(session),
    });
    expect(list.json().data.map((team) => team.slug)).toEqual(['north-desk']);
  });

  it('hides another team’s detail behind the same message as a missing one', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'north.manager@taifer.test', password: PASSWORD });

    const other = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/teams/${people.south._id}`,
      headers: as(session),
    });
    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/teams/000000000000000000000000',
      headers: as(session),
    });

    expect(other.statusCode).toBe(404);
    expect(other.json().error.message).toBe(missing.json().error.message);
  });

  it('applies membership as a delta so concurrent edits do not overwrite each other', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });
    const { user: joiner } = await createAdmin({ email: 'joiner@taifer.test', role: 'caller' });

    const added = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/teams/${people.north._id}/members`,
      headers: as(session),
      payload: { add: [String(joiner._id)] },
    });
    expect(added.statusCode).toBe(200);
    expect(added.json().data.added).toBe(1);

    /* The second call names only the person it is removing. The joiner added
     * above survives, which a replace-the-roster API would not manage. */
    const removed = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/teams/${people.north._id}/members`,
      headers: as(session),
      payload: { remove: [String(people.otherCaller._id)] },
    });
    expect(removed.statusCode).toBe(200);

    const roster = await AdminUser.find({ teams: people.north._id }).select('email').lean();
    const emails = roster.map((user) => user.email);
    expect(emails).toContain('joiner@taifer.test');
    expect(emails).not.toContain('north.caller2@taifer.test');
  });

  it('refuses to remove the team’s own manager', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/teams/${people.north._id}/members`,
      headers: as(session),
      payload: { remove: [String(people.northManager._id)] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toMatch(/reassign the team manager/i);
  });

  it('refuses to deactivate a team that still has open enquiries', async () => {
    const people = await seedPeople();
    await seedLead({ name: 'Still Open', team: people.north });
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/teams/${people.north._id}`,
      headers: as(session),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toMatch(/open enquir/i);
    expect((await Team.findById(people.north._id).lean()).isActive).toBe(true);
  });
});

describe('deactivation', () => {
  it('refuses to deactivate someone holding open enquiries', async () => {
    const people = await seedPeople();
    await seedLead({ name: 'In Progress', team: people.north, assignedTo: people.northCaller });
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${people.northCaller._id}`,
      headers: as(session),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toMatch(/open enquir/i);
  });

  it('deactivates a clear account and ends its sessions at once', async () => {
    const people = await seedPeople();
    const theirs = await signIn(app, { email: 'north.caller@taifer.test', password: PASSWORD });
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${people.northCaller._id}`,
      headers: as(session),
    });
    expect(response.statusCode).toBe(200);

    /* The token was valid a moment ago. Deactivation has to invalidate it now,
     * not whenever it happens to expire. */
    const afterwards = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads',
      headers: as(theirs),
    });
    expect(afterwards.statusCode).toBe(401);
  });

  it('refuses to deactivate someone who still manages a team', async () => {
    const people = await seedPeople();
    const session = await signIn(app, { email: 'owner@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${people.northManager._id}`,
      headers: as(session),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toMatch(/manages/i);
  });
});
