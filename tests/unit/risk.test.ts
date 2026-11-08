import { computeRisk, DEFAULT_RISK_CONFIG } from '@/lib/risk';

const today = '2026-06-15';
const base = { isCritical: false, vulnerabilities: [], incidents: [], today };

describe('computeRisk', () => {
  it('scores an asset with nothing linked as 0 / low', () => {
    expect(computeRisk(base)).toEqual({ score: 0, level: 'low', factors: [] });
  });

  it('weights open vulnerabilities by severity', () => {
    const r = computeRisk({
      ...base,
      vulnerabilities: [
        { severity: 'critical', status: 'open', due_date: null },
        { severity: 'low', status: 'in_progress', due_date: null },
      ],
    });
    expect(r.score).toBe(42);
    expect(r.level).toBe('medium');
    expect(r.factors.map((f) => f.label)).toEqual([
      '1 open critical vulnerability',
      '1 open low vulnerability',
    ]);
  });

  it('ignores resolved and accepted vulnerabilities', () => {
    const r = computeRisk({
      ...base,
      vulnerabilities: [
        { severity: 'critical', status: 'resolved', due_date: '2020-01-01' },
        { severity: 'critical', status: 'accepted', due_date: '2020-01-01' },
      ],
    });
    expect(r.score).toBe(0);
  });

  it('adds points for overdue deadlines but not for future or missing ones', () => {
    const r = computeRisk({
      ...base,
      vulnerabilities: [
        { severity: 'low', status: 'open', due_date: '2026-06-14' },
        { severity: 'low', status: 'open', due_date: '2026-06-15' },
        { severity: 'low', status: 'open', due_date: null },
      ],
    });
    // 3 x low (2) + 1 overdue (10)
    expect(r.score).toBe(16);
    expect(r.factors.some((f) => f.label === '1 overdue remediation deadline')).toBe(true);
  });

  it('counts only unresolved incidents', () => {
    const r = computeRisk({
      ...base,
      incidents: [
        { severity: 'high', status: 'investigating' },
        { severity: 'high', status: 'closed' },
      ],
    });
    expect(r.score).toBe(15);
  });

  it('applies the critical-asset multiplier only when there is something to multiply', () => {
    const vulnerabilities = [{ severity: 'high' as const, status: 'open', due_date: null }];
    expect(computeRisk({ ...base, isCritical: true, vulnerabilities }).score).toBe(25);
    expect(computeRisk({ ...base, isCritical: true }).score).toBe(0);
  });

  it('caps the score at 100 and reports the critical level', () => {
    const r = computeRisk({
      ...base,
      isCritical: true,
      vulnerabilities: [
        { severity: 'critical', status: 'open', due_date: null },
        { severity: 'critical', status: 'open', due_date: null },
        { severity: 'critical', status: 'open', due_date: null },
      ],
    });
    expect(r.score).toBe(100);
    expect(r.level).toBe('critical');
  });

  it('respects a custom configuration', () => {
    const r = computeRisk(
      { ...base, vulnerabilities: [{ severity: 'low', status: 'open', due_date: null }] },
      { ...DEFAULT_RISK_CONFIG, vulnPoints: { ...DEFAULT_RISK_CONFIG.vulnPoints, low: 30 } },
    );
    expect(r.score).toBe(30);
    expect(r.level).toBe('medium');
  });

  it('explains every point: factors add up to the score (below the cap)', () => {
    const r = computeRisk({
      ...base,
      isCritical: true,
      vulnerabilities: [{ severity: 'medium', status: 'open', due_date: '2026-01-01' }],
      incidents: [{ severity: 'low', status: 'open' }],
    });
    expect(r.factors.reduce((s, f) => s + f.points, 0)).toBe(r.score);
  });
});
