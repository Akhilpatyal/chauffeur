import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import {
  Banner,
  Drawer,
  Tabs,
  Empty,
  Spinner,
  formatAgo,
  formatDate,
  roleLabel,
} from '../components/ui.jsx';

/*
 * People: accounts and teams.
 *
 * The screen's job is to make the hierarchy legible, so three things are shown
 * that an ordinary user list leaves out:
 *
 *   - What each person can actually see ("their own enquiries", "the North
 *     desk", "everything"), because that is the question being answered when
 *     somebody says "why can't she see this lead".
 *   - Which rows the viewer may edit at all, decided by the server and sent as
 *     `canManage`. Rendering a disabled row is honest; rendering an enabled one
 *     that fails on save is not.
 *   - Permissions as a role baseline plus explicit differences, never as a flat
 *     list of ticks, so "this person additionally has export" stays true after
 *     somebody later changes what the role means.
 */
const SCOPE_WORDS = {
  all: 'Every enquiry',
  team: 'Their teams’ enquiries',
  own: 'Only enquiries assigned to them',
};

/* Grouped so the editor reads as subjects rather than as 34 checkboxes. */
const PERMISSION_GROUPS = [
  { prefix: 'dashboard', label: 'Dashboard' },
  { prefix: 'leads', label: 'Enquiries' },
  { prefix: 'content', label: 'Website content' },
  { prefix: 'uploads', label: 'Uploads' },
  { prefix: 'users', label: 'Accounts' },
  { prefix: 'teams', label: 'Teams' },
  { prefix: 'analytics', label: 'Analytics' },
  { prefix: 'observability', label: 'Monitoring' },
  { prefix: 'security', label: 'Security' },
  { prefix: 'audit', label: 'Audit trail' },
  { prefix: 'compliance', label: 'Data requests' },
  { prefix: 'settings', label: 'Settings' },
  { prefix: 'flags', label: 'Feature flags' },
];

function groupPermissions(permissions) {
  const groups = PERMISSION_GROUPS.map((group) => ({
    ...group,
    items: permissions.filter((name) => name.split('.')[0] === group.prefix),
  })).filter((group) => group.items.length > 0);

  /* Anything whose prefix is not in the list above still has to appear, or a
   * permission added to the server becomes invisible here. */
  const covered = new Set(groups.flatMap((group) => group.items));
  const rest = permissions.filter((name) => !covered.has(name));
  return rest.length > 0 ? [...groups, { prefix: 'other', label: 'Other', items: rest }] : groups;
}

export default function People({ user }) {
  const [tab, setTab] = useState('users');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const can = useCallback(
    (permission) => (user.permissions ?? []).includes(permission),
    [user.permissions],
  );

  const tabs = [
    { key: 'users', label: 'People' },
    ...(can('teams.view') ? [{ key: 'teams', label: 'Teams' }] : []),
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>People &amp; teams</h2>
          <p>
            Who works here, what they can see, and which desk they sit on. Teams decide whose
            enquiries each person can reach.
          </p>
        </div>
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>
      <Banner kind="ok" onDismiss={() => setNotice(null)}>
        {notice}
      </Banner>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'users' && (
        <UsersTab user={user} can={can} onError={setError} onNotice={setNotice} />
      )}
      {tab === 'teams' && (
        <TeamsTab user={user} can={can} onError={setError} onNotice={setNotice} />
      )}
    </>
  );
}

function UsersTab({ user, can, onError, onNotice }) {
  const [users, setUsers] = useState(null);
  const [teams, setTeams] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ role: '', team: '', isActive: '', q: '' });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, metadata] = await Promise.all([api.users.list(filters), api.users.meta()]);
      setUsers(list.data);
      setMeta(metadata.data);
      if (can('teams.view')) {
        const teamList = await api.teams.list({ includeInactive: 'true' });
        setTeams(teamList.data);
      }
    } catch (requestError) {
      onError(requestError.message);
      setUsers([]);
    }
  }, [filters, can, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (label, work) => {
    try {
      await work();
      onNotice(label);
      onError(null);
      await load();
    } catch (requestError) {
      onError(requestError.message);
    }
  };

  if (!users) return <Spinner>Loading people…</Spinner>;

  return (
    <>
      <div className="toolbar">
        <label>
          <span className="muted small">Search</span>
          <input
            value={filters.q}
            placeholder="Name or email"
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          />
        </label>
        <label className="shrink">
          <span className="muted small">Role</span>
          <select
            value={filters.role}
            onChange={(event) => setFilters({ ...filters, role: event.target.value })}
          >
            <option value="">All roles</option>
            {['super_admin', 'admin', 'team_manager', 'caller'].map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        {teams.length > 0 && (
          <label className="shrink">
            <span className="muted small">Team</span>
            <select
              value={filters.team}
              onChange={(event) => setFilters({ ...filters, team: event.target.value })}
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="shrink">
          <span className="muted small">Status</span>
          <select
            value={filters.isActive}
            onChange={(event) => setFilters({ ...filters, isActive: event.target.value })}
          >
            <option value="">Everyone</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </label>
        <div className="spacer" />
        {can('users.create') && (
          <button type="button" className="primary shrink" onClick={() => setCreating(true)}>
            Add person
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <Empty>Nobody matches those filters.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Can see</th>
              <th>Teams</th>
              <th>Open enquiries</th>
              <th>Last signed in</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((person) => {
              const overrides =
                (person.permissionOverrides?.granted?.length ?? 0) +
                (person.permissionOverrides?.revoked?.length ?? 0);

              return (
                <tr key={person._id} className={person.isActive ? undefined : 'dimmed'}>
                  <td>
                    <strong>{person.name}</strong>
                    <div className="muted small">{person.email}</div>
                    {!person.isActive && <span className="badge lost">deactivated</span>}
                    {person.mustChangePassword && person.isActive && (
                      <span className="badge new">temporary password</span>
                    )}
                  </td>
                  <td>
                    <span className="badge">{roleLabel(person.role)}</span>
                    {overrides > 0 && (
                      <div className="muted small">
                        {overrides} custom {overrides === 1 ? 'permission' : 'permissions'}
                      </div>
                    )}
                  </td>
                  {/* The question actually being asked when somebody says
                      "why can't she see this lead". */}
                  <td className="muted small">{SCOPE_WORDS[person.scope] ?? '—'}</td>
                  <td className="muted small">
                    {(person.teams ?? []).length === 0
                      ? '—'
                      : person.teams.map((team) => team.name ?? team).join(', ')}
                  </td>
                  <td>
                    {person.openLeads > 0 ? person.openLeads : <span className="muted">—</span>}
                  </td>
                  <td className="muted small">{formatAgo(person.lastLoginAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {person.canManage ? (
                      <button type="button" className="shrink" onClick={() => setEditing(person)}>
                        Manage
                      </button>
                    ) : (
                      /* Decided by the server and shown as a reason rather than
                         a missing button, so the limit is understandable. */
                      <span className="muted small">
                        {String(person._id) === String(user.id ?? user._id)
                          ? 'That’s you'
                          : 'Above your level'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {creating && (
        <CreatePerson
          meta={meta}
          teams={teams}
          onClose={() => setCreating(false)}
          onCreated={async (name) => {
            setCreating(false);
            await act(`${name} can now sign in.`, async () => {});
          }}
          onError={onError}
          onSubmit={(payload) => api.users.create(payload)}
        />
      )}

      {editing && (
        <ManagePerson
          person={editing}
          meta={meta}
          teams={teams}
          can={can}
          onClose={() => setEditing(null)}
          onDone={async (message) => {
            setEditing(null);
            await act(message, async () => {});
          }}
          onError={onError}
        />
      )}
    </>
  );
}

function CreatePerson({ meta, teams, onClose, onCreated, onError, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: meta?.assignableRoles?.at(-1) ?? 'caller',
    teams: [],
  });
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, mustChangePassword: true });
      await onCreated(form.name);
    } catch (requestError) {
      onError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title="Add a person"
      subtitle="They will be asked to choose their own password the first time they sign in."
      onClose={onClose}
    >
      <form onSubmit={submit} className="stack">
        <label>
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label>
          <span>Temporary password</span>
          <input
            type="text"
            required
            minLength={12}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          {/* Shown rather than masked on purpose: whoever creates the account
              has to be able to read this out, and it stops working the moment
              the new person signs in. */}
          <span className="muted small">
            At least 12 characters. They must change it on first sign-in, so this one is only for
            handing over.
          </span>
        </label>
        <label>
          <span>Role</span>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            {(meta?.assignableRoles ?? ['caller']).map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <span className="muted small">
            {SCOPE_WORDS[meta?.scopes?.[form.role]] ?? ''}
          </span>
        </label>

        {teams.length > 0 && (
          <fieldset>
            <legend>Teams</legend>
            <p className="muted small">
              A team manager or caller sees nothing until they are on a team.
            </p>
            {teams
              .filter((team) => team.isActive)
              .map((team) => (
                <label key={team._id} className="check">
                  <input
                    type="checkbox"
                    checked={form.teams.includes(team._id)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        teams: event.target.checked
                          ? [...form.teams, team._id]
                          : form.teams.filter((id) => id !== team._id),
                      })
                    }
                  />
                  <span>{team.name}</span>
                </label>
              ))}
          </fieldset>
        )}

        <div className="row">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create account'}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function ManagePerson({ person, meta, teams, can, onClose, onDone, onError }) {
  const [detail, setDetail] = useState(person);
  const [form, setForm] = useState({
    name: person.name,
    role: person.role,
    teams: (person.teams ?? []).map((team) => team._id ?? team),
  });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.users
      .get(person._id)
      .then((response) => setDetail(response.data))
      .catch(() => {});
  }, [person._id]);

  const run = async (message, work) => {
    setBusy(true);
    try {
      await work();
      await onDone(message);
    } catch (requestError) {
      onError(requestError.message);
      setBusy(false);
    }
  };

  const save = (event) => {
    event.preventDefault();
    const payload = { name: form.name, teams: form.teams };
    if (can('users.manage_roles') && form.role !== person.role) payload.role = form.role;
    if (password) payload.password = password;

    return run(`${form.name} updated.`, () => api.users.update(person._id, payload));
  };

  const roleChanged = form.role !== person.role;

  return (
    <Drawer title={person.name} subtitle={person.email} onClose={onClose}>
      <form onSubmit={save} className="stack">
        <label>
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>

        <label>
          <span>Role</span>
          <select
            disabled={!can('users.manage_roles')}
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            {/* The person's current role is included even when it is not one
                this viewer may assign, so the field shows the truth instead of
                silently displaying somebody else's role. */}
            {[...new Set([person.role, ...(meta?.assignableRoles ?? [])])].map((role) => (
              <option key={role} value={role} disabled={!meta?.assignableRoles?.includes(role)}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <span className="muted small">{SCOPE_WORDS[meta?.scopes?.[form.role]] ?? ''}</span>
          {roleChanged && (
            <span className="muted small">
              Changing the role signs them out of every device immediately.
            </span>
          )}
        </label>

        {teams.length > 0 && (
          <fieldset>
            <legend>Teams</legend>
            {teams
              .filter((team) => team.isActive || form.teams.includes(team._id))
              .map((team) => (
                <label key={team._id} className="check">
                  <input
                    type="checkbox"
                    checked={form.teams.includes(team._id)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        teams: event.target.checked
                          ? [...form.teams, team._id]
                          : form.teams.filter((id) => id !== team._id),
                      })
                    }
                  />
                  <span>
                    {team.name}
                    {String(team.manager?._id ?? team.manager) === String(person._id) && (
                      <em className="muted small"> — manages this team</em>
                    )}
                  </span>
                </label>
              ))}
          </fieldset>
        )}

        <label>
          <span>Reset password</span>
          <input
            type="text"
            minLength={12}
            placeholder="Leave blank to keep their current password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span className="muted small">
            Setting one here signs them out everywhere and asks them to choose a new password on
            their next sign-in.
          </span>
        </label>

        <div className="row">
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>

      <hr />

      <h4>What they can do</h4>
      <PermissionEditor
        person={detail}
        meta={meta}
        editable={can('users.manage_permissions')}
        onSaved={(message) => onDone(message)}
        onError={onError}
      />

      <hr />

      <h4>Account actions</h4>
      <dl className="kv">
        <dt>Last signed in</dt>
        <dd>{formatDate(detail.lastLoginAt)}</dd>
        <dt>Open enquiries</dt>
        <dd>{detail.openLeads ?? 0}</dd>
        <dt>Created</dt>
        <dd>{formatDate(detail.createdAt)}</dd>
      </dl>

      <div className="row">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              `${person.name} has been signed out of every device.`,
              () => api.users.revokeSessions(person._id),
            )
          }
        >
          Sign out everywhere
        </button>

        {detail.isActive && can('users.deactivate') && (
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() => {
              /* Deliberate confirm: this is the one action here somebody
                 notices immediately if it was a misclick. */
              if (!window.confirm(`Deactivate ${person.name}? They will not be able to sign in.`)) {
                return;
              }
              run(`${person.name} has been deactivated.`, () => api.users.deactivate(person._id));
            }}
          >
            Deactivate account
          </button>
        )}

        {!detail.isActive && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(`${person.name} can sign in again.`, () =>
                api.users.update(person._id, { isActive: true }),
              )
            }
          >
            Reactivate account
          </button>
        )}
      </div>
      <p className="muted small">
        Accounts are deactivated rather than deleted, so their enquiries, notes and audit history
        stay readable.
      </p>
    </Drawer>
  );
}

/*
 * Permissions as a baseline plus differences.
 *
 * Showing 34 checkboxes with no indication of which came from the role would
 * make every grant look deliberate, and the first time somebody changed what
 * "caller" means the screen would still show the old set as if it had been
 * chosen by hand. So each row says where it comes from, and saving sends only
 * the differences.
 */
function PermissionEditor({ person, meta, editable, onSaved, onError }) {
  const roleBaseline = useMemo(
    () => new Set(meta?.rolePermissions?.[person.role] ?? []),
    [meta, person.role],
  );

  const [granted, setGranted] = useState(new Set(person.permissionOverrides?.granted ?? []));
  const [revoked, setRevoked] = useState(new Set(person.permissionOverrides?.revoked ?? []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGranted(new Set(person.permissionOverrides?.granted ?? []));
    setRevoked(new Set(person.permissionOverrides?.revoked ?? []));
  }, [person]);

  const groups = useMemo(() => groupPermissions(meta?.permissions ?? []), [meta]);
  if (groups.length === 0) return <Spinner>Loading permissions…</Spinner>;

  const toggle = (name, nextHeld) => {
    const fromRole = roleBaseline.has(name);
    const nextGranted = new Set(granted);
    const nextRevoked = new Set(revoked);

    nextGranted.delete(name);
    nextRevoked.delete(name);

    /* Only a difference from the role is stored. Ticking something the role
     * already grants records nothing, which is what keeps the override list
     * meaningful instead of a copy of the role. */
    if (nextHeld && !fromRole) nextGranted.add(name);
    if (!nextHeld && fromRole) nextRevoked.add(name);

    setGranted(nextGranted);
    setRevoked(nextRevoked);
  };

  const held = (name) => (granted.has(name) ? true : revoked.has(name) ? false : roleBaseline.has(name));
  const differences = granted.size + revoked.size;

  const save = async () => {
    setSaving(true);
    try {
      await api.users.setPermissions(person._id, {
        granted: [...granted],
        revoked: [...revoked],
      });
      await onSaved(`Permissions updated for ${person.name}.`);
    } catch (requestError) {
      onError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className="muted small">
        {roleLabel(person.role)} grants {roleBaseline.size} of {meta.permissions.length}{' '}
        permissions.
        {differences > 0
          ? ` This account has ${differences} deliberate ${differences === 1 ? 'difference' : 'differences'}.`
          : ' This account uses the role exactly.'}
        {!editable && ' Only the owner can change individual permissions.'}
      </p>

      {groups.map((group) => (
        <fieldset key={group.prefix} className="permissions">
          <legend>{group.label}</legend>
          {group.items.map((name) => {
            const isHeld = held(name);
            const fromRole = roleBaseline.has(name);
            const changed = granted.has(name) || revoked.has(name);

            return (
              <label key={name} className={`check${changed ? ' changed' : ''}`}>
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={isHeld}
                  onChange={(event) => toggle(name, event.target.checked)}
                />
                <span>
                  {name.split('.')[1].replace(/_/g, ' ')}
                  {/* Where it came from, so nothing looks hand-chosen that
                      was not. */}
                  {granted.has(name) && <em className="muted small"> — added</em>}
                  {revoked.has(name) && <em className="muted small"> — removed</em>}
                  {!changed && fromRole && <em className="muted small"> — from role</em>}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}

      {editable && (
        <div className="row">
          <button type="button" className="primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save permissions'}
          </button>
          <button
            type="button"
            disabled={saving || differences === 0}
            onClick={() => {
              setGranted(new Set());
              setRevoked(new Set());
            }}
          >
            Reset to role
          </button>
        </div>
      )}
    </>
  );
}

function TeamsTab({ user, can, onError, onNotice }) {
  const [teams, setTeams] = useState(null);
  const [people, setPeople] = useState([]);
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.teams.list({ includeInactive: String(includeInactive) });
      setTeams(response.data);
      if (can('users.view')) {
        const staff = await api.users.list({ isActive: 'true' });
        setPeople(staff.data);
      }
    } catch (requestError) {
      onError(requestError.message);
      setTeams([]);
    }
  }, [includeInactive, can, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (message, work) => {
    try {
      await work();
      onNotice(message);
      onError(null);
      await load();
    } catch (requestError) {
      onError(requestError.message);
    }
  };

  if (!teams) return <Spinner>Loading teams…</Spinner>;

  return (
    <>
      <div className="toolbar">
        <label className="check shrink">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
          />
          <span>Show closed teams</span>
        </label>
        <div className="spacer" />
        {can('teams.create') && (
          <button type="button" className="primary shrink" onClick={() => setCreating(true)}>
            New team
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <Empty>
          No teams yet. A caller sees only what is assigned to them until there is a team to put
          them on.
        </Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Manager</th>
              <th>People</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team._id} className={team.isActive ? undefined : 'dimmed'}>
                <td>
                  <strong>{team.name}</strong>
                  {team.description && <div className="muted small">{team.description}</div>}
                  {!team.isActive && <span className="badge lost">closed</span>}
                </td>
                <td className="muted small">{team.manager?.name ?? 'Nobody appointed'}</td>
                <td>{team.memberCount}</td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="shrink" onClick={() => setOpen(team)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {creating && (
        <TeamForm
          people={people}
          onClose={() => setCreating(false)}
          onSubmit={(payload) => api.teams.create(payload)}
          onDone={(name) => {
            setCreating(false);
            return act(`${name} created.`, async () => {});
          }}
          onError={onError}
        />
      )}

      {open && (
        <TeamDrawer
          team={open}
          people={people}
          can={can}
          onClose={() => setOpen(null)}
          onDone={(message) => {
            setOpen(null);
            return act(message, async () => {});
          }}
          onError={onError}
        />
      )}
    </>
  );
}

function TeamForm({ team, people, onClose, onSubmit, onDone, onError }) {
  const [form, setForm] = useState({
    name: team?.name ?? '',
    description: team?.description ?? '',
    manager: team?.manager?._id ?? team?.manager ?? '',
  });
  const [saving, setSaving] = useState(false);

  /* Only people who could actually act on the team's enquiries. Offering a
   * caller here would create a team whose manager cannot see it. */
  const candidates = people.filter((person) =>
    ['team_manager', 'admin', 'super_admin'].includes(person.role),
  );

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, manager: form.manager || null });
      await onDone(form.name);
    } catch (requestError) {
      onError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={team ? `Edit ${team.name}` : 'New team'}
      subtitle="Teams decide whose enquiries each person can reach."
      onClose={onClose}
    >
      <form onSubmit={submit} className="stack">
        <label>
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Description</span>
          <input
            value={form.description}
            placeholder="Optional — what this desk handles"
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <label>
          <span>Manager</span>
          <select
            value={form.manager}
            onChange={(event) => setForm({ ...form, manager: event.target.value })}
          >
            <option value="">Nobody yet</option>
            {candidates.map((person) => (
              <option key={person._id} value={person._id}>
                {person.name} ({roleLabel(person.role)})
              </option>
            ))}
          </select>
          <span className="muted small">
            Must hold the team manager role or higher, and is added to the team automatically —
            visibility follows membership.
          </span>
        </label>
        <div className="row">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : team ? 'Save team' : 'Create team'}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function TeamDrawer({ team, people, can, onClose, onDone, onError }) {
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.teams
      .get(team._id)
      .then((response) => setDetail(response.data))
      .catch((requestError) => onError(requestError.message));
  }, [team._id, onError]);

  useEffect(load, [load]);

  const changeMembers = async (delta, message) => {
    setBusy(true);
    try {
      await api.teams.setMembers(team._id, delta);
      load();
      setBusy(false);
      if (message) onDone(message);
    } catch (requestError) {
      onError(requestError.message);
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <TeamForm
        team={team}
        people={people}
        onClose={() => setEditing(false)}
        onSubmit={(payload) => api.teams.update(team._id, payload)}
        onDone={(name) => onDone(`${name} updated.`)}
        onError={onError}
      />
    );
  }

  if (!detail) {
    return (
      <Drawer title={team.name} onClose={onClose}>
        <Spinner>Loading team…</Spinner>
      </Drawer>
    );
  }

  const memberIds = new Set(detail.members.map((member) => String(member._id)));
  const addable = people.filter((person) => !memberIds.has(String(person._id)));

  return (
    <Drawer
      title={detail.name}
      subtitle={detail.description || 'No description'}
      onClose={onClose}
    >
      <dl className="kv">
        <dt>Manager</dt>
        <dd>{detail.manager?.name ?? 'Nobody appointed'}</dd>
        <dt>People</dt>
        <dd>{detail.memberCount}</dd>
        <dt>Open enquiries</dt>
        <dd>{detail.openLeads}</dd>
      </dl>

      {can('teams.edit') && (
        <div className="row">
          <button type="button" onClick={() => setEditing(true)}>
            Edit details
          </button>
          {detail.isActive && (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(`Close ${detail.name}?`)) return;
                setBusy(true);
                try {
                  await api.teams.deactivate(team._id);
                  onDone(`${detail.name} closed.`);
                } catch (requestError) {
                  onError(requestError.message);
                  setBusy(false);
                }
              }}
            >
              Close team
            </button>
          )}
        </div>
      )}

      <hr />

      <h4>Roster</h4>
      {detail.members.length === 0 ? (
        <Empty>Nobody on this team yet.</Empty>
      ) : (
        <table>
          <tbody>
            {detail.members.map((member) => (
              <tr key={member._id}>
                <td>
                  <strong>{member.name}</strong>
                  <div className="muted small">
                    {roleLabel(member.role)}
                    {String(member._id) === String(detail.manager?._id) && ' · manager'}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {can('teams.manage_members') &&
                    String(member._id) !== String(detail.manager?._id) && (
                      <button
                        type="button"
                        className="shrink"
                        disabled={busy}
                        onClick={() =>
                          changeMembers(
                            { remove: [String(member._id)] },
                            `${member.name} removed from ${detail.name}.`,
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {can('teams.manage_members') && addable.length > 0 && (
        <label>
          <span>Add someone</span>
          <select
            value=""
            disabled={busy}
            onChange={(event) => {
              const id = event.target.value;
              if (!id) return;
              const person = addable.find((candidate) => String(candidate._id) === id);
              changeMembers({ add: [id] }, `${person?.name ?? 'Person'} added to ${detail.name}.`);
            }}
          >
            <option value="">Choose a person…</option>
            {addable.map((person) => (
              <option key={person._id} value={person._id}>
                {person.name} ({roleLabel(person.role)})
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="muted small">
        Removing someone leaves their enquiries with the team rather than unassigning them, so no
        work in progress disappears.
      </p>
    </Drawer>
  );
}
