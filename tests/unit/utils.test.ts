import { escapeLike, formatDate, nullify, oneOf, parsePage, safeRedirectPath } from '@/lib/utils';

describe('safeRedirectPath', () => {
  it('allows same-site relative paths', () => {
    expect(safeRedirectPath('/assets?page=2')).toBe('/assets?page=2');
  });

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '', null, undefined])(
    'falls back for %s',
    (value) => {
      expect(safeRedirectPath(value as string | null | undefined)).toBe('/dashboard');
    },
  );
});

describe('escapeLike', () => {
  it('escapes wildcard characters so search input matches literally', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});

describe('parsePage', () => {
  it('defaults and clamps bad input', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('-4')).toBe(1);
    expect(parsePage('3')).toBe(3);
    expect(parsePage('99999999')).toBe(10_000);
  });
});

describe('oneOf', () => {
  it('only returns values from the allowed list', () => {
    expect(oneOf('open', ['open', 'closed'] as const)).toBe('open');
    expect(oneOf('x', ['open', 'closed'] as const)).toBeUndefined();
    expect(oneOf(undefined, ['open'] as const)).toBeUndefined();
  });
});

describe('nullify', () => {
  it('sets undefined optional fields to null so they are cleared in the database', () => {
    expect(nullify({ a: 'x', b: undefined } as { a: string; b?: string }, ['b'])).toEqual({
      a: 'x',
      b: null,
    });
  });
});

describe('formatDate', () => {
  it('formats date-only values without timezone drift and handles empty input', () => {
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026');
    expect(formatDate(null)).toBe('–');
    expect(formatDate('garbage')).toBe('–');
  });
});
