'use client';

import { createContext, useActionState, useContext, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { label as toLabel } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { FormState } from '@/types';

const ErrorsContext = createContext<NonNullable<FormState['fieldErrors']>>({});

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} className={className}>
      {state.error && (
        <p role="alert" className="alert-error">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="alert-ok">
          {state.ok}
        </p>
      )}
      <ErrorsContext.Provider value={state.fieldErrors ?? {}}>{children}</ErrorsContext.Provider>
    </form>
  );
}

export function SubmitButton({
  children,
  variant = 'primary',
  confirm,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn('btn', `btn-${variant}`)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

export function Field({
  name,
  label,
  hint,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const error = useContext(ErrorsContext)[name]?.[0];
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p className="text-xs text-sev-critical" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

type Option = string | { value: string; label: string };

export function Select({
  name,
  options,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  options: readonly Option[];
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <select
      id={name}
      name={name}
      defaultValue={defaultValue ?? ''}
      required={required}
      className="input"
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const value = typeof o === 'string' ? o : o.value;
        return (
          <option key={value} value={value}>
            {typeof o === 'string' ? toLabel(o) : o.label}
          </option>
        );
      })}
    </select>
  );
}

export function Input({
  name,
  defaultValue,
  type = 'text',
  ...rest
}: {
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
}) {
  return (
    <input
      id={name}
      name={name}
      type={type}
      defaultValue={defaultValue ?? ''}
      className="input"
      {...rest}
    />
  );
}

export function Textarea({
  name,
  defaultValue,
  rows = 4,
  ...rest
}: {
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <textarea
      id={name}
      name={name}
      rows={rows}
      defaultValue={defaultValue ?? ''}
      className="input"
      {...rest}
    />
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-rule accent-harbor"
      />
      {label}
    </label>
  );
}
