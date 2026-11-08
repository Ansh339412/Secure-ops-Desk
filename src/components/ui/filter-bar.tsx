import Link from 'next/link';
import { label } from '@/lib/constants';

export interface FilterField {
  name: string;
  label: string;
  options?: readonly string[];
  value?: string;
}

/** A plain GET form: filters live in the URL, so they work without JavaScript and can be shared. */
export function FilterBar({ basePath, fields }: { basePath: string; fields: FilterField[] }) {
  return (
    <form method="get" action={basePath} className="mb-4 flex flex-wrap items-end gap-3">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1">
          <label htmlFor={`f-${f.name}`} className="text-xs font-medium text-ink-soft">
            {f.label}
          </label>
          {f.options ? (
            <select
              id={`f-${f.name}`}
              name={f.name}
              defaultValue={f.value ?? ''}
              className="input w-40"
            >
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {label(o)}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`f-${f.name}`}
              name={f.name}
              defaultValue={f.value ?? ''}
              maxLength={100}
              placeholder="Search…"
              className="input w-56"
            />
          )}
        </div>
      ))}
      <button type="submit" className="btn btn-secondary">
        Apply filters
      </button>
      <Link href={basePath} className="py-2 text-sm text-ink-soft underline">
        Clear
      </Link>
    </form>
  );
}
