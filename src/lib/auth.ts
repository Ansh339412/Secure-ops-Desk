import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Member, Role } from '@/types';

export const ACTIVE_ORG_COOKIE = 'active_org';

export const canWrite = (role: Role) => role === 'admin' || role === 'analyst';
export const isAdmin = (role: Role) => role === 'admin';

/** Authentication: who is this? Redirects to /login when there is no valid session. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

interface MembershipRow {
  role: Role;
  organizations: { id: string; name: string } | null;
}

/**
 * Authorization context: which organization is active and what role does this user hold in it?
 * The organization comes from the user's real memberships, never from request input,
 * and RLS re-checks the same rule in the database.
 */
export async function requireOrg() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from('memberships')
    .select('role, organizations(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const rows = ((data ?? []) as unknown as MembershipRow[]).filter((r) => r.organizations);
  if (rows.length === 0) redirect('/onboarding');

  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = rows.find((r) => r.organizations!.id === preferred) ?? rows[0];

  return {
    supabase,
    user,
    org: active.organizations!,
    role: active.role,
    orgs: rows.map((r) => r.organizations!),
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function getMembers(supabase: Supabase, orgId: string): Promise<Member[]> {
  const { data: memberships } = await supabase
    .from('memberships')
    .select('user_id, role, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  const ids = (memberships ?? []).map((m) => m.user_id as string);
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  return (memberships ?? []).map((m) => ({
    user_id: m.user_id as string,
    role: m.role as Role,
    created_at: m.created_at as string,
    full_name: (byId.get(m.user_id as string)?.full_name as string | null) ?? null,
    email: (byId.get(m.user_id as string)?.email as string | null) ?? null,
  }));
}

export async function getAssetOptions(supabase: Supabase, orgId: string) {
  const { data } = await supabase
    .from('assets')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })
    .limit(500);
  return (data ?? []) as { id: string; name: string }[];
}

export const memberName = (members: Member[], id: string | null) => {
  if (!id) return null;
  const m = members.find((x) => x.user_id === id);
  return m ? (m.full_name ?? m.email ?? 'Member') : 'Former member';
};
