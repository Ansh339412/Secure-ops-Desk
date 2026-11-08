import {
  assetSchema,
  incidentSchema,
  registerSchema,
  vulnerabilitySchema,
} from '@/lib/validation/schemas';

const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('assetSchema', () => {
  const valid = { name: 'Web server', type: 'server', status: 'active' };

  it('accepts a minimal asset and turns blank optionals into undefined', () => {
    const r = assetSchema.parse({ ...valid, operating_system: '  ', notes: '', is_critical: 'on' });
    expect(r.operating_system).toBeUndefined();
    expect(r.notes).toBeUndefined();
    expect(r.is_critical).toBe(true);
  });

  it('treats a missing checkbox as false', () => {
    expect(assetSchema.parse(valid).is_critical).toBe(false);
  });

  it('rejects short names, unknown types and oversized notes', () => {
    expect(assetSchema.safeParse({ ...valid, name: 'x' }).success).toBe(false);
    expect(assetSchema.safeParse({ ...valid, type: 'toaster' }).success).toBe(false);
    expect(assetSchema.safeParse({ ...valid, notes: 'a'.repeat(2001) }).success).toBe(false);
  });
});

describe('vulnerabilitySchema', () => {
  const valid = { title: 'Outdated OpenSSL', asset_id: uuid, severity: 'high', status: 'open' };

  it('normalises the CVE id to upper case', () => {
    expect(vulnerabilitySchema.parse({ ...valid, cve_id: 'cve-2024-12345' }).cve_id).toBe(
      'CVE-2024-12345',
    );
  });

  it('rejects malformed CVE ids, dates and asset ids', () => {
    expect(vulnerabilitySchema.safeParse({ ...valid, cve_id: 'CVE-24-1' }).success).toBe(false);
    expect(vulnerabilitySchema.safeParse({ ...valid, due_date: '31/12/2026' }).success).toBe(false);
    expect(vulnerabilitySchema.safeParse({ ...valid, due_date: '2026-13-45' }).success).toBe(false);
    expect(vulnerabilitySchema.safeParse({ ...valid, asset_id: 'not-a-uuid' }).success).toBe(false);
  });

  it('accepts a real date', () => {
    expect(vulnerabilitySchema.parse({ ...valid, due_date: '2026-12-31' }).due_date).toBe(
      '2026-12-31',
    );
  });
});

describe('incidentSchema', () => {
  it('treats empty asset and assignee selections as undefined', () => {
    const r = incidentSchema.parse({
      title: 'Suspicious login',
      severity: 'low',
      status: 'open',
      asset_id: '',
      assigned_to: '',
    });
    expect(r.asset_id).toBeUndefined();
    expect(r.assigned_to).toBeUndefined();
  });

  it('rejects an invalid status', () => {
    expect(
      incidentSchema.safeParse({ title: 'Suspicious login', severity: 'low', status: 'deleted' })
        .success,
    ).toBe(false);
  });
});

describe('registerSchema', () => {
  it('lower-cases the email and enforces an 8 character password', () => {
    expect(
      registerSchema.parse({
        full_name: 'Asha K',
        email: ' ASHA@Example.com ',
        password: 'longenough',
      }).email,
    ).toBe('asha@example.com');
    expect(
      registerSchema.safeParse({
        full_name: 'Asha K',
        email: 'asha@example.com',
        password: 'short',
      }).success,
    ).toBe(false);
  });
});
