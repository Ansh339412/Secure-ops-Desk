import type { Metadata } from 'next';
import Link from 'next/link';
import { login } from '@/actions/auth';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
      <p className="mb-5 text-sm text-ink-soft">Use the email you registered with.</p>
      {error === 'auth' && (
        <p role="alert" className="alert-error">
          That confirmation link is invalid or has expired. Sign in, or register again.
        </p>
      )}
      <ActionForm action={login} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ''} />
        <Field name="email" label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field name="password" label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton>Sign in</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-sm text-ink-soft">
        New here?{' '}
        <Link href="/register" className="text-harbor underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
