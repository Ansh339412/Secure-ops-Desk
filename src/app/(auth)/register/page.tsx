import type { Metadata } from 'next';
import Link from 'next/link';
import { register } from '@/actions/auth';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
      <p className="mb-5 text-sm text-ink-soft">
        After signing in you can create an organization or be added to an existing one.
      </p>
      <ActionForm action={register} className="space-y-4">
        <Field name="full_name" label="Full name">
          <Input name="full_name" autoComplete="name" required minLength={2} maxLength={80} />
        </Field>
        <Field name="email" label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field name="password" label="Password" hint="At least 8 characters.">
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        <SubmitButton>Create account</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-sm text-ink-soft">
        Already registered?{' '}
        <Link href="/login" className="text-harbor underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
