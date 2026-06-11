'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeSlash } from '@phosphor-icons/react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Determines autocomplete value for password fields */
  isNewPassword?: boolean;
}

/**
 * Auth input — quiet DS grammar: hairline border, 8px radius, no internal
 * icons. Focus = electric-blue border + soft ring. Password gets a show/hide
 * toggle. Error in brand critical tone.
 */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, type = 'text', label, error, isNewPassword, autoComplete, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const resolvedType = isPassword && showPassword ? 'text' : type;

    const getAutoComplete = () => {
      if (autoComplete) return autoComplete;
      if (type === 'email') return 'email';
      if (type === 'password') return isNewPassword ? 'new-password' : 'current-password';
      return undefined;
    };

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[13px] font-medium text-neutral-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={resolvedType}
            ref={ref}
            autoComplete={getAutoComplete()}
            className={cn(
              'h-11 w-full rounded-md border bg-white px-3.5 text-[14px] text-[#0B1220]',
              'transition-colors duration-150 placeholder:text-neutral-400',
              'focus:outline-none focus:border-[#1A40FF] focus:shadow-[0_0_0_3px_rgba(26,64,255,0.10)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isPassword && 'pr-11',
              error
                ? 'border-[#C4503B] focus:border-[#C4503B] focus:shadow-[0_0_0_3px_rgba(196,80,59,0.10)]'
                : 'border-neutral-200 hover:border-neutral-300',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeSlash className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
            </button>
          )}
        </div>

        {error && <p className="text-[12px] text-[#C4503B]">{error}</p>}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
