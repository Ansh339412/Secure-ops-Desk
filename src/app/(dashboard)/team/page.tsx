import type { Metadata } from 'next';
import { addMember, changeRole, removeMember } from '@/actions/team';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { getMembers, isAdmin, requireOrg } from '@/lib/auth';
import { ROLES, label } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage() {
  const { supabase, org, role, user } = await requireOrg();
  const members = await getMembers(supabase, org.id);
  const admin = isAdmin(role);

  return (
    <>
      <PageHeader
        title="Team"
        description="Admins manage people and can delete records. Analysts create and edit records. Viewers read and report incidents."
      />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Joined</th>
              {admin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id}>
                <td>
                  <p className="font-medium">
                    {m.full_name ?? 'Unnamed'}
                    {m.user_id === user.id && (
                      <span className="ml-2 text-xs text-ink-soft">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-soft">{m.email}</p>
                </td>
                <td>
                  {admin ? (
                    <ActionForm action={changeRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <label htmlFor={`role-${m.user_id}`} className="sr-only">
                        Role for {m.full_name ?? m.email}
                      </label>
                      <select
                        id={`role-${m.user_id}`}
                        name="role"
                        defaultValue={m.role}
                        className="input w-32"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {label(r)}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="secondary">Save</SubmitButton>
                    </ActionForm>
                  ) : (
                    label(m.role)
                  )}
                </td>
                <td>{formatDate(m.created_at)}</td>
                {admin && (
                  <td>
                    <ActionForm action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <SubmitButton
                        variant="danger"
                        confirm={`Remove ${m.full_name ?? m.email} from ${org.name}?`}
                      >
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {admin && (
        <section className="panel mt-6 max-w-xl p-5">
          <h2 className="font-semibold">Add a member</h2>
          <p className="mt-1 mb-4 text-sm text-ink-soft">
            The person must already have registered with this email address.
          </p>
          <ActionForm action={addMember} className="space-y-4">
            <Field name="email" label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field name="role" label="Role">
              <Select name="role" options={ROLES} defaultValue="viewer" />
            </Field>
            <SubmitButton>Add member</SubmitButton>
          </ActionForm>
        </section>
      )}
    </>
  );
}
