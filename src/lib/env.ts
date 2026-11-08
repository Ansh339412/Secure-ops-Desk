import { z } from 'zod';

const schema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(20),
});

/** Validated lazily so `next build` works without secrets; throws a clear error at request time. */
export function getEnv() {
  const parsed = schema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      'Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
    );
  }
  return parsed.data;
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
