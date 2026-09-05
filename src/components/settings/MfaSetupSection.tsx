'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, Shield, Check, Copy, Warning } from '@phosphor-icons/react';
import { getAccessToken } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';
import { IconButton } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SettingsModal } from './SettingsModal';

/**
 * Cuánto se espera a Supabase antes de rendirse. Sin tope, el candado interno
 * del SDK deja la promesa colgada para siempre y el botón se queda en
 * «Cargando...» sin decir nada — que es exactamente lo que pasaba al activar.
 */
const TOPE_MS = 15000;

/**
 * Llama la API de auth de Supabase por HTTP, sin el SDK.
 *
 * Por qué no el SDK: `supabase.auth.mfa.*` serializa todo detrás de un candado
 * (`navigator.locks`) compartido con el refresco de sesión. Si otra pestaña o
 * el propio contexto de auth lo tiene tomado, `enroll()` NO resuelve ni
 * rechaza: se queda esperando. `verify` ya lo evitaba así; ahora lo evitan
 * también `enroll` y `unenroll`, que eran los que colgaban.
 *
 * El `AbortController` es el cinturón: si la red se cuelga, esto falla con un
 * mensaje en vez de dejar el botón girando.
 */
async function apiDeAuth<T>(
  ruta: string,
  token: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Falta la configuración de Supabase');

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TOPE_MS);
  try {
    const res = await fetch(`${url}/auth/v1${ruta}`, {
      method: init.method,
      signal: control.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    const cuerpo = (await res.json().catch(() => ({}))) as {
      message?: string;
      error_description?: string;
    };
    if (!res.ok) {
      throw new Error(
        cuerpo.message || cuerpo.error_description || `Error ${res.status}`,
      );
    }
    return cuerpo as T;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Supabase no respondió a tiempo. Intenta de nuevo.');
    }
    throw err;
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * El QR listo para un `<img src>`.
 *
 * El SDK devolvía el código ya envuelto como data URI; la API REST lo devuelve
 * como SVG crudo («<svg …>»), y puesto tal cual en un `src` la imagen sale
 * rota. Se envuelve acá. Si ya viene como data URI o como URL, se deja igual.
 */
export function qrParaImagen(crudo: string): string {
  const valor = (crudo ?? '').trim();
  if (!valor) return '';
  if (valor.startsWith('data:') || valor.startsWith('http')) return valor;
  return `data:image/svg+xml;utf8,${encodeURIComponent(valor)}`;
}

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
        // Por HTTP, como todo lo demás de esta pantalla: los métodos del SDK
        // (`mfa.getAuthenticatorAssuranceLevel`, `getSession`) comparten el
        // candado de auth y se quedaban esperando. `GET /user` trae los
        // factores y, con ellos, el id que hace falta para poder desactivar.
        const token = getAccessToken();
        if (!token) return;
        const usuario = await apiDeAuth<{
          factors?: Array<{ id: string; factor_type: string; status: string }>;
        }>('/user', token);
        if (cancelled) return;

        const totp = usuario.factors?.find(
          (f) => f.factor_type === 'totp' && f.status === 'verified',
        );
        if (totp) {
          setState('enrolled');
          setFactorId(totp.id);
        }
      } catch {
        // MFA no disponible: se queda en 'idle', que ofrece activarlo.
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
      // Ni siquiera `getSession()`: ESE es el que se cuelga. Toma el mismo
      // candado de auth que `enroll`, así que pedirle el token antes de
      // esquivar el SDK dejaba el botón en «Cargando...» igual que antes.
      // El token vivo ya lo tiene el cliente HTTP en memoria — lo escribe el
      // AuthProvider en cada cambio de sesión — y es el mismo que va en el
      // Authorization de todas las llamadas del panel.
      const token = getAccessToken();
      accessTokenRef.current = token;
      if (!token) throw new Error('No hay sesión activa');

      // Por HTTP, no por el SDK: `mfa.enroll()` se colgaba sin resolver ni
      // rechazar cuando el candado de auth estaba tomado, y el botón se
      // quedaba en «Cargando...» para siempre.
      // El nombre lleva la marca de tiempo para no chocar con factores
      // huérfanos de intentos anteriores (mfa_factor_name_conflict).
      const data = await apiDeAuth<{
        id: string;
        totp: { qr_code: string; secret: string };
      }>('/factors', token, {
        method: 'POST',
        body: { factor_type: 'totp', friendly_name: `Leasefy ${Date.now()}` },
      });

      setEnrollData({
        factorId: data.id,
        qrCode: qrParaImagen(data.totp.qr_code),
        secret: data.totp.secret,
      });
      setState('enrolling');
    } catch (err) {
      toast.error((err as Error).message || 'Error al iniciar la configuración de 2FA');
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

    if (!currentEnroll || currentCode.length !== 6) return;

    setIsLoading(true);
    try {
      // Fuera del SDK, como todo lo demás de esta pantalla: el candado interno
      // de auth cuelga después de `enroll()`. Y por `apiDeAuth`, no por un
      // `fetch` suelto: éstos eran los dos ÚNICOS pedidos de la pantalla sin el
      // tope de 15 s, así que una red colgada dejaba «Verificando...» para
      // siempre — exactamente el síntoma que el tope existe para evitar.
      const token = getAccessToken() ?? accessTokenRef.current;
      if (!token) throw new Error('No hay sesión activa');

      // Paso 1: el desafío.
      const desafio = await apiDeAuth<{ id: string }>(
        `/factors/${currentEnroll.factorId}/challenge`,
        token,
        { method: 'POST' },
      );

      // Paso 2: verificar con el código.
      await apiDeAuth(`/factors/${currentEnroll.factorId}/verify`, token, {
        method: 'POST',
        body: { challenge_id: desafio.id, code: currentCode },
      });

      setState('enrolled');
      setFactorId(currentEnroll.factorId);
      setEnrollData(null);
      setCode('');
      toast.success('Autenticación de dos factores activada');
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('invalid') || msg.includes('expired')) {
        toast.error('Código incorrecto. Intenta de nuevo.');
      } else {
        toast.error(msg || 'Error al verificar código');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEnroll = useCallback(() => {
    // La pantalla vuelve YA. La limpieza del factor a medio crear se dispara
    // de fondo: cancelar no puede quedar esperando a la red — antes esto
    // esperaba al SDK, que es justo el que se cuelga.
    const aLimpiar = enrollData?.factorId;
    const token = accessTokenRef.current;
    setEnrollData(null);
    setCode('');
    setState('idle');

    if (aLimpiar && token) {
      void apiDeAuth(`/factors/${aLimpiar}`, token, { method: 'DELETE' }).catch(
        () => {
          // Un factor huérfano no rompe nada: el próximo intento usa otro
          // nombre (lleva marca de tiempo) y no choca con este.
        },
      );
    }
  }, [enrollData]);

  const handleUnenroll = useCallback(async () => {
    if (!factorId) return;
    setIsLoading(true);
    try {
      const token = getAccessToken() ?? accessTokenRef.current;
      if (!token) throw new Error('No hay sesión activa');

      // Por HTTP, por el mismo candado que colgaba a `enroll`.
      await apiDeAuth(`/factors/${factorId}`, token, { method: 'DELETE' });

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
      toast.success('Código secreto copiado');
    }
  }, [enrollData]);

  if (initializing) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
            <ShieldCheck className="h-[18px] w-[18px] text-fg-muted" />
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
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success-soft">
              <ShieldCheck className="h-[18px] w-[18px] text-success" />
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
            <div className="p-4 bg-danger-soft border border-danger/30 rounded-lg flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center flex-shrink-0">
                <Warning className="w-5 h-5 text-danger" />
              </div>
              <p className="text-sm text-danger">
                Al desactivar 2FA tu cuenta queda menos protegida: para entrar bastará tu contraseña.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                hideArrow
                onClick={() => setShowDisableModal(false)}
                className="flex-1 rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                hideArrow
                isLoading={isLoading}
                onClick={handleUnenroll}
                disabled={isLoading}
                className="flex-1 rounded-lg"
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
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
            <Shield className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-fg">Configurar 2FA</p>
            <p className="text-xs text-fg-subtle">Escanea el código QR con tu app de autenticación</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center py-2">
          <div className="p-4 bg-white rounded-lg border border-border">
            <img
              src={enrollData.qrCode}
              alt="Código QR para autenticación"
              className="w-48 h-48"
            />
          </div>
        </div>

        {/* Secret key for manual entry */}
        <div className="p-3 bg-surface-muted rounded-lg">
          <p className="text-xs text-fg-subtle mb-1">O ingresa este código manualmente:</p>
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
            Ingresa el código de 6 dígitos
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
            className="h-12 rounded-lg text-center tracking-[0.5em] font-mono"
            placeholder="000000"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            hideArrow
            onClick={handleCancelEnroll}
            className="flex-1 rounded-lg"
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            hideArrow
            onClick={handleVerifyCode}
            disabled={isLoading || code.length !== 6}
            className="flex-1 rounded-lg bg-success text-white hover:bg-success"
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
    <div className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-surface-hover transition-colors sm:px-5">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
          <ShieldCheck className="h-[18px] w-[18px] text-fg-muted" />
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
