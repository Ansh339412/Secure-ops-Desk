import type { Metadata } from 'next';
import Link from 'next/link';
import { SEVERITY_RAIL, SeverityBadge, StatusBadge } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, PageHeader } from '@/components/ui/page-header';
import { canWrite, getAssetOptions, requireOrg } from '@/lib/auth';
import { ACTIVE_VULN_STATUSES, SEVERITIES, VULN_STATUSES } from '@/lib/constants';
import { PAGE_SIZE, cn, escapeLike, formatDate, oneOf, parsePage, todayUtc } from '@/lib/utils';
import type { Vulnerability } from '@/types';

export const metadata: Metadata = { title: 'Vulnerabilities' };

export default async function VulnerabilitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, org, role } = await requireOrg();
  const page = parsePage(sp.page);
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const status = oneOf(sp.status, VULN_STATUSES);
  const severity = oneOf(sp.severity, SEVERITIES);

  let query = supabase
    .from('vulnerabilities')
    .select('*', { count: 'exact' })
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike('title', `%${escapeLike(q)}%`);
  if (status) query = query.eq('status', status);
  if (severity) query = query.eq('severity', severity);

  const [{ data, count }, assets] = await Promise.all([query, getAssetOptions(supabase, org.id)]);
  const vulns = (data ?? []) as Vulnerability[];
  const assetName = new Map(assets.map((a) => [a.id, a.name]));
  const today = todayUtc();

  return (
    <>
      <PageHeader
        title="Vulnerabilities"
        description="Known weaknesses, how severe they are, and when they must be fixed."
        action={
          canWrite(role) ? (
            <Link href="/vulnerabilities/new" className="btn btn-primary">
              Record vulnerability
            </Link>
          ) : undefined
        }
      />
      <FilterBar
        basePath="/vulnerabilities"
        fields={[
          { name: 'q', label: 'Title', value: q },
          { name: 'severity', label: 'Severity', options: SEVERITIES, value: severity },
          { name: 'status', label: 'Status', options: VULN_STATUSES, value: status },
        ]}
      />
      <div className="panel overflow-x-auto">
        {vulns.length === 0 ? (
          <EmptyState title="No vulnerabilities found">
            {q || status || severity
              ? 'Try clearing the filters.'
              : 'Nothing has been recorded yet.'}
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vulnerability</th>
                <th>Asset</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Fix by</th>
              </tr>
            </thead>
            <tbody>
              {vulns.map((v) => {
                const overdue =
                  !!v.due_date && v.due_date < today && ACTIVE_VULN_STATUSES.includes(v.status);
                return (
                  <tr key={v.id}>
                    <td className={SEVERITY_RAIL[v.severity]}>
                      <Link
                        href={`/vulnerabilities/${v.id}`}
                        className="font-medium text-harbor hover:underline"
                      >
                        {v.title}
                      </Link>
                      {v.cve_id && <p className="font-mono text-xs text-ink-soft">{v.cve_id}</p>}
                    </td>
                    <td>{assetName.get(v.asset_id) ?? '–'}</td>
                    <td>
                      <SeverityBadge severity={v.severity} />
                    </td>
                    <td>
                      <StatusBadge status={v.status} />
                    </td>
                    <td className={cn(overdue && 'font-medium text-sev-critical')}>
                      {formatDate(v.due_date)}
                      {overdue && <span className="block text-xs">Overdue</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination
          basePath="/vulnerabilities"
          page={page}
          total={count ?? 0}
          pageSize={PAGE_SIZE}
          params={{ q, status, severity }}
        />
      </div>
    </>
  );
}
