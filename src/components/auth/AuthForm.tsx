'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth/use-auth';
import { cn } from '@/lib/utils';
import { SpinnerGap } from '@phosphor-icons/react';

// Google Icon - Official colors
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface AuthFormProps {
  className?: string;
  onSuccess?: () => void;
}

/**
 * Auth form - Google OAuth only
 * Handles sign in via Supabase Google OAuth
 */
export function AuthForm({ className, onSuccess }: AuthFormProps) {
  const { signInWithGoogle } = useAuth();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      onSuccess?.();
      // Supabase will redirect to /auth/callback, no need to router.push
    } catch {
      setError('Error al iniciar sesión con Google. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-heading font-semibold text-foreground tracking-tight">
          Bienvenido a Leasefy
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          Inicia sesión para encontrar o arrendar tu propiedad ideal
        </p>
      </div>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <SpinnerGap className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <GoogleIcon className="w-5 h-5" />
        )}
        <span className="text-[14px] font-medium text-foreground">
          {isLoading ? 'Conectando...' : 'Continuar con Google'}
        </span>
      </button>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
        >
          <p className="text-[13px] text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Info text */}
      <p className="text-[12px] text-muted-foreground text-center mt-6 leading-relaxed">
        Al continuar, aceptas nuestros{' '}
        <button type="button" className="text-foreground hover:underline">
          Términos de Servicio
        </button>{' '}
        y{' '}
        <button type="button" className="text-foreground hover:underline">
          Política de Privacidad
        </button>
      </p>
    </div>
  );
}
