import { Sidebar } from '@/components/layout/sidebar';
import { requireOrg } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, orgs, role, user } = await requireOrg();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar org={org} orgs={orgs} role={role} email={user.email} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
