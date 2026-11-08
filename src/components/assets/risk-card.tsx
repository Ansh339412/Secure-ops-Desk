import { SeverityBadge } from '@/components/ui/badge';
import type { RiskResult } from '@/lib/risk';

export function RiskCard({ risk }: { risk: RiskResult }) {
  return (
    <section className="panel p-5" aria-labelledby="risk-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="risk-heading" className="font-semibold">
            Security posture score
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Internal prioritisation metric from documented rules, not a certified security rating.
          </p>
        </div>
        <SeverityBadge severity={risk.level} />
      </div>
      <p className="mt-4 text-4xl font-semibold tabular-nums">
        {risk.score}
        <span className="ml-1 text-base font-normal text-ink-soft">/ 100</span>
      </p>
      {risk.factors.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          No open vulnerabilities or unresolved incidents are linked to this asset.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-rule text-sm">
          {risk.factors.map((f) => (
            <li key={f.label} className="flex justify-between gap-4 py-1.5">
              <span>{f.label}</span>
              <span className="tabular-nums text-ink-soft">+{f.points}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
