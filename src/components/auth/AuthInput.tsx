'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeSlash, Envelope, Lock, User } from '@phosphor-icons/react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: 'email' | 'password' | 'user';
  /** Determines autocomplete value for password fields */
  isNewPassword?: boolean;
}

/**
 * Premium Auth input component with icon, label, and error state
 * Password input has show/hide toggle
 */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, type = 'text', label, error, icon, isNewPassword, autoComplete, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const isPassword = type === 'password';
    const inputTextT = isPassword && showPassword ? 'text' : type;
    const reactId = React.useId();
    const errorId = `${reactId}-error`;
    const inputId = id ?? `${reactId}-input`;

    // Determine autoComplete value based on type and context
    const getAutoComplete = () => {
      if (autoComplete) return autoComplete;
      if (type === 'email') return 'email';
      if (type === 'password') return isNewPassword ? 'new-password' : 'current-password';
      if (icon === 'user') return 'name';
      return undefined;
    };

    const IconComponent = {
      email: Envelope,
      password: Lock,
      user: User,
    }[icon || 'user'];

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative group">
          {/* Left icon */}
          {icon && (
            <div className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
              isFocused ? "text-primary" : "text-muted-foreground",
              error && "text-destructive"
            )}>
              <IconComponent className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </div>
          )}

          <input
            type={inputTextT}
            ref={ref}
            id={inputId}
            autoComplete={getAutoComplete()}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'flex h-12 w-full rounded-xl border bg-background px-4 text-base md:text-[14px]',
              'transition-all duration-200 placeholder:text-muted-foreground/60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-11',
              isPassword && 'pr-11',
              error
                ? 'border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive'
                : 'border-border hover:border-foreground/20',
              className
            )}
            {...props}
          />

          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
                "text-muted-foreground hover:text-foreground focus:outline-none"
              )}
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <EyeSlash className="w-[18px] h-[18px]" strokeWidth={1.5} />
              ) : (
                <Eye className="w-[18px] h-[18px]" strokeWidth={1.5} />
              )}
            </button>
          )}

          {/* Focus ring effect - subtle glow */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-200',
              isFocused && !error ? 'opacity-100' : 'opacity-0',
              'shadow-[0_0_0_4px_rgba(var(--primary-rgb),0.1)]'
            )}
            style={{
              '--primary-rgb': '79, 70, 229'
            } as React.CSSProperties}
          />
        </div>

        {/* Error message */}
        {error && (
          <p id={errorId} className="text-[12px] text-destructive flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
