'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeSlash } from '@phosphor-icons/react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /**
   * Legacy prop — internal icons were removed per the DS grammar; kept for
   * API compatibility and to infer autocomplete ('user' → name).
   */
  icon?: 'email' | 'password' | 'user';
  /** Determines autocomplete value for password fields */
  isNewPassword?: boolean;
}

/**
 * Auth input — quiet DS grammar: hairline border, 8px radius, no internal
 * icons. Focus = electric-blue border + soft ring. Password gets a show/hide
 * toggle. Error in brand critical tone, wired via aria-describedby.
 */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, type = 'text', label, error, icon, isNewPassword, autoComplete, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const resolvedType = isPassword && showPassword ? 'text' : type;
    const reactId = React.useId();
    const errorId = `${reactId}-error`;
    const inputId = id ?? `${reactId}-input`;

    const getAutoComplete = () => {
      if (autoComplete) return autoComplete;
      if (type === 'email') return 'email';
      if (type === 'password') return isNewPassword ? 'new-password' : 'current-password';
      if (icon === 'user') return 'name';
      return undefined;
    };

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-fg-muted">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={resolvedType}
            ref={ref}
            id={inputId}
            autoComplete={getAutoComplete()}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              // En reposo, un relleno apenas gris y sin filete: el campo se lee
              // como un lugar donde escribir, no como una caja. Al enfocar se
              // vuelve blanco con el azul de la marca y un halo suave.
              'h-12 w-full rounded-lg border bg-surface-muted/70 px-4 text-base md:text-[14px] text-fg',
              'transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-fg-subtle',
              'focus:outline-none focus:bg-surface focus:border-[#1A40FF] focus:shadow-[0_0_0_4px_rgba(26,64,255,0.10)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isPassword && 'pr-11',
              error
                ? 'border-danger bg-surface focus:border-danger focus:shadow-[0_0_0_4px_rgba(192,57,43,0.10)]'
                : 'border-transparent hover:border-border',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeSlash className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
            </button>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-[12px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
