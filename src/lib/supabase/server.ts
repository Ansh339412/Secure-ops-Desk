import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEnv } from '@/lib/env';

/**
 * Server-side Supabase client bound to the signed-in user's session (anon key + user JWT).
 * Because it never uses the service-role key, every query is subject to Row Level Security.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getEnv();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
}
