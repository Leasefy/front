'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, Shield, Check, Copy, Warning } from '@phosphor-icons/react';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { IconButton } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SettingsModal } from './SettingsModal';

type MfaState = 'idle' | 'enrolling' | 'enrolled';

interface EnrollData {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function MfaSetupSection() {
  const [state, setState] = useState<MfaState>('idle');
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  // Check if MFA is already enrolled on mount
  useEffect(() => {
    let cancelled = false;

    // Safety timeout — if listFactors hangs, stop loading after 3s
    const timeout = setTimeout(() => {
      if (!cancelled) setInitializing(false);
    }, 3000);

    const checkFactors = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (cancelled) return;
        // If next level requires aal2, user has a verified TOTP factor
        if (aal?.nextLevel === 'aal2') {
          setState('enrolled');
          // Try to get factorId from session (non-blocking)
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const amrTotp = session?.user?.factors?.find(
              (f: { factor_type: string; status: string }) => f.factor_type === 'totp' && f.status === 'verified'
            );
            if (amrTotp) setFactorId(amrTotp.id);
          } catch {
            // Not critical
          }
        }
      } catch {
        // MFA not available
      } finally {
        if (!cancelled) {
          setInitializing(false);
          clearTimeout(timeout);
        }
      }
    };
    checkFactors();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const handleStartEnroll = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      // Save access token BEFORE enroll() — SDK lock hangs after enroll
      const { data: { session } } = await supabase.auth.getSession();
      accessTokenRef.current = session?.access_token ?? null;

      // Always use unique name to avoid mfa_factor_name_conflict from orphaned factors
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Leasefy ${Date.now()}`,
      });

      if (error) throw error;

      setEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setState('enrolling');
    } catch (err) {
      toast.error((err as Error).message || 'Error al iniciar configuracion 2FA');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use ref to always have fresh enrollData inside async handlers
  const enrollDataRef = useRef(enrollData);
  enrollDataRef.current = enrollData;

  const codeRef = useRef(code);
  codeRef.current = code;

  const handleVerifyCode = async () => {
    const currentEnroll = enrollDataRef.current;
    const currentCode = codeRef.current;

    if (!currentEnroll || currentCode.length !== 6) {
      console.warn('[MFA] Verify skipped — enrollData:', !!currentEnroll, 'code length:', currentCode.length);
      return;
    }

    setIsLoading(true);
    try {
      // Bypass Supabase SDK entirely — internal session lock hangs after enroll().
      // Use token saved before enroll() and call REST API with fetch.
      const token = accessTokenRef.current;
      if (!token) throw new Error('No hay sesion activa');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${token}`,
      };

      // Step 1: Create challenge
      const challengeRes = await fetch(
        `${supabaseUrl}/auth/v1/factors/${currentEnroll.factorId}/challenge`,
        { method: 'POST', headers }
      );
      if (!challengeRes.ok) {
        const err = await challengeRes.json();
        throw new Error(err.message || 'Error al crear challenge');
      }
      const challengeData = await challengeRes.json();

      // Step 2: Verify with code
      const verifyRes = await fetch(
        `${supabaseUrl}/auth/v1/factors/${currentEnroll.factorId}/verify`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            challenge_id: challengeData.id,
            code: currentCode,
          }),
        }
      );
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.message || 'Error al verificar codigo');
      }

      setState('enrolled');
      setFactorId(currentEnroll.factorId);
      setEnrollData(null);
      setCode('');
      toast.success('Autenticación de dos factores activada');
    } catch (err) {
      console.error('[MFA] Verify error:', err);
      const msg = (err as Error).message || '';
      if (msg.includes('invalid') || msg.includes('expired')) {
        toast.error('Codigo incorrecto. Intenta de nuevo.');
      } else {
        toast.error(msg || 'Error al verificar codigo');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEnroll = useCallback(async () => {
    if (enrollData) {
      try {
        const supabase = getSupabase();
        if (supabase) await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId });
      } catch {
        // Ignore cleanup errors
      }
    }
    setEnrollData(null);
    setCode('');
    setState('idle');
  }, [enrollData]);

  const handleUnenroll = useCallback(async () => {
    if (!factorId) return;
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setState('idle');
      setFactorId(null);
      setShowDisableModal(false);
      toast.success('Autenticación de dos factores desactivada');
    } catch (err) {
      toast.error((err as Error).message || 'Error al desactivar 2FA');
    } finally {
      setIsLoading(false);
    }
  }, [factorId]);

  const handleCopySecret = useCallback(() => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      toast.success('Codigo secreto copiado');
    }
  }, [enrollData]);

  if (initializing) {
    return (
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-fg-muted" />
          </div>
          <div>
            <p className="text-sm font-medium text-fg">Autenticación de dos factores</p>
            <p className="text-xs text-fg-subtle">Cargando...</p>
          </div>
        </div>
        <Spinner size="sm" variant="muted" />
      </div>
    );
  }

  // Enrolled state - show active badge + disable button
  if (state === 'enrolled') {
    return (
      <>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-fg">Autenticación de dos factores</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="success">
                  <Check className="w-3 h-3" />
                  Activada
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => setShowDisableModal(true)}
            className="rounded-md text-xs text-danger border-danger/30 hover:bg-danger-soft"
          >
            Desactivar
          </Button>
        </div>

        <SettingsModal
          open={showDisableModal}
          onClose={() => setShowDisableModal(false)}
          title="Desactivar 2FA"
        >
          <div className="space-y-4">
            <div className="p-4 bg-danger-soft border border-danger/30 rounded-xl flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center flex-shrink-0">
                <Warning className="w-5 h-5 text-danger" />
              </div>
              <p className="text-sm text-danger">
                Al desactivar 2FA tu cuenta sera menos segura. Solo necesitaras tu contrasena para iniciar sesion.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                hideArrow
                onClick={() => setShowDisableModal(false)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                hideArrow
                isLoading={isLoading}
                onClick={handleUnenroll}
                disabled={isLoading}
                className="flex-1 rounded-xl"
              >
                {isLoading ? 'Desactivando...' : 'Desactivar 2FA'}
              </Button>
            </div>
          </div>
        </SettingsModal>
      </>
    );
  }

  // Enrolling state - show QR + code input
  if (state === 'enrolling' && enrollData) {
    return (
      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
          </div>
          <div>
            <p className="text-sm font-medium text-fg">Configurar 2FA</p>
            <p className="text-xs text-fg-subtle">Escanea el codigo QR con tu app de autenticacion</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center py-2">
          <div className="p-4 bg-white rounded-xl border border-border">
            <img
              src={enrollData.qrCode}
              alt="Codigo QR para autenticacion"
              className="w-48 h-48"
            />
          </div>
        </div>

        {/* Secret key for manual entry */}
        <div className="p-3 bg-surface-muted rounded-xl">
          <p className="text-xs text-fg-subtle mb-1">O ingresa este codigo manualmente:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-fg break-all select-all">
              {enrollData.secret}
            </code>
            <IconButton
              variant="ghost"
              aria-label="Copiar código"
              title="Copiar codigo"
              onClick={handleCopySecret}
              icon={<Copy className="w-4 h-4 text-fg-subtle" />}
              className="p-1.5 rounded-md flex-shrink-0"
            />
          </div>
        </div>

        {/* Code input */}
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-2">
            Ingresa el codigo de 6 digitos
          </label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6 && !isLoading) {
                handleVerifyCode();
              }
            }}
            autoFocus
            className="h-12 rounded-xl text-center tracking-[0.5em] font-mono"
            placeholder="000000"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            hideArrow
            onClick={handleCancelEnroll}
            className="flex-1 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            hideArrow
            onClick={() => {
              console.log('[MFA] Button clicked! code:', code, 'enrollData:', !!enrollData);
              handleVerifyCode();
            }}
            disabled={isLoading || code.length !== 6}
            className="flex-1 rounded-xl bg-success text-white hover:bg-success"
          >
            {isLoading ? <Spinner size="xs" variant="current" /> : <ShieldCheck className="w-4 h-4" />}
            {isLoading ? 'Verificando...' : 'Verificar'}
          </Button>
        </div>
      </div>
    );
  }

  // Idle state - not enrolled
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-surface-hover transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-fg-muted" />
        </div>
        <div>
          <p className="text-sm font-medium text-fg">Autenticación de dos factores</p>
          <p className="text-xs text-fg-subtle">Capa extra de seguridad para tu cuenta</p>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        onClick={handleStartEnroll}
        disabled={isLoading}
        className="rounded-md text-xs bg-success text-white hover:bg-success"
      >
        {isLoading ? <Spinner size="xs" variant="current" /> : <Shield className="w-3.5 h-3.5" />}
        {isLoading ? 'Cargando...' : 'Activar'}
      </Button>
    </div>
  );
}
