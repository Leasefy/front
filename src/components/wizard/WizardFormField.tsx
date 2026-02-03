'use client';

import { type ReactNode, type InputHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// DarkInput - Luxterra-style dark input field
// ============================================================================

interface DarkInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  hasError?: boolean;
}

export const DarkInput = forwardRef<HTMLInputElement, DarkInputProps>(
  ({ className, icon, hasError, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-12 px-4 rounded-sm',
            'bg-foreground text-white placeholder:text-white/40',
            'border border-transparent',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-border',
            'transition-colors',
            icon && 'pl-12',
            hasError && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
DarkInput.displayName = 'DarkInput';

// ============================================================================
// DarkSelect - Luxterra-style dark select field
// ============================================================================

interface DarkSelectProps {
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

export function DarkSelect({
  value,
  onChange,
  placeholder = 'Seleccionar',
  options,
  icon,
  hasError,
  className,
  id,
  onBlur,
}: DarkSelectProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none z-10">
          {icon}
        </div>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          'w-full h-12 px-4 rounded-sm appearance-none cursor-pointer',
          'bg-foreground text-white',
          'border border-transparent',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-border',
          'transition-colors',
          icon && 'pl-12',
          !value && 'text-white/40',
          hasError && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
          className
        )}
      >
        <option value="" disabled className="text-white/40">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-white bg-foreground">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
    </div>
  );
}

// ============================================================================
// LightInput - Clean light input for white backgrounds (alternative)
// ============================================================================

export const LightInput = forwardRef<HTMLInputElement, DarkInputProps>(
  ({ className, icon, hasError, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-12 px-4 rounded-sm',
            'bg-black/5 text-foreground placeholder:text-muted-foreground',
            'border border-border',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-border',
            'transition-colors',
            icon && 'pl-12',
            hasError && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
LightInput.displayName = 'LightInput';

// ============================================================================
// LightSelect - Clean light select for white backgrounds
// ============================================================================

interface LightSelectProps extends DarkSelectProps {}

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
}: LightSelectProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
          {icon}
        </div>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          'w-full h-12 px-4 rounded-sm appearance-none cursor-pointer',
          'bg-black/5 text-foreground',
          'border border-border',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-border',
          'transition-colors',
          icon && 'pl-12',
          !value && 'text-muted-foreground',
          hasError && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
          className
        )}
      >
        <option value="" disabled className="text-muted-foreground">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
