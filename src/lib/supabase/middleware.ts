import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getEnv } from '@/lib/env';

const PUBLIC_PREFIXES = ['/login', '/register', '/auth'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getEnv();

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the JWT with Supabase Auth (getSession() would only read the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublic = pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && !isPublic) return redirectTo('/login', { next: pathname + search });
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return redirectTo('/dashboard');
  }
  return response;
}
