import type { Metadata } from 'next';
import Link from 'next/link';
import { SeverityChart } from '@/components/dashboard/severity-chart';
import { SEVERITY_RAIL, SeverityBadge, StatusBadge } from '@/components/ui/badge';
import { EmptyState, PageHeader } from '@/components/ui/page-header';
import { requireOrg } from '@/lib/auth';
import { ACTIVE_INCIDENT_STATUSES, ACTIVE_VULN_STATUSES, SEVERITIES, label } from '@/lib/constants';
import { computeRisk } from '@/lib/risk';
import { cn, formatDate, todayUtc } from '@/lib/utils';
import type { Asset, Incident, Severity, Vulnerability } from '@/types';

export const metadata: Metadata = { title: 'Dashboard' };

// Dashboard aggregates read up to this many rows per table (documented limit).
const LIMIT = 2000;

export default async function DashboardPage() {
  const { supabase, org } = await requireOrg();

  const [assetsRes, vulnsRes, incidentsRes] = await Promise.all([
    supabase
      .from('assets')
      .select('id, name, is_critical, status')
      .eq('organization_id', org.id)
      .limit(LIMIT),
    supabase
      .from('vulnerabilities')
      .select('id, asset_id, severity, status, due_date')
      .eq('organization_id', org.id)
      .limit(LIMIT),
    supabase
      .from('incidents')
      .select('id, title, asset_id, severity, status, created_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(LIMIT),
  ]);

  const assets = (assetsRes.data ?? []) as Pick<Asset, 'id' | 'name' | 'is_critical' | 'status'>[];
  const vulns = (vulnsRes.data ?? []) as Pick<
    Vulnerability,
    'id' | 'asset_id' | 'severity' | 'status' | 'due_date'
  >[];
  const incidents = (incidentsRes.data ?? []) as Pick<
    Incident,
    'id' | 'title' | 'asset_id' | 'severity' | 'status' | 'created_at'
  >[];

  const today = todayUtc();
  const activeVulns = vulns.filter((v) => ACTIVE_VULN_STATUSES.includes(v.status));
  const openIncidents = incidents.filter((i) => ACTIVE_INCIDENT_STATUSES.includes(i.status));
  const criticalOpen = activeVulns.filter((v) => v.severity === 'critical').length;
  const overdue = activeVulns.filter((v) => v.due_date && v.due_date < today).length;
  const resolved = vulns.filter((v) => v.status === 'resolved').length;
  const progress = vulns.length ? Math.round((resolved / vulns.length) * 100) : null;

  const chartData = [...SEVERITIES].reverse().map((s: Severity) => ({
    name: label(s),
    count: activeVulns.filter((v) => v.severity === s).length,
  }));

  const ranked = assets
    .filter((a) => a.status !== 'retired')
    .map((a) => ({
      asset: a,
      risk: computeRisk({
        isCritical: a.is_critical,
        vulnerabilities: vulns.filter((v) => v.asset_id === a.id),
        incidents: incidents.filter((i) => i.asset_id === a.id),
        today,
      }),
    }))
    .filter((r) => r.risk.score > 0)
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 5);

  const stats = [
    { name: 'Assets', value: assets.length, href: '/assets' },
    { name: 'Open incidents', value: openIncidents.length, href: '/incidents?status=open' },
    {
      name: 'Open critical vulnerabilities',
      value: criticalOpen,
      href: '/vulnerabilities?severity=critical',
    },
    {
      name: 'Remediation progress',
      value: progress === null ? '–' : `${progress}%`,
      href: '/vulnerabilities',
    },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Security overview for ${org.name}.`} />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.name}
            href={s.href}
            className="panel block p-4 transition-colors hover:border-harbor"
          >
            <dt className="text-sm text-ink-soft">{s.name}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</dd>
          </Link>
        ))}
      </dl>
      {overdue > 0 && (
        <p className="mt-4 text-sm text-sev-critical">
          {overdue} remediation {overdue === 1 ? 'deadline is' : 'deadlines are'} overdue.{' '}
          <Link href="/vulnerabilities" className="underline">
            Review vulnerabilities
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-semibold">Open vulnerabilities by severity</h2>
          {activeVulns.length === 0 ? (
            <EmptyState title="No open vulnerabilities">
              Record one from an asset or the vulnerabilities page.
            </EmptyState>
          ) : (
            <SeverityChart data={chartData} />
          )}
        </section>

        <section className="panel">
          <h2 className="px-5 pt-5 font-semibold">Assets to look at first</h2>
          <p className="px-5 text-xs text-ink-soft">
            Ranked by security posture score (internal metric).
          </p>
          {ranked.length === 0 ? (
            <EmptyState title="Nothing is flagged">
              Scores appear once an asset has open vulnerabilities or unresolved incidents.
            </EmptyState>
          ) : (
            <table className="data-table mt-3">
              <thead className="sr-only">
                <tr>
                  <th>Asset</th>
                  <th>Level</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ asset, risk }) => (
                  <tr key={asset.id}>
                    <td className={cn(SEVERITY_RAIL[risk.level])}>
                      <Link
                        href={`/assets/${asset.id}`}
                        className="font-medium text-harbor hover:underline"
                      >
                        {asset.name}
                      </Link>
                    </td>
                    <td>
                      <SeverityBadge severity={risk.level} />
                    </td>
                    <td className="text-right tabular-nums">{risk.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="panel mt-6">
        <h2 className="px-5 pt-5 font-semibold">Recent incidents</h2>
        {incidents.length === 0 ? (
          <EmptyState title="No incidents reported">
            Report suspicious activity from the{' '}
            <Link href="/incidents/new" className="underline">
              incidents page
            </Link>
            .
          </EmptyState>
        ) : (
          <table className="data-table mt-3">
            <tbody>
              {incidents.slice(0, 5).map((i) => (
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
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="text-right text-ink-soft">{formatDate(i.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
