import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        SecureOps Desk
      </Link>
      <div className="panel p-6">{children}</div>
    </main>
  );
}
