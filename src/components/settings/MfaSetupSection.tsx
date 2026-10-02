'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, Shield, ShieldSlash, Check, Copy } from '@phosphor-icons/react';
import { getAccessToken } from '@/lib/api/client';
import {
  apiDeAuth,
  crearFactorTotp,
  descartarFactorSinVerificar,
  factorTotpVerificado,
  qrParaImagen,
  sesionConSegundoFactor,
  verificarConElSdk,
  verificarFactorNuevo,
} from '@/lib/auth/inscripcion-del-segundo-factor';
import { toast } from '@/components/ui/toast';
import { ErrorDelSegundoFactor } from '@/lib/auth/errores-del-segundo-factor';
import { FRASES_DE_SUPABASE, codigoDeSupabase, mensajeDeSupabase } from '@/lib/auth/errores-de-supabase';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { IconButton } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SettingsModal } from './SettingsModal';

/**
 * El transporte (HTTP con tope, el SDK con tope, el QR) vive en
 * `inscripcion-del-segundo-factor.ts` desde el 30-09-2026: lo comparte con el
 * paso a paso de `/auth/mfa-enroll`. Los porqués del candado del SDK están
 * documentados allá.
 */
export { qrParaImagen };

type MfaState = 'idle' | 'enrolling' | 'enrolled';

interface EnrollData {
  factorId: string;
  qrCode: string;
  secret: string;
}

export interface MfaSetupSectionProps {
  /**
   * T-0099: called once a verified TOTP factor exists — either because this
   * screen just finished the enroll+verify flow, or because the on-mount
   * check found one already (defensive: `/auth/mfa-enroll` shouldn't be
   * reachable with a factor already enrolled, but this component doesn't
   * assume its caller got that gating right). `/auth/mfa-enroll` uses this
   * to move on to `/auth/mfa-verify` for the SDK-recognized step-up — this
   * screen's own verify goes over raw REST (see the module doc comment
   * above), which doesn't update the Supabase JS client's cached session.
   * Optional — Settings' usage doesn't pass it and behaves exactly as before.
   */
  onEnrolled?: () => void;
  /**
   * T-0123: hay un factor verificado YA AL MONTAR (sesión que todavía puede
   * estar en `aal1`). Si se pasa, el chequeo al montar avisa SÓLO por acá y
   * `onEnrolled` queda reservado para una inscripción recién verificada: sin
   * esta separación, `/auth/mfa-enroll` tomaba el factor ya existente por una
   * inscripción terminada y rebotaba con `/auth/mfa-verify` en bucle.
   */
  onYaInscrito?: () => void;
  /**
   * Quedó inscrito y verificado, con el `factorId` a mano. 🔴 Ojo: la
   * inscripción va por HTTP, fuera del SDK, así que la sesión del SDK sigue
   * en `aal1`; quien necesite `aal2` (el panel de administración, 23-09) pide
   * enseguida un código con el SDK. Sólo se dispara desde el flujo de
   * inscripción fresca (`handleVerifyCode`), no desde el chequeo al montar —
   * ahí no hay `factorId` recién generado que ofrecer.
   */
  onActivado?: (factorId: string) => void;
  /**
   * 🔴 Está en el LOGIN (`/auth/mfa-verify`, sesión `aal1`). El primer código
   * del factor nuevo va por el SDK y no por HTTP: así la sesión queda en
   * `aal2` como en la verificación normal y la persona entra sin escribir un
   * segundo código (29-09-2026).
   */
  enElIngreso?: boolean;
  /** Sin factor verificado, arranca la inscripción sola (tras restablecerlo). */
  inscribirAlAbrir?: boolean;
  /**
   * «¿No tienes la app?» dentro de «Desactivar» con la sesión en `aal1`: el
   * login lo manda a restablecerlo con un código al correo.
   */
  onSinLaApp?: () => void;
  /**
   * `true` cuando empieza a cambiar el factor desde el login (pidió el código
   * de la app para quitarlo); `false` si se echó atrás o falló antes de
   * quitarlo. El login lo usa para no irse solo mientras tanto: pasar el
   * código sube la sesión a `aal2`, y eso lo sacaría de la pantalla antes de
   * inscribir el nuevo.
   */
  onCambioDeFactor?: (enCurso: boolean) => void;
}


/**
 * El fallo del segundo factor, en español y con la regla de oro (02-10-2026).
 * Lo de `inscripcion-del-segundo-factor` ya viene traducido; un error de
 * Supabase con código va por su traductor; lo demás (la red, un `TypeError`
 * de JavaScript) por el de la plataforma. Antes era `err.message` crudo.
 */
function mensajeDelSegundoFactor(err: unknown, porDefecto: string, accion: string): string {
  if (err instanceof ErrorDelSegundoFactor) return err.message;
  if (codigoDeSupabase(err)) return mensajeDeSupabase(err, { porDefecto, accion });
  return mensajeParaLaPersona(err, { porDefecto, accion });
}

/** Sin token en memoria: la sesión se cerró (no «No hay sesión activa»). */
const sinSesion = () => new ErrorDelSegundoFactor(FRASES_DE_SUPABASE.session_not_found);

export function MfaSetupSection({
  onEnrolled,
  onYaInscrito,
  onActivado,
  enElIngreso = false,
  inscribirAlAbrir = false,
  onSinLaApp,
  onCambioDeFactor,
}: MfaSetupSectionProps = {}) {
  const [state, setState] = useState<MfaState>('idle');
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const accessTokenRef = useRef<string | null>(null);
  /**
   * 🔴 «Desactivar» con la sesión en `aal1` (el login): Supabase no deja
   * quitar un factor verificado sin `aal2` (respondía 422). Se pide primero
   * el código de la app. Se decide al abrir el modal, leyendo el token.
   */
  const [pideCodigo, setPideCodigo] = useState(false);
  const [codigoDeLaApp, setCodigoDeLaApp] = useState('');
  const [errorDelModal, setErrorDelModal] = useState<string | null>(null);
  const quitandoRef = useRef(false);
  const yaArrancoRef = useRef(false);

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
        const verificado = await factorTotpVerificado(token);
        if (cancelled) return;

        if (verificado) {
          setState('enrolled');
          setFactorId(verificado);
          if (onYaInscrito) onYaInscrito();
          else onEnrolled?.();
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
    // Mount-only check by design (same as the rest of this effect) — a
    // changing `onEnrolled` identity must not re-run the factor lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartEnroll = useCallback(async (tokenExplicito?: string | null) => {
    setIsLoading(true);
    try {
      // Ni siquiera `getSession()`: ESE es el que se cuelga. Toma el mismo
      // candado de auth que `enroll`, así que pedirle el token antes de
      // esquivar el SDK dejaba el botón en «Cargando...» igual que antes.
      // El token vivo ya lo tiene el cliente HTTP en memoria — lo escribe el
      // AuthProvider en cada cambio de sesión — y es el mismo que va en el
      // Authorization de todas las llamadas del panel.
      const token = tokenExplicito ?? getAccessToken();
      accessTokenRef.current = token;
      if (!token) throw sinSesion();

      // Por HTTP, no por el SDK (`crearFactorTotp` explica por qué).
      const nuevo = await crearFactorTotp(token);
      setEnrollData({ factorId: nuevo.factorId, qrCode: nuevo.qrCode, secret: nuevo.secret });
      setState('enrolling');
    } catch (err) {
      toast.error(
        mensajeDelSegundoFactor(
          err,
          'No pudimos empezar a activar el segundo factor. Prueba de nuevo en un momento.',
          'empezar a activar el segundo factor',
        ),
      );
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
      // En el login, por el SDK (la sesión queda en `aal2`); en Configuración,
      // por HTTP con tope. Los porqués, en `verificarFactorNuevo`.
      await verificarFactorNuevo({
        factorId: currentEnroll.factorId,
        codigo: currentCode,
        enElIngreso,
        token: getAccessToken() ?? accessTokenRef.current,
      });

      setState('enrolled');
      setFactorId(currentEnroll.factorId);
      setEnrollData(null);
      setCode('');
      toast.success('Autenticación de dos factores activada');
      onEnrolled?.();
      onActivado?.(currentEnroll.factorId);
    } catch (err) {
      // Casi siempre ya viene en español (`errores-del-segundo-factor.ts`).
      toast.error(mensajeDelSegundoFactor(err, 'No se pudo verificar el código.', 'verificar el código'));
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

    if (aLimpiar && token) descartarFactorSinVerificar(aLimpiar, token);
  }, [enrollData]);

  const handleUnenroll = useCallback(async () => {
    if (!factorId) return;
    setIsLoading(true);
    try {
      const token = getAccessToken() ?? accessTokenRef.current;
      if (!token) throw sinSesion();

      // Por HTTP, por el mismo candado que colgaba a `enroll`.
      await apiDeAuth(`/factors/${factorId}`, token, { method: 'DELETE' });

      setState('idle');
      setFactorId(null);
      setShowDisableModal(false);
      toast.success('Autenticación de dos factores desactivada');
    } catch (err) {
      toast.error(
        mensajeDelSegundoFactor(
          err,
          'No pudimos desactivar el segundo factor. Prueba de nuevo en un momento.',
          'desactivar el segundo factor',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [factorId]);

  const abrirDesactivar = useCallback(() => {
    setPideCodigo(!sesionConSegundoFactor(getAccessToken() ?? accessTokenRef.current));
    setCodigoDeLaApp('');
    setErrorDelModal(null);
    setShowDisableModal(true);
  }, []);

  const cerrarDesactivar = useCallback(() => {
    setShowDisableModal(false);
    setCodigoDeLaApp('');
    setErrorDelModal(null);
  }, []);

  /**
   * 🔴 Caso A (Nico, 29-09-2026): quitar el factor desde el login, CON la
   * app. Primero el código actual por el SDK (sube la sesión a `aal2`),
   * después se quita el factor con ESE token nuevo y enseguida arranca la
   * inscripción del reemplazo en la misma tarjeta.
   */
  const handleQuitarConCodigo = useCallback(
    async (codigo: string) => {
      if (!factorId || codigo.length !== 6 || quitandoRef.current) return;
      quitandoRef.current = true;
      setIsLoading(true);
      setErrorDelModal(null);
      onCambioDeFactor?.(true);

      let tokenNuevo: string | null;
      try {
        tokenNuevo = await verificarConElSdk(factorId, codigo);
        const token = tokenNuevo ?? getAccessToken();
        if (!token) throw sinSesion();
        await apiDeAuth(`/factors/${factorId}`, token, { method: 'DELETE' });
      } catch (err) {
        quitandoRef.current = false;
        setIsLoading(false);
        setCodigoDeLaApp('');
        setErrorDelModal(
          mensajeDelSegundoFactor(err, 'No se pudo quitar el segundo factor.', 'quitar el segundo factor'),
        );
        onCambioDeFactor?.(false);
        return;
      }

      quitandoRef.current = false;
      setState('idle');
      setFactorId(null);
      setShowDisableModal(false);
      setCodigoDeLaApp('');
      toast.success('Quitamos el segundo factor anterior. Ahora actívalo de nuevo con tu app.');
      await handleStartEnroll(tokenNuevo);
    },
    [factorId, onCambioDeFactor, handleStartEnroll],
  );

  // Tras restablecerlo por correo: sin factor, la inscripción arranca sola.
  useEffect(() => {
    if (!inscribirAlAbrir || initializing || state !== 'idle' || yaArrancoRef.current) return;
    yaArrancoRef.current = true;
    void handleStartEnroll();
  }, [inscribirAlAbrir, initializing, state, handleStartEnroll]);

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
            onClick={abrirDesactivar}
            className="rounded-md text-xs text-danger border-danger/30 hover:bg-danger-soft"
          >
            Desactivar
          </Button>
        </div>

        <SettingsModal
          open={showDisableModal}
          onClose={cerrarDesactivar}
          title={pideCodigo ? 'Quitar el segundo factor' : 'Desactivar 2FA'}
          variant="destructive"
          icon={<ShieldSlash weight="bold" />}
          description={
            pideCodigo
              ? 'Para quitarlo, primero confirma que eres tú: escribe el código que muestra tu app de autenticación ahora. Enseguida te mostramos cómo activarlo de nuevo.'
              : 'Al desactivar 2FA tu cuenta queda menos protegida: para entrar bastará tu contraseña.'
          }
          footer={
            pideCodigo ? (
              <>
                <Button
                  variant="outline"
                  hideArrow
                  onClick={cerrarDesactivar}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  hideArrow
                  isLoading={isLoading}
                  onClick={() => void handleQuitarConCodigo(codigoDeLaApp)}
                  disabled={isLoading || codigoDeLaApp.length !== 6}
                >
                  {isLoading ? 'Verificando…' : 'Verificar y quitar'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" hideArrow onClick={cerrarDesactivar}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  hideArrow
                  isLoading={isLoading}
                  onClick={handleUnenroll}
                  disabled={isLoading}
                >
                  {isLoading ? 'Desactivando...' : 'Desactivar 2FA'}
                </Button>
              </>
            )
          }
        >
          {pideCodigo ? (
            <div className="space-y-4" aria-busy={isLoading}>
              <CasillasDeCodigo
                aria-label="Código de 6 dígitos de tu app de autenticación"
                value={codigoDeLaApp}
                onChange={(v) => {
                  setCodigoDeLaApp(v);
                  if (errorDelModal) setErrorDelModal(null);
                }}
                onCompleto={(v) => void handleQuitarConCodigo(v)}
                hayError={Boolean(errorDelModal)}
                disabled={isLoading}
                autoFocus
              />
              {/* El error bajo el código entra suave (decisión 1, 02-10-2026). */}
              <ErrorDelCampo
                id="quitar-segundo-factor-error"
                mensaje={errorDelModal}
                className="text-pretty text-center"
              />
              {onSinLaApp ? (
                <div className="text-center">
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => {
                      cerrarDesactivar();
                      onSinLaApp();
                    }}
                  >
                    ¿No tienes la app? Restablécelo con un código a tu correo
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
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
        onClick={() => void handleStartEnroll()}
        disabled={isLoading}
        className="rounded-md text-xs bg-success text-white hover:bg-success"
      >
        {isLoading ? <Spinner size="xs" variant="current" /> : <Shield className="w-3.5 h-3.5" />}
        {isLoading ? 'Cargando...' : 'Activar'}
      </Button>
    </div>
  );
}
