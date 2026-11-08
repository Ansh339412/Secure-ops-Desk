import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteAsset } from '@/actions/assets';
import { AssetForm } from '@/components/assets/asset-form';
import { RiskCard } from '@/components/assets/risk-card';
import { SeverityBadge, StatusBadge } from '@/components/ui/badge';
import { DeleteForm } from '@/components/ui/delete-form';
import { EmptyState, PageHeader } from '@/components/ui/page-header';
import { canWrite, isAdmin, requireOrg } from '@/lib/auth';
import { computeRisk } from '@/lib/risk';
import { formatDate } from '@/lib/utils';
import { idSchema } from '@/lib/validation/schemas';
import type { Asset, Incident, Vulnerability } from '@/types';

export const metadata: Metadata = { title: 'Asset' };

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = idSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const { supabase, org, role } = await requireOrg();

  const { data } = await supabase
    .from('assets')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('organization_id', org.id)
    .maybeSingle();
  if (!data) notFound();
  const asset = data as Asset;

  const [vulnRes, incRes] = await Promise.all([
    supabase
      .from('vulnerabilities')
      .select('*')
      .eq('asset_id', asset.id)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('incidents')
      .select('*')
      .eq('asset_id', asset.id)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false }),
  ]);
  const vulns = (vulnRes.data ?? []) as Vulnerability[];
  const incidents = (incRes.data ?? []) as Incident[];
  const risk = computeRisk({ isCritical: asset.is_critical, vulnerabilities: vulns, incidents });

  return (
    <>
      <PageHeader
        title={asset.name}
        description={`Added ${formatDate(asset.created_at)}`}
        action={
          isAdmin(role) ? (
            <DeleteForm
              action={deleteAsset}
              id={asset.id}
              confirm="Delete this asset and all of its vulnerabilities?"
            >
              Delete asset
            </DeleteForm>
          ) : undefined
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="panel p-5">
            <AssetForm asset={asset} readOnly={!canWrite(role)} />
          </div>

          <section className="panel">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-semibold">Vulnerabilities</h2>
              {canWrite(role) && (
                <Link
                  href={`/vulnerabilities/new?asset=${asset.id}`}
                  className="text-sm text-harbor underline"
                >
                  Record vulnerability
                </Link>
              )}
            </div>
            {vulns.length === 0 ? (
              <EmptyState title="No vulnerabilities recorded" />
            ) : (
              <table className="data-table mt-3">
                <tbody>
                  {vulns.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link
                          href={`/vulnerabilities/${v.id}`}
                          className="font-medium text-harbor hover:underline"
                        >
                          {v.title}
                        </Link>
                      </td>
                      <td>
                        <SeverityBadge severity={v.severity} />
                      </td>
                      <td>
                        <StatusBadge status={v.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel">
            <h2 className="px-5 pt-5 font-semibold">Incidents</h2>
            {incidents.length === 0 ? (
              <EmptyState title="No incidents linked to this asset" />
            ) : (
              <table className="data-table mt-3">
                <tbody>
                  {incidents.map((i) => (
                    <tr key={i.id}>
                      <td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
        <RiskCard risk={risk} />
      </div>
    </>
  );
}
