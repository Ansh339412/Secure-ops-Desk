import Link from 'next/link';

export function Pagination({
  basePath,
  page,
  total,
  pageSize,
  params,
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && k !== 'page' && qs.set(k, v));
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between px-4 py-3 text-sm">
      <p className="text-ink-soft">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn btn-secondary">
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="btn btn-secondary">
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
