'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin, requireOrg } from '@/lib/auth';
import { memberAddSchema, memberRoleSchema, userIdSchema } from '@/lib/validation/schemas';
import type { FormState } from '@/types';
import { failed, forbidden, parseForm } from './helpers';

export async function addMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org, role } = await requireOrg();
  if (!isAdmin(role)) return forbidden('manage the team');
  const parsed = parseForm(memberAddSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { error } = await supabase.rpc('add_member_by_email', {
    org: org.id,
    member_email: parsed.data.email,
    member_role: parsed.data.role,
  });
  if (error) {
    // These messages come from our own function and are safe to show to an admin.
    const known = ['No registered user', 'already a member'].some((m) => error.message.includes(m));
    return known ? { error: error.message } : failed('add the member', error);
  }
  revalidatePath('/team');
  return { ok: 'Member added.' };
}

export async function changeRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org, role } = await requireOrg();
  if (!isAdmin(role)) return forbidden('manage the team');
  const parsed = parseForm(memberRoleSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await supabase
    .from('memberships')
    .update({ role: parsed.data.role })
    .eq('org_id', org.id)
    .eq('user_id', parsed.data.user_id)
    .select('user_id');
  if (error) {
    return error.message.includes('at least one admin')
      ? { error: 'An organization must keep at least one admin.' }
      : failed('change the role', error);
  }
  if (!data?.length) return { error: 'Member not found.' };
  revalidatePath('/team');
  return { ok: 'Role updated.' };
}

export async function removeMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org, role } = await requireOrg();
  if (!isAdmin(role)) return forbidden('manage the team');
  const parsed = parseForm(userIdSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await supabase
    .from('memberships')
    .delete()
    .eq('org_id', org.id)
    .eq('user_id', parsed.data.user_id)
    .select('user_id');
  if (error) {
    return error.message.includes('at least one admin')
      ? { error: 'An organization must keep at least one admin.' }
      : failed('remove the member', error);
  }
  if (!data?.length) return { error: 'Member not found.' };
  revalidatePath('/team');
  return { ok: 'Member removed.' };
}
