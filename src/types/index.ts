import type {
  ASSET_STATUSES,
  ASSET_TYPES,
  INCIDENT_STATUSES,
  ROLES,
  SEVERITIES,
  VULN_STATUSES,
} from '@/lib/constants';

export type Role = (typeof ROLES)[number];
export type Severity = (typeof SEVERITIES)[number];

export interface Asset {
  id: string;
  organization_id: string;
  name: string;
  type: (typeof ASSET_TYPES)[number];
  operating_system: string | null;
  owner_name: string | null;
  status: (typeof ASSET_STATUSES)[number];
  is_critical: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vulnerability {
  id: string;
  organization_id: string;
  asset_id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: (typeof VULN_STATUSES)[number];
  cve_id: string | null;
  due_date: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Incident {
  id: string;
  organization_id: string;
  asset_id: string | null;
  title: string;
  description: string | null;
  severity: Severity;
  status: (typeof INCIDENT_STATUSES)[number];
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface IncidentComment {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface Member {
  user_id: string;
  role: Role;
  created_at: string;
  full_name: string | null;
  email: string | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, string>;
  created_at: string;
}

export interface FormState {
  error?: string;
  ok?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}
