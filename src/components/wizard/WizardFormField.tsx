'use client';

import { type ReactNode, type InputHTMLAttributes, forwardRef } from 'react';
import { LockSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// ============================================================================
// FormField - Container with label and error handling
// ============================================================================

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground/70"
      >
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// Field kind presets - mobile keyboard + autofill behavior
// ============================================================================

export type FieldKind = 'cedula' | 'tel' | 'email' | 'money' | 'text';

const KIND_PRESETS: Record<FieldKind, InputHTMLAttributes<HTMLInputElement>> = {
  cedula: {
    inputMode: 'numeric',
    pattern: '[0-9]*',
    spellCheck: false,
    autoComplete: 'off',
  },
  tel: {
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
  },
  email: {
    type: 'email',
    inputMode: 'email',
    autoComplete: 'email',
    spellCheck: false,
  },
  money: {
    inputMode: 'numeric',
  },
  text: {},
};

// ============================================================================
// LightInput - clean light input on the real Cadence Input
// ============================================================================

interface FieldInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  hasError?: boolean;
  /** Preset for mobile keyboard, autofill and spellcheck. Explicit props win. */
  kind?: FieldKind;
}

export const LightInput = forwardRef<HTMLInputElement, FieldInputProps>(
  ({ className, icon, hasError, kind, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          className={cn(
            'h-12',
            icon && 'pl-12',
            hasError && 'border-danger/40 focus-visible:ring-danger/20 focus-visible:border-danger/40',
            className
          )}
          {...(kind ? KIND_PRESETS[kind] : {})}
          {...props}
        />
      </div>
    );
  }
);
LightInput.displayName = 'LightInput';

// ============================================================================
// LightSelect - clean light select on the real Cadence (Radix) Select
// ============================================================================

interface FieldSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: readonly { value: string; label: string }[];
  icon?: ReactNode;
  hasError?: boolean;
  className?: string;
  id?: string;
  onBlur?: () => void;
}

// ============================================================================
// LockedField - value sourced from an external system (e.g. the tenant's
// pre-scoring study), read-only by design — not disabled, not broken.
// ============================================================================

interface LockedFieldProps {
  id?: string;
  value: string;
  /** Visible reason the field can't be edited here — never an inert grey box. */
  reason: string;
  icon?: ReactNode;
  className?: string;
}

export function LockedField({ id, value, reason, icon, className }: LockedFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        id={id}
        role="group"
        aria-label={`${value || 'sin dato'} — ${reason}`}
        className="relative flex h-12 items-center gap-3 rounded-md border border-border bg-surface-muted px-4"
      >
        {icon && <span className="flex-shrink-0 text-fg-muted" aria-hidden="true">{icon}</span>}
        <span className="flex-1 truncate text-sm text-fg" aria-hidden="true">{value || '—'}</span>
        <LockSimple className="h-4 w-4 flex-shrink-0 text-fg-muted" aria-hidden="true" />
      </div>
      <p className="text-xs text-fg-muted">{reason}</p>
    </div>
  );
}

export function LightSelect({
  value,
  onChange,
  placeholder = 'Seleccionar',
  options,
  icon,
  hasError,
  className,
  id,
  onBlur,
}: FieldSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        onBlur={onBlur}
        aria-invalid={hasError || undefined}
        className={cn(
          'relative h-12 w-full',
          icon && 'pl-12',
          hasError && 'border-danger/40 focus-visible:ring-danger/20 focus-visible:border-danger/40',
          className
        )}
      >
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </span>
        )}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
