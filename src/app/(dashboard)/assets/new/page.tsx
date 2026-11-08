import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AssetForm } from '@/components/assets/asset-form';
import { PageHeader } from '@/components/ui/page-header';
import { canWrite, requireOrg } from '@/lib/auth';

export const metadata: Metadata = { title: 'Add asset' };

export default async function NewAssetPage() {
  const { role } = await requireOrg();
  if (!canWrite(role)) redirect('/assets');
  return (
    <>
      <PageHeader title="Add asset" />
      <div className="panel max-w-2xl p-5">
        <AssetForm />
      </div>
    </>
  );
}
