import type { Metadata } from 'next';
import { IncidentForm } from '@/components/incidents/incident-form';
import { PageHeader } from '@/components/ui/page-header';
import { canWrite, getAssetOptions, getMembers, requireOrg } from '@/lib/auth';

export const metadata: Metadata = { title: 'Report incident' };

export default async function NewIncidentPage() {
  const { supabase, org, role } = await requireOrg();
  const [assets, members] = await Promise.all([
    getAssetOptions(supabase, org.id),
    getMembers(supabase, org.id),
  ]);
  return (
    <>
      <PageHeader
        title="Report incident"
        description="Anyone in the organization can report an incident. Analysts and admins triage it."
      />
      <div className="panel max-w-2xl p-5">
        <IncidentForm assets={assets} members={members} canTriage={canWrite(role)} />
      </div>
    </>
  );
}
