import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const PAGE_SIZE = 10;

/** Only allow same-site relative redirects (blocks open redirects such as //evil.com). */
export function safeRedirectPath(next: string | null | undefined, fallback = '/dashboard') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  return next;
}

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function parsePage(value: string | undefined) {
  const n = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

/** Returns value only when it is one of the allowed options (for query-string filters). */
export function oneOf<T extends readonly string[]>(
  value: string | undefined,
  options: T,
): T[number] | undefined {
  return value && options.includes(value) ? (value as T[number]) : undefined;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '–';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateTime(value: string) {
  const text = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
  return `${text} UTC`;
}

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** Set undefined optional fields to null so cleared form inputs are actually cleared in the database. */
export function nullify<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]) {
  const copy: Record<string, unknown> = { ...obj };
  for (const key of keys) copy[key as string] ??= null;
  return copy;
}
