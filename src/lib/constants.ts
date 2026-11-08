export const ASSET_TYPES = ['laptop', 'server', 'website', 'network', 'other'] as const;
export const ASSET_STATUSES = ['active', 'maintenance', 'retired'] as const;
export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const VULN_STATUSES = ['open', 'in_progress', 'resolved', 'accepted'] as const;
export const INCIDENT_STATUSES = ['open', 'investigating', 'resolved', 'closed'] as const;
export const ROLES = ['admin', 'analyst', 'viewer'] as const;

export const ACTIVE_VULN_STATUSES: readonly string[] = ['open', 'in_progress'];
export const ACTIVE_INCIDENT_STATUSES: readonly string[] = ['open', 'investigating'];

export const label = (value: string) =>
  value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
