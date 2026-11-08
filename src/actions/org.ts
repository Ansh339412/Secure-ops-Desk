'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACTIVE_ORG_COOKIE, requireUser } from '@/lib/auth';
import { idSchema, orgSchema } from '@/lib/validation/schemas';
import type { FormState } from '@/types';
import { failed, parseForm } from './helpers';

async function setActiveOrg(id: string) {
  (await cookies()).set(ACTIVE_ORG_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createOrganization(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const parsed = parseForm(orgSchema, formData);
  if (!parsed.ok) return parsed.state;

  // create_organization() inserts the organization and the creator's admin membership atomically.
  const { data, error } = await supabase.rpc('create_organization', { org_name: parsed.data.name });
  if (error || !data) return failed('create the organization', error);

  await setActiveOrg(data as string);
  redirect('/dashboard');
}

export async function switchOrganization(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return;

  // Only switch to an organization the user actually belongs to.
  const { data } = await supabase
    .from('memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('org_id', parsed.data.id)
    .maybeSingle();
  if (data) await setActiveOrg(parsed.data.id);
  redirect('/dashboard');
}
