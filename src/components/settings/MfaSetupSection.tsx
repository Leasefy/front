'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, Shield, SpinnerGap, Check, Copy, Warning } from '@phosphor-icons/react';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
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
      toast.success('Autenticacion de dos factores activada');
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
        await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId });
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
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setState('idle');
      setFactorId(null);
      setShowDisableModal(false);
      toast.success('Autenticacion de dos factores desactivada');
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
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">Autenticacion de dos factores</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Cargando...</p>
          </div>
        </div>
        <SpinnerGap className="w-5 h-5 text-neutral-400 animate-spin" />
      </div>
    );
  }

  // Enrolled state - show active badge + disable button
  if (state === 'enrolled') {
    return (
      <>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Autenticacion de dos factores</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                  <Check className="w-3 h-3" />
                  Activada
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDisableModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Desactivar
          </button>
        </div>

        <SettingsModal
          open={showDisableModal}
          onClose={() => setShowDisableModal(false)}
          title="Desactivar 2FA"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <Warning className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm text-red-800 dark:text-red-200">
                Al desactivar 2FA tu cuenta sera menos segura. Solo necesitaras tu contrasena para iniciar sesion.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDisableModal(false)}
                className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnenroll}
                disabled={isLoading}
                className="flex-1 py-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : null}
                {isLoading ? 'Desactivando...' : 'Desactivar 2FA'}
              </button>
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
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">Configurar 2FA</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Escanea el codigo QR con tu app de autenticacion</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center py-2">
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700">
            <img
              src={enrollData.qrCode}
              alt="Codigo QR para autenticacion"
              className="w-48 h-48"
            />
          </div>
        </div>

        {/* Secret key for manual entry */}
        <div className="p-3 bg-stone-50 dark:bg-[#1f1f21] rounded-xl">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">O ingresa este codigo manualmente:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-neutral-900 dark:text-white break-all select-all">
              {enrollData.secret}
            </code>
            <button
              onClick={handleCopySecret}
              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
              title="Copiar codigo"
            >
              <Copy className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Code input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Ingresa el codigo de 6 digitos
          </label>
          <input
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
            className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm text-center tracking-[0.5em] font-mono bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
            placeholder="000000"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancelEnroll}
            className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              console.log('[MFA] Button clicked! code:', code, 'enrollData:', !!enrollData);
              handleVerifyCode();
            }}
            disabled={isLoading || code.length !== 6}
            className="flex-1 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isLoading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>
      </div>
    );
  }

  // Idle state - not enrolled
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Autenticacion de dos factores</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Capa extra de seguridad para tu cuenta</p>
        </div>
      </div>
      <button
        onClick={handleStartEnroll}
        disabled={isLoading}
        className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
      >
        {isLoading ? <SpinnerGap className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
        {isLoading ? 'Cargando...' : 'Activar'}
      </button>
    </div>
  );
}
