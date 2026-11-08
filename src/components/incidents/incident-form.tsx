import { saveIncident } from '@/actions/incidents';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { INCIDENT_STATUSES, SEVERITIES } from '@/lib/constants';
import type { Incident, Member } from '@/types';

export function IncidentForm({
  incident,
  assets,
  members,
  canTriage,
  readOnly = false,
}: {
  incident?: Incident;
  assets: { id: string; name: string }[];
  members: Member[];
  canTriage: boolean;
  readOnly?: boolean;
}) {
  return (
    <ActionForm action={saveIncident} className="space-y-4">
      {incident && <input type="hidden" name="id" value={incident.id} />}
      {!canTriage && <input type="hidden" name="status" value="open" />}
      <fieldset disabled={readOnly} className="min-w-0 space-y-4">
        <Field name="title" label="What happened?">
          <Input
            name="title"
            defaultValue={incident?.title}
            required
            minLength={3}
            maxLength={160}
            placeholder="Suspicious login from an unknown device"
          />
        </Field>
        <Field name="description" label="Details">
          <Textarea name="description" defaultValue={incident?.description} maxLength={4000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="severity" label="Severity">
            <Select
              name="severity"
              options={SEVERITIES}
              defaultValue={incident?.severity ?? 'medium'}
            />
          </Field>
          <Field name="asset_id" label="Related asset">
            <Select
              name="asset_id"
              options={assets.map((a) => ({ value: a.id, label: a.name }))}
              defaultValue={incident?.asset_id}
              placeholder="None"
            />
          </Field>
          {canTriage && (
            <>
              <Field name="status" label="Status">
                <Select
                  name="status"
                  options={INCIDENT_STATUSES}
                  defaultValue={incident?.status ?? 'open'}
                />
              </Field>
              <Field name="assigned_to" label="Assigned to">
                <Select
                  name="assigned_to"
                  options={members.map((m) => ({
                    value: m.user_id,
                    label: m.full_name ?? m.email ?? 'Member',
                  }))}
                  defaultValue={incident?.assigned_to}
                  placeholder="Unassigned"
                />
              </Field>
            </>
          )}
        </div>
      </fieldset>
      {!readOnly && <SubmitButton>{incident ? 'Save changes' : 'Report incident'}</SubmitButton>}
    </ActionForm>
  );
}
