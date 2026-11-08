import { label } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Severity } from '@/types';

const base = 'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset';

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-50 text-sev-critical ring-red-200',
  high: 'bg-orange-50 text-sev-high ring-orange-200',
  medium: 'bg-amber-50 text-sev-medium ring-amber-200',
  low: 'bg-sky-50 text-sev-low ring-sky-200',
};

export const SEVERITY_RAIL: Record<Severity, string> = {
  critical: 'border-l-[3px] border-l-sev-critical',
  high: 'border-l-[3px] border-l-sev-high',
  medium: 'border-l-[3px] border-l-sev-medium',
  low: 'border-l-[3px] border-l-sev-low',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-harbor-tint text-harbor-dark ring-sky-200',
  investigating: 'bg-harbor-tint text-harbor-dark ring-sky-200',
  in_progress: 'bg-harbor-tint text-harbor-dark ring-sky-200',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  resolved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-700 ring-slate-200',
  accepted: 'bg-slate-100 text-slate-700 ring-slate-200',
  maintenance: 'bg-amber-50 text-sev-medium ring-amber-200',
  retired: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cn(base, SEVERITY_STYLES[severity])}>{label(severity)}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(base, STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200')}
    >
      {label(status)}
    </span>
  );
}
