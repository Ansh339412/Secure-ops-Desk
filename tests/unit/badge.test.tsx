import { render, screen } from '@testing-library/react';
import { SeverityBadge, StatusBadge } from '@/components/ui/badge';
import { RiskCard } from '@/components/assets/risk-card';

describe('badges', () => {
  it('show severity and status as text, not colour alone', () => {
    render(
      <>
        <SeverityBadge severity="critical" />
        <StatusBadge status="in_progress" />
      </>,
    );
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});

describe('RiskCard', () => {
  it('explains where the score comes from and labels it as an internal metric', () => {
    render(
      <RiskCard
        risk={{
          score: 55,
          level: 'high',
          factors: [{ label: '1 open high vulnerability', points: 20 }],
        }}
      />,
    );
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('1 open high vulnerability')).toBeInTheDocument();
    expect(screen.getByText(/not a certified security rating/i)).toBeInTheDocument();
  });

  it('says so when nothing contributes to the score', () => {
    render(<RiskCard risk={{ score: 0, level: 'low', factors: [] }} />);
    expect(screen.getByText(/no open vulnerabilities/i)).toBeInTheDocument();
  });
});
