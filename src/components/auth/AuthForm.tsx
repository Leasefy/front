'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AuthInput } from './AuthInput';
import { useAuth } from '@/lib/auth/use-auth';
import { AUTH_BOOTSTRAP_ERROR_KEY } from '@/lib/auth/auth-context';
import { rutaDeOnboarding } from '@/lib/auth/perfil-de-onboarding';
import { getRoleHomeRoute } from '@/lib/auth/role-routes';
import { cn, sanitizeReturnUrl } from '@/lib/utils';
import { SesionYaAbierta } from './SesionYaAbierta';
import { MedidorDeContrasena } from './MedidorDeContrasena';
import { normalizarCorreo, validarCorreo, webmailDelCorreo } from '@/lib/auth/correo';
import { fortalezaDeContrasena } from '@/lib/auth/fortaleza-de-contrasena';
import {
  SpinnerGap,
  ArrowLeft,
  ArrowSquareOut,
  CheckCircle,
} from '@phosphor-icons/react';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-sent';
type RegisterStep = 'credentials' | 'confirm-email';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ForgotPasswordFormData {
  email: string;
}

interface AuthFormProps {
  className?: string;
  onSuccess?: () => void;
  defaultMode?: AuthMode;
  defaultRole?: 'tenant' | 'landlord' | 'agency';
  returnUrl?: string;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/**
 * «Al continuar, aceptas…» — debajo del botón principal y no al pie de la
 * pantalla (Nico, 2026-09-03): lo que uno acepta se lee junto a lo que uno
 * aprieta. Va en los dos formularios que crean o abren una sesión.
 */
function NotaLegal() {
  return (
    <p className="mt-4 text-[11.5px] leading-relaxed text-fg-subtle" data-testid="auth-nota-legal">
      Al continuar, aceptas nuestros{' '}
      <Link href="/terminos" className="text-fg-muted underline-offset-2 hover:text-fg hover:underline">
        Términos
      </Link>{' '}
      y la{' '}
      <Link href="/privacidad" className="text-fg-muted underline-offset-2 hover:text-fg hover:underline">
        Política de Privacidad
      </Link>
      .
    </p>
  );
}

/** Hairline divider with a mono technical label — DS signature. */
function MonoDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-border/70" />
      <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/70" />
    </div>
  );
}

/** Quiet Google auth button — hairline, 8px radius. */
function GoogleButton({ onClick, disabled, isLoading, children }: { onClick: () => void; disabled: boolean; isLoading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-border bg-surface text-[14px] font-medium text-fg shadow-[0_1px_2px_rgba(20,19,15,0.05)] transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-[0_6px_16px_-8px_rgba(20,19,15,0.25)] active:translate-y-0 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <SpinnerGap className="w-4 h-4 animate-spin text-fg-subtle" />
      ) : (
        <GoogleIcon className="w-4 h-4" />
      )}
      <span className="text-[13.5px] font-medium text-fg">{children}</span>
    </button>
  );
}

/**
 * Los motivos que `session-terminal.ts` puede mandar en `?reason=`. Un valor
 * desconocido (o inventado a mano en la URL) simplemente no muestra nada.
 */
const AVISOS_DE_SESION: Record<string, string> = {
  expirada: 'Tu sesión expiró. Vuelve a entrar para seguir donde estabas.',
  revocada: 'Cerramos esta sesión porque entraste desde otro dispositivo.',
  inactividad: 'Cerramos tu sesión por inactividad. Vuelve a entrar para continuar.',
};

/**
 * Aviso de por qué el usuario terminó acá sin pedirlo.
 *
 * Va en `warning` y no en `danger` a propósito: que se venza una sesión no es
 * un error del usuario ni una falla del sistema, es lo que tiene que pasar. El
 * rojo del ErrorBanner de abajo queda para lo que sí salió mal.
 */
function AvisoBanner({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3.5 py-2.5 rounded-lg bg-warning-soft border border-warning/30"
    >
      <p className="text-[12.5px] text-warning">{children}</p>
    </motion.div>
  );
}

/** Brand-critical error banner. */
function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3.5 py-2.5 rounded-lg bg-danger-soft border border-danger/30"
    >
      <p className="text-[12.5px] text-danger">{children}</p>
    </motion.div>
  );
}

/** El enlace de texto azul de esta pantalla («Crear cuenta», «Inicia sesión»…). */
const ENLACE = 'font-medium text-[#1A40FF] hover:underline underline-offset-2';

/**
 * «¿Quisiste decir nico@gmail.com?», debajo del campo de correo, cuando el
 * dominio parece un error de dedo («gmail.con», «hotmial.com»). Tocarlo
 * corrige el campo. En el registro además se ofrece «Está bien así», porque
 * ahí la sugerencia bloquea el envío hasta que la persona decida: con un
 * dominio equivocado el enlace de confirmación se va a ningún lado y nunca va
 * a poder entrar. En el login sólo se ofrece, sin bloquear.
 */
function SugerenciaDeCorreo({
  valor,
  aceptado,
  onUsar,
  onAceptar,
}: {
  valor: string | undefined;
  aceptado?: string | null;
  onUsar: (correo: string) => void;
  onAceptar?: () => void;
}) {
  const r = validarCorreo(valor ?? '');
  if (!r.sugerencia || (aceptado && aceptado === r.correo)) return null;
  const sugerencia = r.sugerencia;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" data-testid="sugerencia-de-correo">
      <button type="button" onClick={() => onUsar(sugerencia)} className="text-fg-muted transition-colors hover:text-fg">
        ¿Quisiste decir <span className="font-medium text-[#1A40FF]">{sugerencia}</span>?
      </button>
      {onAceptar && (
        <button
          type="button"
          onClick={onAceptar}
          className="text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
          data-testid="correo-esta-bien-asi"
        >
          Está bien así
        </button>
      )}
    </div>
  );
}

/**
 * Al salir del campo, el correo queda como se va a mandar: sin espacios y en
 * minúsculas. La persona ve lo mismo que Supabase va a guardar, y lo que
 * escriba después en el login coincide.
 */
function alSalirDelCorreo(leer: () => string, escribir: (correo: string) => void) {
  const escrito = leer() ?? '';
  const normalizado = normalizarCorreo(escrito);
  if (normalizado !== escrito) escribir(normalizado);
}

/** La regla de correo del login y de la recuperación: dice qué está mal, no bloquea por una sugerencia. */
const reglaDeCorreo = (valor: string) => {
  const r = validarCorreo(valor);
  return r.ok || r.motivo;
};

type EstadoDeReenvio = {
  estado: 'listo' | 'enviando' | 'enviado';
  /** Segundos hasta poder reenviar otra vez; Supabase limita a uno por minuto. */
  espera: number;
  error: string | null;
};

/**
 * «¿No te llegó? Reenviar el enlace», con su espera y su error. Lo usan la
 * pantalla de «Revisa tu correo» y el login cuando Supabase responde que el
 * correo no está confirmado: ahí es donde llega quien abrió un enlace vencido
 * (/auth/enlace lo manda a entrar), y sin esto no tenía cómo pedir otro.
 */
function ReenvioDeConfirmacion({
  reenvio,
  onReenviar,
  onCorregir,
}: {
  reenvio: EstadoDeReenvio;
  onReenviar: () => void;
  onCorregir?: () => void;
}) {
  return (
    <div className="space-y-1.5 text-[13px] text-fg-subtle" data-testid="reenvio-de-confirmacion">
      {reenvio.estado === 'enviado' ? (
        <p className="text-success" role="status">
          Listo, te lo reenviamos. Dale un minuto y revisa también spam.
        </p>
      ) : (
        <p>
          ¿No te llegó?{' '}
          <button
            type="button"
            onClick={onReenviar}
            disabled={reenvio.estado === 'enviando' || reenvio.espera > 0}
            className={cn(ENLACE, 'disabled:text-fg-subtle disabled:no-underline')}
            data-testid="reenviar-confirmacion"
          >
            {reenvio.estado === 'enviando'
              ? 'Reenviando…'
              : reenvio.espera > 0
                ? `Reenviar en ${reenvio.espera} s`
                : 'Reenviar el enlace'}
          </button>
        </p>
      )}
      {reenvio.error && (
        <p className="text-danger" role="alert">
          {reenvio.error}
        </p>
      )}
      {onCorregir && (
        <p>
          ¿Te equivocaste de correo?{' '}
          <button type="button" onClick={onCorregir} className={ENLACE} data-testid="corregir-correo">
            Corregirlo
          </button>
        </p>
      )}
    </div>
  );
}

export function AuthForm({ className, onSuccess, defaultMode, defaultRole, returnUrl: returnUrlProp }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resendSignUpEmail, sendPasswordReset, user, isAuthenticated, isLoading: authLoading, needsOnboarding, perfilElegido, mfaRequired, agencyRole, agencyMembershipChecked, hasActiveAgencyMembership } = useAuth();

  const [mode, setMode] = React.useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = React.useState<RegisterStep>('credentials');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetEmail, setResetEmail] = React.useState<string>('');
  /*
   * El correo que la persona confirmó «está bien así» aunque el dominio
   * parezca un error de dedo. Va en ref además de en estado porque la regla
   * de validación de react-hook-form lo lee en el momento de validar, y el
   * estado todavía no cambió cuando se dispara `trigger`.
   */
  const [correoAceptado, setCorreoAceptado] = React.useState<string | null>(null);
  const correoAceptadoRef = React.useRef<string | null>(null);
  const aceptarCorreoTalCual = (correo: string | null) => {
    correoAceptadoRef.current = correo;
    setCorreoAceptado(correo);
  };
  /** A dónde vuelve el enlace de confirmación; el reenvío tiene que usar el mismo. */
  const redirectDeConfirmacion = React.useRef<string | null>(null);
  const [reenvio, setReenvio] = React.useState<EstadoDeReenvio>({ estado: 'listo', espera: 0, error: null });
  /** El correo con el que intentó entrar y Supabase dijo «sin confirmar»: ahí se ofrece reenviar. */
  const [correoSinConfirmar, setCorreoSinConfirmar] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (reenvio.espera <= 0) return;
    const id = setTimeout(() => {
      setReenvio((r) => ({ ...r, espera: r.espera - 1, estado: r.espera - 1 === 0 ? 'listo' : r.estado }));
    }, 1000);
    return () => clearTimeout(id);
  }, [reenvio.espera]);
  // Only redirect when the user explicitly authenticated via THIS form in this session.
  // Without this guard, a pre-existing session would auto-redirect away from /auth,
  // preventing users from logging in as a different account.
  const didAuthenticateInForm = React.useRef(false);

  // Bounded fallback for the agency-membership-probe wait in the auto-redirect
  // effect below. An agency user's `agencyRole` is populated ASYNC by the probe,
  // so we hold the per-sub-role redirect until `agencyMembershipChecked` is true.
  // If the probe never settles, stop waiting after a few seconds and proceed
  // with whatever `agencyRole` is (defaulting to '/panel/inmobiliaria'). Mirrors
  // the pattern in src/app/onboarding/seleccionar-rol/page.tsx.
  const [probeWaitElapsed, setProbeWaitElapsed] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setProbeWaitElapsed(true), 4000);
    return () => clearTimeout(id);
  }, []);

  const returnUrl = sanitizeReturnUrl(returnUrlProp || searchParams.get('returnUrl'), '/');

  /*
   * Por qué está acá sin haberlo pedido. `terminarSesion` (session-terminal.ts)
   * manda el motivo en la URL al sacar a alguien de un panel que ya no puede
   * cargar nada; sin este cartel, el usuario aparece en el login sin ninguna
   * explicación y lo natural es pensar que la app se rompió.
   */
  const avisoDeSesion = AVISOS_DE_SESION[searchParams.get('reason') ?? ''] ?? null;
  /*
   * Llegar acá con sesión abierta no es un error: pasa cada vez que alguien
   * toca «Postularme» y la puerta lo manda a entrar. Antes veía un formulario
   * en blanco, sin señal de que ya estaba dentro y sin forma de continuar.
   * Se le pregunta con cuál cuenta sigue; `quiereOtraCuenta` es su respuesta.
   */
  const [quiereOtraCuenta, setQuiereOtraCuenta] = React.useState(false);

  // A fatal auth-bootstrap error (e.g. 409: this email already belongs to
  // another account) is handed over by auth-context via sessionStorage across
  // the forced sign-out redirect — surface it in the existing error banner.
  React.useEffect(() => {
    try {
      const message = sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY);
      if (message) {
        sessionStorage.removeItem(AUTH_BOOTSTRAP_ERROR_KEY);
        setError(message);
      }
    } catch {
      // sessionStorage unavailable — nothing to surface
    }
  }, []);

  // Redirigir automáticamente SOLO cuando el usuario inició sesión en este formulario
  React.useEffect(() => {
    if (!didAuthenticateInForm.current) return;
    if (authLoading) return;
    // MFA gate first (security): never bypass a pending second factor, regardless
    // of onboarding/returnUrl state (mirrors ProtectedRoute.tsx:127-130).
    if (mfaRequired) {
      window.location.href = '/auth/mfa-verify';
      return;
    }
    // Invitation flow: the /invitacion/[token] page handles needsOnboarding on its
    // own (it offers "complete registration" → /registro?invitationToken). Honor a
    // returnUrl pointing there BEFORE the generic onboarding redirect — otherwise an
    // invited user is sent to the "create agency" onboarding and the token is lost.
    if (returnUrl.startsWith('/invitacion/')) {
      window.location.href = returnUrl;
      return;
    }
    // JWT valid but backend has no user record yet → onboarding. Si ya había
    // elegido perfil antes de irse, directo a ese onboarding y no al selector.
    if (needsOnboarding) {
      window.location.href = rutaDeOnboarding(perfilElegido);
      return;
    }
    if (!isAuthenticated || !user) return;
    // Onboarding sin terminar: retomar donde lo dejó — el onboarding del
    // perfil que eligió, o el selector si nunca eligió (Nico, 2026-09-07).
    if (!user.onboardingCompleted) {
      window.location.href = rutaDeOnboarding(perfilElegido);
      return;
    }
    if (returnUrl && returnUrl !== '/') {
      window.location.href = returnUrl;
      return;
    }
    // No returnUrl — redirect to the correct panel based on role. For an agency
    // user, hold until the membership probe settles so `agencyRole` is resolved
    // and the per-sub-role landing route is used (otherwise it'd fall to the
    // default). The bounded `probeWaitElapsed` guarantees we never hang.
    // Non-agency users (tenant/landlord) redirect immediately as before.
    const isAgencyUser = user.role === 'agency' || hasActiveAgencyMembership;
    if (isAgencyUser && !agencyMembershipChecked && !probeWaitElapsed) return;
    window.location.href = getRoleHomeRoute(user.role, agencyRole);
  }, [isAuthenticated, user, authLoading, returnUrl, needsOnboarding, perfilElegido, mfaRequired, agencyRole, agencyMembershipChecked, hasActiveAgencyMembership, probeWaitElapsed]);
  // A caller may deep-link with the role already chosen — via the `defaultRole`
  // prop (e.g. the publish wizard) or a `?role=` query. When present, the
  // post-signup destination skips the picker and goes straight to that role's
  // onboarding. Without it, signup lands on /onboarding/seleccionar-rol (the
  // single profile picker).
  const explicitRole = (defaultRole || searchParams.get('role')) as 'tenant' | 'landlord' | 'agency' | null;
  const initialMode = defaultMode || searchParams.get('mode') as AuthMode | null;
  /** Para el botón «Abrir Gmail» de las pantallas de «Revisa tu correo»; null si el dominio no es conocido. */
  const webmail = webmailDelCorreo(resetEmail);

  const loginForm = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    defaultValues: { email: '' },
  });

  /*
   * Los tres campos de correo se registran acá y no dentro del JSX porque cada
   * uno envuelve el `onBlur` de react-hook-form con la normalización: hay que
   * llamar a los dos, y para eso hace falta tener el registro a mano.
   */
  const correoDeLogin = loginForm.register('email', { validate: reglaDeCorreo });
  const correoDeRegistro = registerForm.register('email', {
    validate: (valor) => {
      const r = validarCorreo(valor);
      if (!r.ok) return r.motivo;
      if (r.sugerencia && correoAceptadoRef.current !== r.correo) {
        return `Revisa el dominio: parece que quisiste escribir ${r.sugerencia}.`;
      }
      return true;
    },
  });
  const correoDeRecuperacion = forgotPasswordForm.register('email', { validate: reglaDeCorreo });
  const contrasenaDeRegistro = registerForm.register('password', {
    required: 'La contraseña es requerida',
    validate: (valor) =>
      fortalezaDeContrasena(valor, { correo: registerForm.getValues('email') }).cumpleMinimo ||
      'Todavía es débil: sigue el consejo de abajo.',
  });
  const contrasenaEscrita = registerForm.watch('password') ?? '';
  const correoEscritoEnRegistro = registerForm.watch('email') ?? '';

  React.useEffect(() => {
    if (initialMode === 'register' || explicitRole) {
      setMode('register');
    }
  }, [initialMode, explicitRole]);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setRegisterStep('credentials');
    setError(null);
    aceptarCorreoTalCual(null);
    setReenvio({ estado: 'listo', espera: 0, error: null });
    setCorreoSinConfirmar(null);
    loginForm.reset();
    registerForm.reset();
    forgotPasswordForm.reset();
  };

  // Role → onboarding entry point (the map lives in perfil-de-onboarding.ts).
  // The profile *picker* itself is /onboarding/seleccionar-rol; this only
  // resolves the deep-link destination when a caller already knows the role.
  const getOnboardingHref = (role: 'tenant' | 'landlord' | 'agency') => {
    const href = rutaDeOnboarding(role);
    return returnUrl && returnUrl !== '/'
      ? `${href}?returnUrl=${encodeURIComponent(returnUrl)}`
      : href;
  };

  // Where signup should land: an explicit deep-link role goes straight to that
  // role's onboarding (carrying returnUrl forward); otherwise the single
  // profile picker at /onboarding/seleccionar-rol.
  const onboardingDest = () =>
    explicitRole ? getOnboardingHref(explicitRole) : rutaDeOnboarding(null);

  // Preserve context on the email-confirmation link so it returns through
  // /auth/callback (which exchanges the code server-side and honors returnUrl)
  // instead of Supabase's default Site URL (the root "/"), which would drop the
  // invitation/onboarding context and land the user as a bare TENANT.
  const enlaceDeConfirmacion = () => {
    const dest = returnUrl && returnUrl !== '/' ? returnUrl : onboardingDest();
    return `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(dest)}`;
  };

  // Redirect to the correct dashboard based on user role
  const redirectAfterLogin = React.useCallback((role: string | undefined) => {
    if (returnUrl && returnUrl !== '/') {
      router.push(returnUrl);
      return;
    }
    router.push(getRoleHomeRoute(role, agencyRole));
  }, [returnUrl, router, agencyRole]);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      didAuthenticateInForm.current = true;
      await signInWithGoogle();
      onSuccess?.();
    } catch {
      didAuthenticateInForm.current = false;
      setError('Error con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setCorreoSinConfirmar(null);
    const correo = normalizarCorreo(data.email);
    try {
      didAuthenticateInForm.current = true;
      const userData = await signInWithEmail(correo, data.password);
      if (!userData) {
        // Supabase accepted the credentials but the profile bootstrap failed
        // WITHOUT throwing (e.g. 409 duplicate identity: fetchUser stored the
        // backend message in sessionStorage and signed the session out).
        // Surface it inline here — the mount-only reader above already ran
        // before this attempt, so it cannot cover this path.
        didAuthenticateInForm.current = false;
        let message: string | null = null;
        try {
          message = sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY);
          if (message) sessionStorage.removeItem(AUTH_BOOTSTRAP_ERROR_KEY);
        } catch {}
        setError(message || 'Error al iniciar sesión. Intenta de nuevo.');
        return;
      }
      onSuccess?.();
      // El useEffect de arriba se encargará de la redirección al detectar el cambio de auth
    } catch (err: unknown) {
      didAuthenticateInForm.current = false;
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Correo o contraseña incorrectos.');
      } else if (msg.includes('Email not confirmed')) {
        // Acá llega quien abrió un enlace de confirmación vencido: /auth/enlace
        // lo manda a entrar. Sin el reenvío no tenía cómo pedir otro.
        setResetEmail(correo);
        redirectDeConfirmacion.current = enlaceDeConfirmacion();
        setReenvio({ estado: 'listo', espera: 0, error: null });
        setCorreoSinConfirmar(correo);
        setError('Tu correo todavía no está confirmado. Busca el enlace en tu bandeja (y en spam) o pide uno nuevo.');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      didAuthenticateInForm.current = true;
      await signInWithGoogle();
      onSuccess?.();
    } catch {
      didAuthenticateInForm.current = false;
      setError('Error con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const emailRedirectTo = enlaceDeConfirmacion();
      // Persist the deep-linked role (if any) as intended_role on the Supabase
      // user. Without a deep-link the user picks their role at
      // /onboarding/seleccionar-rol, so this is `undefined` here.
      // Lo que se registra es lo que después se escribe al entrar: sin
      // espacios y en minúsculas, o «Nico@Gmail.com » y «nico@gmail.com» son
      // dos personas para quien lo mira sin saber.
      const correo = normalizarCorreo(data.email);
      redirectDeConfirmacion.current = emailRedirectTo;
      const { requiresConfirmation } = await signUpWithEmail(correo, data.password, emailRedirectTo, explicitRole ?? undefined);
      if (requiresConfirmation) {
        setResetEmail(correo);
        setReenvio({ estado: 'listo', espera: 0, error: null });
        setRegisterStep('confirm-email');
      } else {
        // Auto-confirmed — go straight to onboarding (or the deep-link role's onboarding)
        router.push(onboardingDest());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('Este correo ya está registrado. Inicia sesión en su lugar.');
      } else if (msg.includes('Password should be')) {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * «¿No te llegó? Reenviar»: la única salida que tenía la pantalla era «Ir a
   * iniciar sesión», que con el correo sin confirmar sólo da error. Supabase
   * acepta un reenvío por minuto; la espera se muestra en el propio enlace.
   */
  const reenviarConfirmacion = async () => {
    setReenvio({ estado: 'enviando', espera: 0, error: null });
    try {
      await resendSignUpEmail(resetEmail, redirectDeConfirmacion.current ?? undefined);
      setReenvio({ estado: 'enviado', espera: 60, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const limite = msg.includes('rate') || msg.includes('over_email') || msg.includes('security purposes');
      setReenvio({
        estado: 'listo',
        espera: limite ? 60 : 0,
        error: limite
          ? 'Ya se envió uno hace poco. Espera un minuto y revisa spam antes de pedir otro.'
          : 'No se pudo reenviar. Intenta de nuevo en un momento.',
      });
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const correo = normalizarCorreo(data.email);
      await sendPasswordReset(correo);
      setResetEmail(correo);
      setMode('reset-sent');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('over_email')) {
        setError('Límite de envíos alcanzado. Espera unos minutos e intenta de nuevo.');
      } else {
        setError('Ocurrió un error. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * Sesión ya abierta: se pregunta antes de nada.
   *
   * `didAuthenticateInForm` distingue quien acaba de entrar acá —a ese lo
   * redirige el efecto de arriba— de quien LLEGÓ con sesión. Al segundo se le
   * ofrecen las dos salidas en vez de mostrarle un formulario vacío.
   *
   * Sólo cuando venía a hacer algo (`returnUrl`): entrar a /auth sin destino
   * es otra cosa y no se toca.
   */
  if (
    !authLoading &&
    isAuthenticated &&
    user &&
    !didAuthenticateInForm.current &&
    !quiereOtraCuenta &&
    returnUrl &&
    returnUrl !== '/'
  ) {
    return (
      <div className={cn('w-full', className)}>
        <SesionYaAbierta destino={returnUrl} onCambiarDeCuenta={() => setQuiereOtraCuenta(true)} />
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Header — left-aligned, quiet hierarchy. `lg:pr-12`: la ✕ de la
          tarjeta vive en esta misma fila, a la derecha. */}
      <div className="mb-7 lg:pr-12">
        {(mode === 'forgot-password' || mode === 'reset-sent') && (
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className="inline-flex items-center gap-2 text-[13px] text-fg-subtle hover:text-fg transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        )}

        {(mode === 'reset-sent' || (mode === 'register' && registerStep === 'confirm-email')) && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-10 h-10 mb-5 rounded-xl bg-success-soft flex items-center justify-center"
          >
            <CheckCircle className="w-5 h-5 text-success" weight="fill" />
          </motion.div>
        )}

        {/* Sin eyebrow («● ACCESO»): el título ya dice qué es (Nico, 2026-09-03). */}
        <h1 className="font-heading text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-fg">
          {mode === 'login' && 'Bienvenido de vuelta'}
          {mode === 'register' && registerStep === 'credentials' && 'Crea tu cuenta'}
          {mode === 'register' && registerStep === 'confirm-email' && 'Revisa tu correo'}
          {mode === 'forgot-password' && 'Recupera tu contraseña'}
          {mode === 'reset-sent' && 'Revisa tu correo'}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-subtle">
          {mode === 'login' && 'Ingresa a tu cuenta para continuar.'}
          {mode === 'register' && registerStep === 'credentials' && 'Ingresa tus datos para continuar.'}
          {mode === 'register' && registerStep === 'confirm-email' && (
            <>Enviamos un enlace de confirmación a <span className="font-medium text-fg-muted">{resetEmail}</span>.</>
          )}
          {mode === 'forgot-password' && 'Te enviaremos un enlace para restablecer tu contraseña.'}
          {mode === 'reset-sent' && (
            <>Enviamos un enlace de recuperación a <span className="font-medium text-fg-muted">{resetEmail}</span>.</>
          )}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Login ─────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <GoogleButton onClick={handleGoogleLogin} disabled={isLoading} isLoading={isLoading}>
              {isLoading ? 'Conectando...' : 'Continuar con Google'}
            </GoogleButton>

            <MonoDivider>o con email</MonoDivider>

            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <AuthInput
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  {...correoDeLogin}
                  onBlur={(e) => {
                    void correoDeLogin.onBlur(e);
                    alSalirDelCorreo(
                      () => loginForm.getValues('email'),
                      (correo) => loginForm.setValue('email', correo, { shouldValidate: true }),
                    );
                  }}
                  error={loginForm.formState.errors.email?.message}
                />
                <SugerenciaDeCorreo
                  valor={loginForm.watch('email')}
                  onUsar={(correo) => loginForm.setValue('email', correo, { shouldValidate: true })}
                />
              </div>
              <div className="space-y-1.5">
                <AuthInput
                  label="Contraseña"
                  type="password"
                  placeholder="Tu contraseña"
                  {...loginForm.register('password', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                  error={loginForm.formState.errors.password?.message}
                />
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('forgot-password')}
                    className="text-[12.5px] text-fg-subtle hover:text-fg transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>
              {avisoDeSesion && !error && <AvisoBanner>{avisoDeSesion}</AvisoBanner>}
              {error && <ErrorBanner>{error}</ErrorBanner>}
              {error && correoSinConfirmar && (
                <ReenvioDeConfirmacion reenvio={reenvio} onReenviar={reenviarConfirmacion} />
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-full text-[14px] shadow-[0_12px_32px_-12px_rgba(26,64,255,0.65)] transition-all hover:-translate-y-px hover:shadow-[0_16px_40px_-12px_rgba(26,64,255,0.7)] active:translate-y-0 active:scale-[0.995]"
              >
                {isLoading ? (
                  <>
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </form>

            <NotaLegal />

            <p className="mt-6 border-t border-border/70 pt-5 text-[13px] text-fg-subtle">
              ¿Todavía no tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className="font-medium text-[#1A40FF] hover:underline underline-offset-2"
              >
                Crear cuenta
              </button>
            </p>
          </motion.div>
        )}

        {/* ── Register: Credentials ──────────────────────────────────────── */}
        {mode === 'register' && registerStep === 'credentials' && (
          <motion.div
            key="register-credentials"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <GoogleButton onClick={handleGoogleRegister} disabled={isLoading} isLoading={isLoading}>
              Registrarse con Google
            </GoogleButton>

            <MonoDivider>o con tu email</MonoDivider>

            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <AuthInput
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  {...correoDeRegistro}
                  onBlur={(e) => {
                    void correoDeRegistro.onBlur(e);
                    alSalirDelCorreo(
                      () => registerForm.getValues('email'),
                      (correo) => registerForm.setValue('email', correo, { shouldValidate: true }),
                    );
                  }}
                  error={registerForm.formState.errors.email?.message}
                />
                <SugerenciaDeCorreo
                  valor={correoEscritoEnRegistro}
                  aceptado={correoAceptado}
                  onUsar={(correo) => {
                    aceptarCorreoTalCual(null);
                    registerForm.setValue('email', correo, { shouldValidate: true });
                  }}
                  onAceptar={() => {
                    aceptarCorreoTalCual(validarCorreo(registerForm.getValues('email')).correo);
                    void registerForm.trigger('email');
                  }}
                />
              </div>
              <div className="space-y-2">
                <AuthInput
                  label="Contraseña"
                  type="password"
                  isNewPassword
                  placeholder="Mínimo 8 caracteres"
                  {...contrasenaDeRegistro}
                  error={registerForm.formState.errors.password?.message}
                />
                {/* Las cinco barras: rojo, naranja, verde (Nico, 2026-09-07). */}
                <MedidorDeContrasena contrasena={contrasenaEscrita} correo={correoEscritoEnRegistro} />
              </div>
              <AuthInput
                label="Confirmar contraseña"
                type="password"
                isNewPassword
                placeholder="Repite tu contraseña"
                {...registerForm.register('confirmPassword', {
                  required: 'Confirma tu contraseña',
                  validate: (val) => val === registerForm.watch('password') || 'Las contraseñas no coinciden',
                })}
                error={registerForm.formState.errors.confirmPassword?.message}
              />
              {avisoDeSesion && !error && <AvisoBanner>{avisoDeSesion}</AvisoBanner>}
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-full text-[14px] shadow-[0_12px_32px_-12px_rgba(26,64,255,0.65)] transition-all hover:-translate-y-px hover:shadow-[0_16px_40px_-12px_rgba(26,64,255,0.7)] active:translate-y-0 active:scale-[0.995]">
                {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Creando cuenta...</>) : 'Crear cuenta'}
              </Button>
            </form>

            <NotaLegal />

            <p className="mt-6 border-t border-border/70 pt-5 text-[13px] text-fg-subtle">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className="font-medium text-[#1A40FF] hover:underline underline-offset-2"
              >
                Inicia sesión
              </button>
            </p>
          </motion.div>
        )}

        {/* ── Register: Confirm email ────────────────────────────────────── */}
        {mode === 'register' && registerStep === 'confirm-email' && (
          <motion.div
            key="confirm-email"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            {/*
              Acá había «Vuelve aquí e inicia sesión» y un botón «Ir a iniciar
              sesión» (Nico, 2026-09-07: «¿para qué, si debe ir al correo?»).
              Estaba mal: el enlace del correo vuelve por /auth/callback ya
              con la sesión abierta, así que el paso 3 no existe, y el botón
              llevaba a un login que con el correo sin confirmar sólo puede dar
              error. Lo que sí sirve: abrir el correo, reenviar el enlace si no
              llegó y corregir la dirección si se escribió mal. «Inicia sesión»
              queda abajo, chiquito, para quien confirmó desde el celular: en
              ESTE navegador no quedó sesión y ahí sí toca entrar.
            */}
            <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
                Próximos pasos
              </span>
              <ol className="text-[12.5px] text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Abre el correo que te enviamos (revisa también spam)</li>
                <li>Toca el enlace de confirmación: te trae de vuelta acá con la sesión ya abierta</li>
              </ol>
            </div>
            {webmail && (
              <Button asChild hideArrow className="w-full h-11 rounded-full text-[14px]">
                <a href={webmail.url} target="_blank" rel="noopener noreferrer" data-testid="abrir-correo">
                  Abrir {webmail.nombre}
                  <ArrowSquareOut className="ml-2 h-4 w-4" weight="bold" aria-hidden="true" />
                </a>
              </Button>
            )}
            <ReenvioDeConfirmacion
              reenvio={reenvio}
              onReenviar={reenviarConfirmacion}
              onCorregir={() => {
                setError(null);
                setRegisterStep('credentials');
              }}
            />
            <p className="mt-6 border-t border-border/70 pt-5 text-[13px] text-fg-subtle">
              ¿Ya confirmaste desde otro dispositivo?{' '}
              <button type="button" onClick={() => handleModeSwitch('login')} className={ENLACE}>
                Inicia sesión
              </button>
            </p>
          </motion.div>
        )}

        {/* ── Forgot Password ────────────────────────────────────────────── */}
        {mode === 'forgot-password' && (
          <motion.form
            key="forgot-password"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <AuthInput
                label="Email"
                type="email"
                placeholder="tu@email.com"
                {...correoDeRecuperacion}
                onBlur={(e) => {
                  void correoDeRecuperacion.onBlur(e);
                  alSalirDelCorreo(
                    () => forgotPasswordForm.getValues('email'),
                    (correo) => forgotPasswordForm.setValue('email', correo, { shouldValidate: true }),
                  );
                }}
                error={forgotPasswordForm.formState.errors.email?.message}
              />
              <SugerenciaDeCorreo
                valor={forgotPasswordForm.watch('email')}
                onUsar={(correo) => forgotPasswordForm.setValue('email', correo, { shouldValidate: true })}
              />
            </div>
            {avisoDeSesion && !error && <AvisoBanner>{avisoDeSesion}</AvisoBanner>}
              {error && <ErrorBanner>{error}</ErrorBanner>}
            <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-full text-[14px]">
              {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : 'Enviar enlace de recuperación'}
            </Button>
            <p className="text-[12px] text-fg-subtle leading-relaxed">
              Ingresa el email asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </motion.form>
        )}

        {/* ── Reset Email Sent ───────────────────────────────────────────── */}
        {mode === 'reset-sent' && (
          <motion.div
            key="reset-sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
                Próximos pasos
              </span>
              <ol className="text-[12.5px] text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Abre el correo que te enviamos (revisa también spam)</li>
                <li>Toca el enlace del correo</li>
                <li>Crea tu nueva contraseña</li>
              </ol>
            </div>
            {/* Mismo criterio que en el registro: lo útil es abrir el correo,
                no volver a un login al que todavía no se puede entrar. La
                flecha de arriba ya lleva de vuelta. */}
            {webmail && (
              <Button asChild hideArrow className="w-full h-11 rounded-full text-[14px]">
                <a href={webmail.url} target="_blank" rel="noopener noreferrer" data-testid="abrir-correo">
                  Abrir {webmail.nombre}
                  <ArrowSquareOut className="ml-2 h-4 w-4" weight="bold" aria-hidden="true" />
                </a>
              </Button>
            )}
            <p className="text-[13px] text-fg-subtle">
              ¿No recibiste el correo?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('forgot-password')}
                className="font-medium text-[#1A40FF] hover:underline underline-offset-2"
              >
                Reenviar enlace
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
