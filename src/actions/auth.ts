'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema } from '@/lib/validation/schemas';
import { siteUrl } from '@/lib/env';
import { safeRedirectPath } from '@/lib/utils';
import type { FormState } from '@/types';
import { parseForm } from './helpers';

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return { error: 'Enter a valid email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // One generic message: do not reveal whether the email exists.
  if (error) return { error: 'Invalid email or password.' };

  redirect(safeRedirectPath(formData.get('next')?.toString()));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(registerSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    if (error.code === 'weak_password') return { error: error.message };
    console.error('[action] register failed', error);
    return { error: 'Could not create the account. Check your details and try again.' };
  }
  if (!data.session) {
    return { ok: 'Check your email to confirm your account, then sign in.' };
  }
  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
