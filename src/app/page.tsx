import Link from 'next/link';

const points = [
  ['Assets', 'Register laptops, servers and websites with an owner, operating system and status.'],
  [
    'Vulnerabilities',
    'Record weaknesses with severity and a remediation deadline, and see what is overdue.',
  ],
  [
    'Incidents',
    'Report suspicious activity, assign it, keep investigation notes and close it out.',
  ],
  [
    'Access control',
    'Admins, analysts and viewers share one organization. Other organizations never see your data.',
  ],
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Know which security problem to fix first.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        SecureOps Desk replaces the spreadsheet of laptops, servers and open issues with one place
        to track what you own, what is vulnerable, and who is dealing with it.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register" className="btn btn-primary">
          Create an account
        </Link>
        <Link href="/login" className="btn btn-secondary">
          Sign in
        </Link>
      </div>
      <dl className="mt-14 grid gap-6 sm:grid-cols-2">
        {points.map(([title, text]) => (
          <div key={title} className="border-l-2 border-harbor pl-4">
            <dt className="font-medium">{title}</dt>
            <dd className="mt-1 text-sm text-ink-soft">{text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-14 max-w-xl text-xs text-ink-faint">
        SecureOps Desk is an educational security operations tool for authorized asset and incident
        management. It does not discover vulnerabilities or certify an organization&apos;s security.
      </p>
    </main>
  );
}
