import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EmptyState, PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { getMembers, isAdmin, memberName, requireOrg } from '@/lib/auth';
import { label } from '@/lib/constants';
import { PAGE_SIZE, formatDateTime, parsePage } from '@/lib/utils';
import type { AuditLog } from '@/types';

export const metadata: Metadata = { title: 'Audit log' };

const ENTITY: Record<string, string> = {
  assets: 'asset',
  vulnerabilities: 'vulnerability',
  incidents: 'incident',
  memberships: 'membership',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, org, role } = await requireOrg();
  if (!isAdmin(role)) redirect('/dashboard');
  const page = parsePage(sp.page);

  const [{ data, count }, members] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    getMembers(supabase, org.id),
  ]);
  const logs = (data ?? []) as AuditLog[];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Changes to assets, vulnerabilities, incidents and team membership, recorded by the database."
      />
      <div className="panel overflow-x-auto">
        {logs.length === 0 ? (
          <EmptyState title="Nothing recorded yet" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Change</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                  <td>{memberName(members, l.actor_id) ?? 'System'}</td>
                  <td>
                    {label(l.action)} {ENTITY[l.entity_type] ?? l.entity_type}
                  </td>
                  <td className="text-ink-soft">
                    {[l.details.title, l.details.role, l.details.severity, l.details.status]
                      .filter(Boolean)
                      .join(' · ') || '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          basePath="/audit"
          page={page}
          total={count ?? 0}
          pageSize={PAGE_SIZE}
          params={{}}
        />
      </div>
    </>
  );
}
