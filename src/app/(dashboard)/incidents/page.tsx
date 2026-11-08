import type { Metadata } from 'next';
import Link from 'next/link';
import { SEVERITY_RAIL, SeverityBadge, StatusBadge } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, PageHeader } from '@/components/ui/page-header';
import { getMembers, memberName, requireOrg } from '@/lib/auth';
import { INCIDENT_STATUSES, SEVERITIES } from '@/lib/constants';
import { PAGE_SIZE, escapeLike, formatDate, oneOf, parsePage } from '@/lib/utils';
import type { Incident } from '@/types';

export const metadata: Metadata = { title: 'Incidents' };

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, org } = await requireOrg();
  const page = parsePage(sp.page);
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const status = oneOf(sp.status, INCIDENT_STATUSES);
  const severity = oneOf(sp.severity, SEVERITIES);

  let query = supabase
    .from('incidents')
    .select('*', { count: 'exact' })
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike('title', `%${escapeLike(q)}%`);
  if (status) query = query.eq('status', status);
  if (severity) query = query.eq('severity', severity);

  const [{ data, count }, members] = await Promise.all([query, getMembers(supabase, org.id)]);
  const incidents = (data ?? []) as Incident[];

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Suspicious activity and security events, who is handling them, and how they ended."
        action={
          <Link href="/incidents/new" className="btn btn-primary">
            Report incident
          </Link>
        }
      />
      <FilterBar
        basePath="/incidents"
        fields={[
          { name: 'q', label: 'Title', value: q },
          { name: 'severity', label: 'Severity', options: SEVERITIES, value: severity },
          { name: 'status', label: 'Status', options: INCIDENT_STATUSES, value: status },
        ]}
      />
      <div className="panel overflow-x-auto">
        {incidents.length === 0 ? (
          <EmptyState title="No incidents found">
            {q || status || severity
              ? 'Try clearing the filters.'
              : 'Nothing has been reported yet.'}
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Assigned to</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  <td className={SEVERITY_RAIL[i.severity]}>
                    <Link
                      href={`/incidents/${i.id}`}
                      className="font-medium text-harbor hover:underline"
                    >
                      {i.title}
                    </Link>
                  </td>
                  <td>
                    <SeverityBadge severity={i.severity} />
                  </td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                  <td>{memberName(members, i.assigned_to) ?? 'Unassigned'}</td>
                  <td>{formatDate(i.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          basePath="/incidents"
          page={page}
          total={count ?? 0}
          pageSize={PAGE_SIZE}
          params={{ q, status, severity }}
        />
      </div>
    </>
  );
}
