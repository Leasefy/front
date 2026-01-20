'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: 'email' | 'password' | 'user';
}

/**
 * Auth input component with icon, label, and error state
 * Password input has show/hide toggle
 */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const IconComponent = {
      email: Mail,
      password: Lock,
      user: User,
    }[icon || 'user'];

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Left icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <IconComponent className="w-4 h-4" />
            </div>
          )}

          <input
            type={inputType}
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-sm border bg-white px-3 py-2 text-sm',
              'transition-colors placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              isPassword && 'pr-10',
              error
                ? 'border-destructive focus-visible:ring-destructive'
                : 'border-input',
              className
            )}
            {...props}
          />

          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-caption text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
