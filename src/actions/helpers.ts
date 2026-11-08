import 'server-only';
import type { ZodTypeAny, z } from 'zod';
import type { FormState } from '@/types';

type Parsed<S extends ZodTypeAny> =
  { ok: true; data: z.output<S> } | { ok: false; state: FormState };

/** Validates form data on the server; never trust the browser. */
export function parseForm<S extends ZodTypeAny>(schema: S, formData: FormData): Parsed<S> {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    state: {
      error: 'Please fix the highlighted fields.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    },
  };
}

export const forbidden = (what: string): FormState => ({
  error: `Your role does not allow you to ${what}.`,
});

export const failed = (what: string, error: unknown): FormState => {
  console.error(`[action] ${what} failed`, error);
  return { error: `Could not ${what}. Please try again.` };
};
