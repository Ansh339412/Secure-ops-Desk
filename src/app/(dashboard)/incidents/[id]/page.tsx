import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { addComment, deleteIncident } from '@/actions/incidents';
import { IncidentForm } from '@/components/incidents/incident-form';
import { DeleteForm } from '@/components/ui/delete-form';
import { ActionForm, Field, SubmitButton, Textarea } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { canWrite, getAssetOptions, getMembers, isAdmin, memberName, requireOrg } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/utils';
import { idSchema } from '@/lib/validation/schemas';
import type { Incident, IncidentComment } from '@/types';

export const metadata: Metadata = { title: 'Incident' };

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = idSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const { supabase, org, role } = await requireOrg();

  const { data } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('organization_id', org.id)
    .maybeSingle();
  if (!data) notFound();
  const incident = data as Incident;

  const [assets, members, commentsRes] = await Promise.all([
    getAssetOptions(supabase, org.id),
    getMembers(supabase, org.id),
    supabase
      .from('incident_comments')
      .select('id, author_id, body, created_at')
      .eq('incident_id', incident.id)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: true }),
  ]);
  const comments = (commentsRes.data ?? []) as IncidentComment[];

  return (
    <>
      <PageHeader
        title={incident.title}
        description={`Reported ${formatDate(incident.created_at)} by ${memberName(members, incident.reported_by) ?? 'unknown'}`}
        action={
          isAdmin(role) ? (
            <DeleteForm
              action={deleteIncident}
              id={incident.id}
              confirm="Delete this incident and its notes?"
            >
              Delete incident
            </DeleteForm>
          ) : undefined
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <IncidentForm
            incident={incident}
            assets={assets}
            members={members}
            canTriage={canWrite(role)}
            readOnly={!canWrite(role)}
          />
        </div>

        <section className="panel p-5" aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="font-semibold">
            Investigation notes
          </h2>
          {comments.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">No notes yet. Add what you found or did.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="border-l-2 border-rule pl-3">
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {memberName(members, c.author_id) ?? 'Unknown'} · {formatDateTime(c.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <ActionForm action={addComment} className="mt-5 space-y-3">
            <input type="hidden" name="incident_id" value={incident.id} />
            <Field name="body" label="Add a note">
              <Textarea name="body" rows={3} required maxLength={2000} />
            </Field>
            <SubmitButton>Add note</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
