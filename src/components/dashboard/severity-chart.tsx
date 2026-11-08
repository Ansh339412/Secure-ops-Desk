'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS: Record<string, string> = {
  Critical: '#b42318',
  High: '#c2570c',
  Medium: '#a16207',
  Low: '#3b6a8a',
};

export function SeverityChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div
      className="h-48 w-full"
      role="img"
      aria-label={`Open vulnerabilities by severity: ${data.map((d) => `${d.name} ${d.count}`).join(', ')}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip cursor={{ fill: '#eef2f5' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.name]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
