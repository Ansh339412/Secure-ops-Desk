import type { Metadata } from 'next';
import Link from 'next/link';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState, PageHeader } from '@/components/ui/page-header';
import { canWrite, requireOrg } from '@/lib/auth';
import { ASSET_STATUSES, ASSET_TYPES, label } from '@/lib/constants';
import { PAGE_SIZE, escapeLike, oneOf, parsePage } from '@/lib/utils';
import type { Asset } from '@/types';

export const metadata: Metadata = { title: 'Assets' };

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, org, role } = await requireOrg();
  const page = parsePage(sp.page);
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const status = oneOf(sp.status, ASSET_STATUSES);
  const type = oneOf(sp.type, ASSET_TYPES);

  let query = supabase
    .from('assets')
    .select('*', { count: 'exact' })
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike('name', `%${escapeLike(q)}%`);
  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, count } = await query;
  const assets = (data ?? []) as Asset[];

  return (
    <>
      <PageHeader
        title="Assets"
        description="Everything your organization owns that needs to be kept secure."
        action={
          canWrite(role) ? (
            <Link href="/assets/new" className="btn btn-primary">
              Add asset
            </Link>
          ) : undefined
        }
      />
      <FilterBar
        basePath="/assets"
        fields={[
          { name: 'q', label: 'Name', value: q },
          { name: 'type', label: 'Type', options: ASSET_TYPES, value: type },
          { name: 'status', label: 'Status', options: ASSET_STATUSES, value: status },
        ]}
      />
      <div className="panel overflow-x-auto">
        {assets.length === 0 ? (
          <EmptyState title="No assets found">
            {q || status || type
              ? 'Try clearing the filters.'
              : 'Add your first asset to start tracking its security.'}
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Operating system</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link
                      href={`/assets/${a.id}`}
                      className="font-medium text-harbor hover:underline"
                    >
                      {a.name}
                    </Link>
                    {a.is_critical && (
                      <span className="ml-2 text-xs text-sev-critical">Critical</span>
                    )}
                  </td>
                  <td>{label(a.type)}</td>
                  <td>{a.operating_system ?? '–'}</td>
                  <td>{a.owner_name ?? '–'}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          basePath="/assets"
          page={page}
          total={count ?? 0}
          pageSize={PAGE_SIZE}
          params={{ q, status, type }}
        />
      </div>
    </>
  );
}
