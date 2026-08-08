'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, SignOut } from '@phosphor-icons/react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ForceLightMode } from '@/components/providers/ForceLightMode';

export default function MfaVerifyPage() {
  const router = useRouter();
  const { user, setMfaVerified, signOut, mfaRequired } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  // If MFA is not required, redirect to dashboard
  useEffect(() => {
    if (user && !mfaRequired) {
      const dashboardPath = user.role === 'agency'
        ? '/panel/inmobiliaria'
        : user.role === 'landlord'
          ? '/panel'
          : '/inquilino';
      router.replace(dashboardPath);
    }
  }, [user, mfaRequired, router]);

  // Get the TOTP factor on mount
  useEffect(() => {
    const loadFactor = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verified = factors?.totp?.find(f => f.status === 'verified');
        if (verified) {
          setFactorId(verified.id);
        }
      } catch {
        // Ignore
      }
    };
    loadFactor();
  }, []);

  const handleVerify = useCallback(async () => {
    if (!factorId || code.length !== 6) return;
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      // Create a challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      // Mark MFA as verified in context
      setMfaVerified();

      // Redirect to dashboard
      const dashboardPath = user?.role === 'agency'
        ? '/panel/inmobiliaria'
        : user?.role === 'landlord'
          ? '/panel'
          : '/inquilino';
      router.replace(dashboardPath);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('invalid') || msg.includes('expired')) {
        toast.error('Codigo incorrecto. Intenta de nuevo.');
      } else {
        toast.error(msg || 'Error al verificar codigo');
      }
      setCode('');
    } finally {
      setIsLoading(false);
    }
  }, [factorId, code, setMfaVerified, user, router]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

  // Submit on Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isLoading) {
      handleVerify();
    }
  }, [code, isLoading, handleVerify]);

  return (
    <ForceLightMode>
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-[16px] bg-accent-soft flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" weight="fill" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              Verificacion de seguridad
            </h1>
            <p className="text-sm text-fg-muted">
              Ingresa el código de 6 dígitos de tu app de autenticación
            </p>
          </div>

          {/* Code input */}
          <div className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              aria-label="Código de verificación de 6 dígitos"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-14 text-lg text-center tracking-[0.5em] font-mono tabular-nums"
              placeholder="000000"
            />

            <Button
              onClick={handleVerify}
              disabled={isLoading || code.length !== 6 || !factorId}
              isLoading={isLoading}
              hideArrow
              className="w-full"
            >
              {isLoading ? 'Verificando...' : 'Verificar'}
            </Button>
          </div>

          {/* Sign out link */}
          <div className="text-center">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
            >
              <SignOut className="w-4 h-4" />
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </ForceLightMode>
  );
}
