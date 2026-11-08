import type { Metadata } from 'next';
import { createOrganization } from '@/actions/org';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Create organization' };

export default async function OnboardingPage() {
  await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="panel p-6">
        <h1 className="mb-1 text-xl font-semibold">Create an organization</h1>
        <p className="mb-5 text-sm text-ink-soft">
          An organization holds your assets, vulnerabilities and incidents. You become its admin and
          can add teammates later. If you were invited to an existing organization, ask an admin to
          add the email you registered with.
        </p>
        <ActionForm action={createOrganization} className="space-y-4">
          <Field name="name" label="Organization name">
            <Input
              name="name"
              placeholder="Northfield College IT"
              required
              minLength={2}
              maxLength={80}
            />
          </Field>
          <SubmitButton>Create organization</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
