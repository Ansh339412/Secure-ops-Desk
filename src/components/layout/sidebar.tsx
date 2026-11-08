import Link from 'next/link';
import { logout } from '@/actions/auth';
import { switchOrganization } from '@/actions/org';
import { label } from '@/lib/constants';
import type { Role } from '@/types';
import { NavLinks } from './nav-links';

export function Sidebar({
  org,
  orgs,
  role,
  email,
}: {
  org: { id: string; name: string };
  orgs: { id: string; name: string }[];
  role: Role;
  email: string | undefined;
}) {
  const items = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/assets', label: 'Assets' },
    { href: '/vulnerabilities', label: 'Vulnerabilities' },
    { href: '/incidents', label: 'Incidents' },
    { href: '/team', label: 'Team' },
    ...(role === 'admin' ? [{ href: '/audit', label: 'Audit log' }] : []),
  ];

  return (
    <aside className="flex shrink-0 flex-col gap-4 bg-ink px-4 py-4 text-white lg:min-h-screen lg:w-60 lg:py-6">
      <div>
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          SecureOps Desk
        </Link>
        <p className="mt-1 truncate text-sm text-slate-300">{org.name}</p>
        <p className="text-xs text-slate-400">Your role: {label(role)}</p>
      </div>

      {orgs.length > 1 && (
        <form action={switchOrganization} className="flex gap-2">
          <label htmlFor="org-switch" className="sr-only">
            Switch organization
          </label>
          <select
            id="org-switch"
            name="id"
            defaultValue={org.id}
            className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id} className="text-ink">
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-white/20 px-2 text-sm hover:bg-white/10"
          >
            Switch
          </button>
        </form>
      )}

      <NavLinks items={items} />

      <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-sm">
        <p className="truncate text-slate-300">{email}</p>
        <div className="flex items-center gap-4">
          <Link href="/onboarding" className="text-slate-300 underline hover:text-white">
            New organization
          </Link>
          <form action={logout}>
            <button type="submit" className="text-slate-300 underline hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
