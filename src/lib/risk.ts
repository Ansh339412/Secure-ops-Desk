import { ACTIVE_INCIDENT_STATUSES, ACTIVE_VULN_STATUSES } from '@/lib/constants';
import { todayUtc } from '@/lib/utils';
import type { Severity } from '@/types';

/**
 * Security Posture Score: a documented, rule-based internal prioritisation metric
 * (0-100, higher = riskier). It is NOT a certified security rating and does not predict breaches.
 */
export interface RiskConfig {
  vulnPoints: Record<Severity, number>;
  overduePoints: number;
  incidentPoints: Record<Severity, number>;
  criticalAssetMultiplier: number;
  levels: { medium: number; high: number; critical: number };
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  vulnPoints: { critical: 40, high: 20, medium: 8, low: 2 },
  overduePoints: 10,
  incidentPoints: { critical: 20, high: 15, medium: 10, low: 5 },
  criticalAssetMultiplier: 1.25,
  levels: { medium: 25, high: 50, critical: 75 },
};

export interface RiskInput {
  isCritical: boolean;
  vulnerabilities: { severity: Severity; status: string; due_date: string | null }[];
  incidents: { severity: Severity; status: string }[];
  today?: string;
}

export interface RiskFactor {
  label: string;
  points: number;
}

export interface RiskResult {
  score: number;
  level: Severity;
  factors: RiskFactor[];
}

const ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export function computeRisk(
  input: RiskInput,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): RiskResult {
  const today = input.today ?? todayUtc();
  const factors: RiskFactor[] = [];

  const activeVulns = input.vulnerabilities.filter((v) => ACTIVE_VULN_STATUSES.includes(v.status));
  for (const severity of ORDER) {
    const count = activeVulns.filter((v) => v.severity === severity).length;
    if (count > 0) {
      factors.push({
        label: `${count} open ${severity} ${count === 1 ? 'vulnerability' : 'vulnerabilities'}`,
        points: count * config.vulnPoints[severity],
      });
    }
  }

  const overdue = activeVulns.filter((v) => v.due_date !== null && v.due_date < today).length;
  if (overdue > 0) {
    factors.push({
      label: `${overdue} overdue remediation ${overdue === 1 ? 'deadline' : 'deadlines'}`,
      points: overdue * config.overduePoints,
    });
  }

  const activeIncidents = input.incidents.filter((i) =>
    ACTIVE_INCIDENT_STATUSES.includes(i.status),
  );
  for (const severity of ORDER) {
    const count = activeIncidents.filter((i) => i.severity === severity).length;
    if (count > 0) {
      factors.push({
        label: `${count} unresolved ${severity} ${count === 1 ? 'incident' : 'incidents'}`,
        points: count * config.incidentPoints[severity],
      });
    }
  }

  const base = factors.reduce((sum, f) => sum + f.points, 0);
  if (input.isCritical && base > 0) {
    factors.push({
      label: `Marked as a critical asset (x${config.criticalAssetMultiplier})`,
      points: Math.round(base * config.criticalAssetMultiplier) - base,
    });
  }

  const score = Math.min(
    100,
    factors.reduce((sum, f) => sum + f.points, 0),
  );
  const level: Severity =
    score >= config.levels.critical
      ? 'critical'
      : score >= config.levels.high
        ? 'high'
        : score >= config.levels.medium
          ? 'medium'
          : 'low';

  return { score, level, factors };
}
