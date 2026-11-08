import { z } from 'zod';
import {
  ASSET_STATUSES,
  ASSET_TYPES,
  INCIDENT_STATUSES,
  ROLES,
  SEVERITIES,
  VULN_STATUSES,
} from '@/lib/constants';

// Form inputs arrive as strings; blank optional fields become undefined.
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optText = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const optUuid = z.preprocess(blank, z.string().uuid().optional());
const uuid = z.string().uuid('Invalid identifier');
const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean());
const text = (min: number, max: number, field: string) =>
  z
    .string()
    .trim()
    .min(min, `${field} must be at least ${min} characters`)
    .max(max, `${field} must be at most ${max} characters`);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  full_name: text(2, 80, 'Name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const orgSchema = z.object({ name: text(2, 80, 'Organization name') });

export const assetSchema = z.object({
  id: optUuid,
  name: text(2, 120, 'Name'),
  type: z.enum(ASSET_TYPES),
  operating_system: optText(80),
  owner_name: optText(80),
  status: z.enum(ASSET_STATUSES),
  is_critical: checkbox,
  notes: optText(2000),
});

export const vulnerabilitySchema = z.object({
  id: optUuid,
  asset_id: uuid,
  title: text(3, 160, 'Title'),
  description: optText(4000),
  severity: z.enum(SEVERITIES),
  status: z.enum(VULN_STATUSES),
  cve_id: z.preprocess(
    blank,
    z
      .string()
      .trim()
      .regex(/^CVE-\d{4}-\d{4,}$/i, 'Use the format CVE-2024-12345')
      .transform((s) => s.toUpperCase())
      .optional(),
  ),
  due_date: z.preprocess(
    blank,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Use a valid date')
      .optional(),
  ),
});

export const incidentSchema = z.object({
  id: optUuid,
  title: text(3, 160, 'Title'),
  description: optText(4000),
  severity: z.enum(SEVERITIES),
  status: z.enum(INCIDENT_STATUSES),
  asset_id: optUuid,
  assigned_to: optUuid,
});

export const commentSchema = z.object({
  incident_id: uuid,
  body: text(1, 2000, 'Comment'),
});

export const memberAddSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(ROLES),
});

export const memberRoleSchema = z.object({ user_id: uuid, role: z.enum(ROLES) });
export const idSchema = z.object({ id: uuid });
export const userIdSchema = z.object({ user_id: uuid });
