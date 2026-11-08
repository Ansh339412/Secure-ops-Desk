import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-ink-soft">
        It may not exist, or it belongs to an organization you are not a member of.
      </p>
      <Link href="/dashboard" className="btn btn-primary mt-5">
        Go to dashboard
      </Link>
    </main>
  );
}
