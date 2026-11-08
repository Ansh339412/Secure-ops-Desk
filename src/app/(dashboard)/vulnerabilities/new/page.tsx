import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { VulnerabilityForm } from '@/components/vulnerabilities/vulnerability-form';
import { PageHeader } from '@/components/ui/page-header';
import { canWrite, getAssetOptions, requireOrg } from '@/lib/auth';

export const metadata: Metadata = { title: 'Record vulnerability' };

export default async function NewVulnerabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const { asset } = await searchParams;
  const { supabase, org, role } = await requireOrg();
  if (!canWrite(role)) redirect('/vulnerabilities');
  const assets = await getAssetOptions(supabase, org.id);

  return (
    <>
      <PageHeader title="Record vulnerability" />
      <div className="panel max-w-2xl p-5">
        {assets.length === 0 ? (
          <p className="text-sm">
            A vulnerability belongs to an asset.{' '}
            <Link href="/assets/new" className="text-harbor underline">
              Add an asset first
            </Link>
            .
          </p>
        ) : (
          <VulnerabilityForm
            assets={assets}
            defaultAssetId={assets.some((a) => a.id === asset) ? asset : undefined}
          />
        )}
      </div>
    </>
  );
}
