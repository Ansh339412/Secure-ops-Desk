'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canWrite, isAdmin, requireOrg } from '@/lib/auth';
import { commentSchema, idSchema, incidentSchema } from '@/lib/validation/schemas';
import { nullify } from '@/lib/utils';
import type { FormState } from '@/types';
import { failed, forbidden, parseForm } from './helpers';

export async function saveIncident(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, org, role } = await requireOrg();
  const parsed = parseForm(incidentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;

  if (id) {
    if (!canWrite(role)) return forbidden('update incidents');
    const payload = nullify(fields, ['description', 'asset_id', 'assigned_to']);
    const { data, error } = await supabase
      .from('incidents')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', org.id)
      .select('id');
    if (error) return failed('save the incident', error);
    if (!data?.length) return { error: 'Incident not found.' };
    revalidatePath('/incidents');
    return { ok: 'Incident saved.' };
  }

  // Any member may report an incident; only analysts and admins can triage or assign it
  // (RLS enforces the same rule: viewers can only insert open, unassigned incidents).
  const triage = canWrite(role);
  const payload = nullify(
    {
      ...fields,
      status: triage ? fields.status : 'open',
      assigned_to: triage ? fields.assigned_to : undefined,
    },
    ['description', 'asset_id', 'assigned_to'],
  );
  const { data, error } = await supabase
    .from('incidents')
    .insert({ ...payload, organization_id: org.id, reported_by: user.id })
    .select('id')
    .single();
  if (error) return failed('report the incident', error);
  revalidatePath('/incidents');
  redirect(`/incidents/${data.id}`);
}

export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, org } = await requireOrg();
  const parsed = parseForm(commentSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { error } = await supabase.from('incident_comments').insert({
    organization_id: org.id,
    incident_id: parsed.data.incident_id,
    author_id: user.id,
    body: parsed.data.body,
  });
  if (error) return failed('add the note', error);
  revalidatePath(`/incidents/${parsed.data.incident_id}`);
  return { ok: 'Note added.' };
}

export async function deleteIncident(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org, role } = await requireOrg();
  if (!isAdmin(role)) return forbidden('delete incidents');
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', parsed.data.id)
    .eq('organization_id', org.id)
    .select('id');
  if (error) return failed('delete the incident', error);
  if (!data?.length) return { error: 'Incident not found.' };
  revalidatePath('/incidents');
  redirect('/incidents');
}
