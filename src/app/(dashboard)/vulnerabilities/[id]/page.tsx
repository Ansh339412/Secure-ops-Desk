import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deleteVulnerability } from '@/actions/vulnerabilities';
import { VulnerabilityForm } from '@/components/vulnerabilities/vulnerability-form';
import { DeleteForm } from '@/components/ui/delete-form';
import { PageHeader } from '@/components/ui/page-header';
import { canWrite, getAssetOptions, isAdmin, requireOrg } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { idSchema } from '@/lib/validation/schemas';
import type { Vulnerability } from '@/types';

export const metadata: Metadata = { title: 'Vulnerability' };

export default async function VulnerabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = idSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const { supabase, org, role } = await requireOrg();

  const { data } = await supabase
    .from('vulnerabilities')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('organization_id', org.id)
    .maybeSingle();
  if (!data) notFound();
  const vuln = data as Vulnerability;
  const assets = await getAssetOptions(supabase, org.id);

  return (
    <>
      <PageHeader
        title={vuln.title}
        description={
          vuln.resolved_at
            ? `Resolved ${formatDate(vuln.resolved_at)}`
            : `Recorded ${formatDate(vuln.created_at)}`
        }
        action={
          isAdmin(role) ? (
            <DeleteForm
              action={deleteVulnerability}
              id={vuln.id}
              confirm="Delete this vulnerability?"
            >
              Delete vulnerability
            </DeleteForm>
          ) : undefined
        }
      />
      <div className="panel max-w-2xl p-5">
        <VulnerabilityForm vulnerability={vuln} assets={assets} readOnly={!canWrite(role)} />
      </div>
    </>
  );
}
