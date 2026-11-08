'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canWrite, isAdmin, requireOrg } from '@/lib/auth';
import { idSchema, vulnerabilitySchema } from '@/lib/validation/schemas';
import { nullify } from '@/lib/utils';
import type { FormState } from '@/types';
import { failed, forbidden, parseForm } from './helpers';

export async function saveVulnerability(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, org, role } = await requireOrg();
  if (!canWrite(role)) return forbidden('change vulnerabilities');

  const parsed = parseForm(vulnerabilitySchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const payload = nullify(fields, ['description', 'cve_id', 'due_date']);

  if (id) {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', org.id)
      .select('id');
    if (error) return failed('save the vulnerability', error);
    if (!data?.length) return { error: 'Vulnerability not found.' };
    revalidatePath('/vulnerabilities');
    return { ok: 'Vulnerability saved.' };
  }

  // The composite foreign key rejects an asset_id that belongs to another organization.
  const { data, error } = await supabase
    .from('vulnerabilities')
    .insert({ ...payload, organization_id: org.id, created_by: user.id })
    .select('id')
    .single();
  if (error) return failed('record the vulnerability', error);
  revalidatePath('/vulnerabilities');
  redirect(`/vulnerabilities/${data.id}`);
}

export async function deleteVulnerability(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, org, role } = await requireOrg();
  if (!isAdmin(role)) return forbidden('delete vulnerabilities');
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await supabase
    .from('vulnerabilities')
    .delete()
    .eq('id', parsed.data.id)
    .eq('organization_id', org.id)
    .select('id');
  if (error) return failed('delete the vulnerability', error);
  if (!data?.length) return { error: 'Vulnerability not found.' };
  revalidatePath('/vulnerabilities');
  redirect('/vulnerabilities');
}
