'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canWrite, isAdmin, requireOrg } from '@/lib/auth';
import { assetSchema, idSchema } from '@/lib/validation/schemas';
import { nullify } from '@/lib/utils';
import type { FormState } from '@/types';
import { failed, forbidden, parseForm } from './helpers';

export async function saveAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, org, role } = await requireOrg();
  if (!canWrite(role)) return forbidden('change assets');

  const parsed = parseForm(assetSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const payload = nullify(fields, ['operating_system', 'owner_name', 'notes']);

  if (id) {
    const { data, error } = await supabase
      .from('assets')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', org.id)
      .select('id');
    if (error) return failed('save the asset', error);
    if (!data?.length) return { error: 'Asset not found.' };
    revalidatePath('/assets');
    return { ok: 'Asset saved.' };
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({ ...payload, organization_id: org.id, created_by: user.id })
    .select('id')
    .single();
  if (error) return failed('create the asset', error);
  revalidatePath('/assets');
  redirect(`/assets/${data.id}`);
}

export async function deleteAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org, role } = await requireOrg();
  if (!isAdmin(role)) return forbidden('delete assets');
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await supabase
    .from('assets')
    .delete()
    .eq('id', parsed.data.id)
    .eq('organization_id', org.id)
    .select('id');
  if (error) return failed('delete the asset', error);
  if (!data?.length) return { error: 'Asset not found.' };
  revalidatePath('/assets');
  redirect('/assets');
}
