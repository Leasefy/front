'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { CrossFade, Presence, motionScale, motionSpring } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { AuthInput } from './AuthInput';
import { useAuth } from '@/lib/auth/use-auth';
import { urlDeRegresoDelRegistro } from '@/lib/auth/regreso-del-correo';
import { AUTH_BOOTSTRAP_ERROR_KEY } from '@/lib/auth/auth-context';
import { rutaDeOnboarding } from '@/lib/auth/perfil-de-onboarding';
import { tomarAvisoDeCierre, PARAM_MOTIVO, type MotivoDeCierre } from '@/lib/auth/session-terminal';
import { getRoleHomeRoute } from '@/lib/auth/role-routes';
import { cn, sanitizeReturnUrl } from '@/lib/utils';
import { rutaAlSegundoFactor } from '@/lib/auth/regreso-tras-el-segundo-factor';
import { SesionYaAbierta, type MotivoDelCambioDeCuenta } from './SesionYaAbierta';
import { NoPudimosConfirmarTuSesion } from './NoPudimosConfirmarTuSesion';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { MedidorDeContrasena } from './MedidorDeContrasena';
import { normalizarCorreo, validarCorreo, webmailDelCorreo } from '@/lib/auth/correo';
import { fortalezaDeContrasena } from '@/lib/auth/fortaleza-de-contrasena';
import { limpiarCredencialesDeLaUrl } from '@/lib/auth/credenciales-en-la-url';
import { useHidratado } from '@/lib/hooks/use-hidratado';
import { correoTieneCuentaApi } from '@/lib/api/correo-tiene-cuenta.service';
import { codigoDeSupabase, leerErrorDeSupabase, mensajeDeSupabase } from '@/lib/auth/errores-de-supabase';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
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
 * aprieta. Sólo al CREAR la cuenta (Nico, 07-10): quien inicia sesión ya los
 * aceptó al registrarse.
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
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-border bg-surface text-[14px] font-medium text-fg shadow-[0_1px_2px_rgba(20,19,15,0.05)] transition-[transform,box-shadow,border-color] duration-fast ease-standard hover:-translate-y-px hover:border-border-strong hover:shadow-[0_6px_16px_-8px_rgba(20,19,15,0.25)] active:translate-y-0 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-50"
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
  'contrasena-actualizada': 'Tu contraseña quedó actualizada. Inicia sesión con la nueva.',
};

/** Avisos que confirman algo que salió bien: van en verde, no en ámbar. */
const AVISOS_DE_CONFIRMACION = new Set(['contrasena-actualizada']);

/**
 * Aviso de por qué el usuario terminó acá sin pedirlo.
 *
 * Va en `warning` y no en `danger` a propósito: que se venza una sesión no es
 * un error del usuario ni una falla del sistema, es lo que tiene que pasar. El
 * rojo del ErrorBanner de abajo queda para lo que sí salió mal.
 */
function AvisoBanner({ mensaje, confirmacion = false }: { mensaje: string | null; confirmacion?: boolean }) {
  const texto = useUltimoTexto(mensaje);
  // `Presence`: entra subiendo 8 px y, cuando la persona vuelve a intentar,
  // SALE acelerando en vez de cortarse. `initial={false}`: si ya viene puesto
  // al montar no arranca invisible.
  return (
    <Presence show={Boolean(mensaje)} initial={false}>
      <div
        role="status"
        data-testid="aviso-de-sesion"
        className={confirmacion
          ? 'px-3.5 py-2.5 rounded-lg bg-success-soft border border-success/30'
          : 'px-3.5 py-2.5 rounded-lg bg-warning-soft border border-warning/30'}
      >
        <p className={confirmacion ? 'text-[12.5px] text-success' : 'text-[12.5px] text-warning'}>{texto}</p>
      </div>
    </Presence>
  );
}

/** Brand-critical error banner. Entra y sale con `Presence` (ver `AvisoBanner`). */
function ErrorBanner({ mensaje }: { mensaje: string | null }) {
  const texto = useUltimoTexto(mensaje);
  return (
    <Presence show={Boolean(mensaje)} initial={false}>
      <div className="px-3.5 py-2.5 rounded-lg bg-danger-soft border border-danger/30">
        <p className="text-[12.5px] text-danger">{texto}</p>
      </div>
    </Presence>
  );
}

/**
 * El último texto no vacío. Mientras un aviso SALE sigue diciendo lo que
 * decía; sin esto se vaciaba en plena salida y se encogía antes de irse.
 */
function useUltimoTexto(texto: string | null): string | null {
  const [ultimo, setUltimo] = React.useState(texto);
  if (texto && texto !== ultimo) setUltimo(texto);
  return texto || ultimo;
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
  const visible = Boolean(r.sugerencia) && !(aceptado && aceptado === r.correo);
  // Mientras sale, sigue diciendo la última sugerencia (no se vacía).
  const sugerencia = useUltimoTexto(visible ? r.sugerencia ?? null : null) ?? '';
  // Aparece y se va con `Presence` (4 px): se escribe letra a letra, así que
  // no puede saltar al ritmo del teclado.
  return (
    <Presence show={visible} distance="xs" initial={false}>
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
    </Presence>
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
  /** Ya se reenvió el máximo: no se ofrece otro (`MAXIMO_DE_REENVIOS`). */
  agotado?: boolean;
};

/**
 * 🔴 El freno de «Reenviar» (Nico, 01-10: «¿tienes algo para cuando reenvían
 * muchas veces, que paren, para que no saturen la API ni nos hagan perder
 * dinero?»). Antes: un reenvío por minuto, para siempre. Ahora la espera
 * crece (1, 2, 5 y 10 minutos) y a los cuatro reenvíos del mismo correo se
 * deja de ofrecer: si cuatro enlaces no llegaron, un quinto tampoco, y lo que
 * sirve es escribirnos. Se cuenta por correo en `sessionStorage`, así que
 * recargar no reinicia la cuenta. Supabase tiene además su propio tope por
 * correo y por proyecto; esto es la primera barrera, no la única.
 */
const ESPERAS_DE_REENVIO_S = [60, 120, 300, 600] as const;
export const MAXIMO_DE_REENVIOS = ESPERAS_DE_REENVIO_S.length;
const claveDeReenvios = (correo: string) => `leasefy:reenvios:${correo}`;

function reenviosHechos(correo: string): number {
  try {
    return Number(window.sessionStorage.getItem(claveDeReenvios(correo))) || 0;
  } catch {
    return 0;
  }
}

function anotarReenvio(correo: string): number {
  const n = reenviosHechos(correo) + 1;
  try {
    window.sessionStorage.setItem(claveDeReenvios(correo), String(n));
  } catch {
    // Sin almacenamiento: el freno vale mientras la pantalla siga abierta.
  }
  return n;
}

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
      {/* «¿No te llegó?» → «Listo, te lo reenviamos» (o el tope): se cruzan,
          no se reemplazan de golpe. La cuenta regresiva del botón NO entra
          acá: cambia cada segundo y no es un cambio de estado. */}
      <CrossFade
        swapKey={reenvio.agotado ? 'agotado' : reenvio.estado === 'enviado' ? 'enviado' : 'ofrecer'}
      >
      {reenvio.agotado ? (
        <p data-testid="reenvio-agotado">
          Ya te enviamos {MAXIMO_DE_REENVIOS} enlaces. Si no aparecen en tu bandeja ni en spam, escríbenos a{' '}
          <a href="mailto:hola@leasefy.co" className={ENLACE}>
            hola@leasefy.co
          </a>{' '}
          y lo revisamos.
        </p>
      ) : reenvio.estado === 'enviado' ? (
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
                ? `Reenviar en ${reenvio.espera >= 60 ? `${Math.floor(reenvio.espera / 60)}:${String(reenvio.espera % 60).padStart(2, '0')}` : `${reenvio.espera} s`}`
                : 'Reenviar el enlace'}
          </button>
        </p>
      )}
      </CrossFade>
      <ErrorDelCampo id="reenvio-de-confirmacion-error" mensaje={reenvio.error} className="mt-0" />
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

/** Lo que dice el login cuando el error no se reconoce (nunca el inglés de Supabase). */
const POR_DEFECTO_AL_ENTRAR = 'Error al iniciar sesión. Intenta de nuevo.';

/**
 * Los errores de Supabase al crear la cuenta que son de UN campo: van debajo
 * de él, no al banner. La contraseña se dice con lo que Supabase explicó
 * (`weak_password` trae por qué: corta, sin variedad o filtrada).
 */
function campoDelErrorDeRegistro(codigo: string | undefined): 'email' | 'password' | null {
  if (codigo === 'weak_password') return 'password';
  if (codigo === 'email_address_invalid') return 'email';
  return null;
}

/** ¿Supabase frenó el envío de correos (por código o por un 429)? */
function esLimiteDeEnvios(err: unknown): boolean {
  const { status, codigo } = leerErrorDeSupabase(err);
  return codigo === 'over_email_send_rate_limit' || codigo === 'over_request_rate_limit' || status === 429;
}

/** Google: «conexión» sólo sin respuesta; lo demás, la frase de siempre. */
function errorDeGoogle(err: unknown): string {
  return mensajeDeSupabase(err, {
    porDefecto: 'Error con Google. Intenta de nuevo.',
    accion: 'conectarte con Google',
  });
}

export function AuthForm({ className, onSuccess, defaultMode, defaultRole, returnUrl: returnUrlProp }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resendSignUpEmail, sendPasswordReset, signOut, user, isAuthenticated, isLoading: authLoading, needsOnboarding, perfilElegido, mfaRequired, mfaEnrollRequired, mfaCheckStatus, agencyRole, agencyMembershipChecked, hasActiveAgencyMembership, confirmacionDeLaSesion } = useAuth();

  /*
   * 🔴 Sin esto el correo y la contraseña terminaban en la URL (prueba en vivo,
   * 2026-09-16). El servidor manda el formulario antes que el JavaScript; si la
   * persona toca «Iniciar sesión» en ese hueco, no hay `onSubmit` que lo
   * ataje y el navegador lo envía solo, como GET a esta misma dirección. Los
   * tres formularios de acá van con `method="post"` —que un envío nativo, si
   * llegara a pasar, lleve los campos en el cuerpo y no en la barra— y con el
   * botón apagado hasta que React hidrata, que es lo que de verdad lo impide:
   * con el botón por defecto deshabilitado, ni el clic ni el Enter envían.
   */
  const hidratado = useHidratado();
  /*
   * Y si ya se llegó con una de esas URL (historial, pestaña restaurada), la
   * contraseña se saca de la barra al montar, antes que ningún otro efecto, y
   * no se lee: ni se precarga ni se intenta entrar con ella.
   */
  React.useEffect(() => {
    limpiarCredencialesDeLaUrl();
  }, []);

  const [mode, setMode] = React.useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = React.useState<RegisterStep>('credentials');
  const [isLoading, setIsLoading] = React.useState(false);
  // Qué botón carga: el de Google sólo dice «Conectando…» si se tocó él; mientras
  // entra con el correo, Google queda apagado sin girar (Nico, 07-10).
  const [conGoogle, setConGoogle] = React.useState(false);
  React.useEffect(() => {
    if (!isLoading) setConGoogle(false);
  }, [isLoading]);
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
  /**
   * El correo con el que intentó entrar y el back confirmó que NO tiene cuenta:
   * ahí se ofrece crearla con ese mismo correo (Nico, 01-10).
   */
  const [correoSinCuenta, setCorreoSinCuenta] = React.useState<string | null>(null);
  /** Se intentó registrar un correo que ya tiene cuenta: se ofrece entrar con él. */
  const [correoYaRegistrado, setCorreoYaRegistrado] = React.useState<string | null>(null);
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
   * saca a alguien de un panel que ya no puede cargar nada; sin este cartel, el
   * usuario aparece en el login sin ninguna explicación y lo natural es pensar
   * que la app se rompió.
   *
   * 🔴 Pero el cartel se decidía SÓLO por `?reason=` en la URL, y una URL no
   * caduca: quedaba en el historial, en un marcador y en la pestaña que el
   * navegador restaura. Nico (2026-09-08) lo vio anunciando una expiración
   * mientras ya estaba entrando de nuevo. Ahora el motivo lo entrega
   * `tomarAvisoDeCierre`, que sólo lo devuelve si el cierre pasó de verdad
   * —lo escribió `terminarSesion` hace menos de un minuto— y lo consume: una
   * recarga no lo repite. El parámetro se limpia de la URL por lo mismo.
   */
  const [motivoDeCierre, setMotivoDeCierre] = React.useState<MotivoDeCierre | null>(null);
  React.useEffect(() => {
    const motivo = tomarAvisoDeCierre(searchParams.get(PARAM_MOTIVO));
    setMotivoDeCierre(motivo);

    if (typeof window === 'undefined') return;
    if (!searchParams.get(PARAM_MOTIVO)) return;
    // `replaceState` y no el router: cambiar la URL con `router.replace`
    // remonta el árbol y con él este formulario, borrando lo que la persona
    // esté tipeando. Acá sólo hay que sacar un parámetro de la barra.
    const limpia = new URL(window.location.href);
    limpia.searchParams.delete(PARAM_MOTIVO);
    window.history.replaceState(window.history.state, '', `${limpia.pathname}${limpia.search}${limpia.hash}`);
    // Sólo al montar: el aviso es de UNA vez y ya se consumió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /**
   * En cuanto la persona vuelve a entrar, el aviso dejó de ser cierto: lo que
   * está pasando ahora es el ingreso, no el cierre de hace un minuto.
   */
  const olvidarAviso = React.useCallback(() => setMotivoDeCierre(null), []);
  const avisoDeSesion = motivoDeCierre ? AVISOS_DE_SESION[motivoDeCierre] ?? null : null;
  const avisoDeConfirmacion = !!motivoDeCierre && AVISOS_DE_CONFIRMACION.has(motivoDeCierre);
  /*
   * Llegar acá con sesión abierta no es un error: pasa cada vez que alguien
   * toca «Postularme» y la puerta lo manda a entrar. Antes veía un formulario
   * en blanco, sin señal de que ya estaba dentro y sin forma de continuar.
   * Se le pregunta con cuál cuenta sigue; `quiereOtraCuenta` es su respuesta.
   */
  const [quiereOtraCuenta, setQuiereOtraCuenta] = React.useState(false);
  /*
   * 🔴 LOGIN-BUCLE (06-10-2026): «Continuar» de `SesionYaAbierta` puede
   * descubrir que la sesión ya no servía (token vencido y la renovación falló
   * de verdad). Entonces se pasa al formulario CON el porqué, el mismo aviso de
   * «tu sesión expiró» de siempre.
   */
  const alCambiarDeCuenta = React.useCallback((motivo?: MotivoDelCambioDeCuenta) => {
    setQuiereOtraCuenta(true);
    if (motivo === 'sesion-vencida') setMotivoDeCierre('expirada');
  }, []);
  const [saliendoDeLaEspera, setSaliendoDeLaEspera] = React.useState(false);
  /** «Entrar con otra cuenta» mientras se revisa la sesión guardada. */
  const entrarConOtraDesdeLaEspera = async () => {
    setSaliendoDeLaEspera(true);
    try {
      await signOut();
    } finally {
      setSaliendoDeLaEspera(false);
      setQuiereOtraCuenta(true);
    }
  };

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
    // Nico, 02-10-2026: sin el veredicto del segundo factor no se navega a
    // ningún lado. `failed` pinta «No pudimos confirmar tu sesión» abajo.
    if (mfaCheckStatus === 'pending' || mfaCheckStatus === 'failed') return;
    // MFA gate first (security): never bypass a pending second factor, regardless
    // of onboarding/returnUrl state (mirrors ProtectedRoute.tsx:127-130).
    // T-0099: enroll-pending (no factor to step up to) takes priority over
    // verify-pending, same order as ProtectedRoute.
    if (mfaEnrollRequired) {
      window.location.href = '/auth/mfa-enroll';
      return;
    }
    if (mfaRequired) {
      // El destino viaja con el segundo factor (QA 23-09): si no, tras el
      // código la persona caía en el inicio y no en lo que vino a hacer.
      window.location.href = rutaAlSegundoFactor(returnUrl);
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
      // 🟡 BU-06 (04-10-2026): la asesora (miembro INVITADO, su registro es el
      // de la inmobiliaria: «onboarding una vez por inmobiliaria») pasaba un
      // instante por /onboarding/seleccionar-rol antes del panel. Mismo criterio
      // que `ProtectedRoute`: un miembro activo de una inmobiliaria no hace el
      // onboarding personal; se espera la membresía y sigue a su panel (si el
      // registro de la inmobiliaria está a medias, el candado del panel lo lleva).
      const deUnaInmobiliaria = user.role === 'agency' || user.backendRole === 'AGENT';
      if (deUnaInmobiliaria && !agencyMembershipChecked && !probeWaitElapsed) return;
      if (!(deUnaInmobiliaria && hasActiveAgencyMembership)) {
        window.location.href = rutaDeOnboarding(perfilElegido);
        return;
      }
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
  }, [isAuthenticated, user, authLoading, returnUrl, needsOnboarding, perfilElegido, mfaRequired, mfaEnrollRequired, mfaCheckStatus, agencyRole, agencyMembershipChecked, hasActiveAgencyMembership, probeWaitElapsed]);
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

  const handleModeSwitch = (newMode: AuthMode, correoDado?: string) => {
    // El correo ya escrito viaja entre «Iniciar sesión», «Recupera tu
    // contraseña» y «Crea tu cuenta»: volver a pedirlo era un paso de más
    // (Nico, 01-10). La contraseña nunca viaja.
    const correoEscrito = (
      correoDado ??
      (mode === 'forgot-password'
        ? forgotPasswordForm.getValues('email')
        : mode === 'register'
          ? registerForm.getValues('email')
          : loginForm.getValues('email'))
    )?.trim() ?? '';
    setMode(newMode);
    setRegisterStep('credentials');
    setError(null);
    aceptarCorreoTalCual(null);
    setReenvio({ estado: 'listo', espera: 0, error: null });
    setCorreoSinConfirmar(null);
    setCorreoSinCuenta(null);
    loginForm.reset(
      newMode === 'login' && correoEscrito ? { email: correoEscrito, password: '' } : undefined,
    );
    registerForm.reset(
      newMode === 'register' && correoEscrito
        ? { email: correoEscrito, password: '', confirmPassword: '' }
        : undefined,
    );
    forgotPasswordForm.reset(
      newMode === 'forgot-password' && correoEscrito ? { email: correoEscrito } : undefined,
    );
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
  // Con la marca del registro y siempre con «?»: la plantilla del correo le
  // pega «&token_hash=…» (ver `regreso-del-correo.ts`, QA 28-09).
  const enlaceDeConfirmacion = () => {
    const dest = returnUrl && returnUrl !== '/' ? returnUrl : onboardingDest();
    return urlDeRegresoDelRegistro(window.location.origin, dest);
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
    setConGoogle(true);
    setError(null);
    olvidarAviso();
    try {
      didAuthenticateInForm.current = true;
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      didAuthenticateInForm.current = false;
      setError(errorDeGoogle(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Con el `finally` de antes el botón volvía a quedar activo apenas Supabase
  // contestaba, mientras el efecto de arriba todavía resolvía la sesión y
  // redirigía: se veía «Iniciar sesión» otra vez y la gente volvía a apretar
  // (Nico, 2026-09-08). Si salió bien, el spinner se queda hasta que la
  // pantalla cambia; `isLoading` sólo se suelta cuando hay error que mostrar.
  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setCorreoSinConfirmar(null);
    setCorreoSinCuenta(null);
    olvidarAviso();
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
        setError(message || POR_DEFECTO_AL_ENTRAR);
        setIsLoading(false);
        return;
      }
      onSuccess?.();
      // El useEffect de arriba se encargará de la redirección al detectar el cambio de auth
    } catch (err: unknown) {
      didAuthenticateInForm.current = false;
      // Por el código de Supabase, nunca por el texto en inglés (02-10-2026).
      const codigo = codigoDeSupabase(err);
      if (codigo === 'invalid_credentials') {
        // Supabase dice lo mismo para contraseña mala y para correo sin
        // cuenta. Se pregunta al back SÓLO acá, tras el intento fallido; si no
        // contesta un «no» claro, queda el mensaje de siempre (Nico, 01-10).
        const tieneCuenta = await correoTieneCuentaApi.consultar(correo);
        setIsLoading(false);
        if (tieneCuenta === false) {
          setCorreoSinCuenta(correo);
          setError('No hay una cuenta con este correo.');
        } else {
          setError('Correo o contraseña incorrectos.');
        }
        return;
      }
      setIsLoading(false);
      if (codigo === 'email_not_confirmed') {
        // Acá llega quien abrió un enlace de confirmación vencido: /auth/enlace
        // lo manda a entrar. Sin el reenvío no tenía cómo pedir otro.
        setResetEmail(correo);
        redirectDeConfirmacion.current = enlaceDeConfirmacion();
        setReenvio({ estado: 'listo', espera: 0, error: null });
        setCorreoSinConfirmar(correo);
        setError(mensajeDeSupabase(err));
      } else {
        // Regla de oro: «conexión» sólo sin respuesta; un 5xx dice que fue
        // nuestro; lo que no se reconoce, la frase de siempre (nunca el inglés).
        setError(mensajeDeSupabase(err, { porDefecto: POR_DEFECTO_AL_ENTRAR, accion: 'iniciar tu sesión' }));
      }
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setConGoogle(true);
    setError(null);
    olvidarAviso();
    try {
      didAuthenticateInForm.current = true;
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      didAuthenticateInForm.current = false;
      setError(errorDeGoogle(err));
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
    olvidarAviso();
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
      setCorreoYaRegistrado(null);
      const { requiresConfirmation } = await signUpWithEmail(correo, data.password, emailRedirectTo, explicitRole ?? undefined);
      if (requiresConfirmation) {
        // El flujo termina en pantalla («Revisa tu correo»), no en un redirect:
        // acá sí se suelta el spinner.
        setResetEmail(correo);
        setReenvio({ estado: 'listo', espera: 0, error: null });
        setRegisterStep('confirm-email');
        setIsLoading(false);
      } else {
        // Auto-confirmed — go straight to onboarding (or the deep-link role's
        // onboarding). «Creando cuenta…» se queda hasta que cambia la pantalla,
        // igual que al entrar.
        router.push(onboardingDest());
      }
    } catch (err: unknown) {
      setIsLoading(false);
      // Por el código de Supabase, nunca por el texto en inglés (02-10-2026).
      const codigo = codigoDeSupabase(err);
      if (codigo === 'user_already_exists' || codigo === 'email_exists') {
        setError(mensajeDeSupabase(err));
        setCorreoYaRegistrado(normalizarCorreo(data.email));
        return;
      }
      // Lo que es de un campo va a SU campo, con el foco ahí (la contraseña
      // débil o filtrada, el correo que Supabase no acepta).
      const campo = campoDelErrorDeRegistro(codigo);
      if (campo) {
        registerForm.setError(
          campo,
          { type: 'server', message: mensajeDeSupabase(err) },
          { shouldFocus: true },
        );
        return;
      }
      setError(mensajeDeSupabase(err, { porDefecto: 'No pudimos crear tu cuenta. Intenta de nuevo.', accion: 'crear tu cuenta' }));
    }
  };

  /*
   * «¿No te llegó? Reenviar»: la única salida que tenía la pantalla era «Ir a
   * iniciar sesión», que con el correo sin confirmar sólo da error. Supabase
   * acepta un reenvío por minuto; la espera se muestra en el propio enlace.
   */
  const reenviarConfirmacion = async () => {
    if (reenviosHechos(resetEmail) >= MAXIMO_DE_REENVIOS) {
      setReenvio({ estado: 'listo', espera: 0, error: null, agotado: true });
      return;
    }
    setReenvio({ estado: 'enviando', espera: 0, error: null });
    try {
      await resendSignUpEmail(resetEmail, redirectDeConfirmacion.current ?? undefined);
      const n = anotarReenvio(resetEmail);
      setReenvio(
        n >= MAXIMO_DE_REENVIOS
          ? { estado: 'enviado', espera: 0, error: null, agotado: true }
          : { estado: 'enviado', espera: ESPERAS_DE_REENVIO_S[n - 1], error: null },
      );
    } catch (err: unknown) {
      // El límite de Supabase, por su código o su 429 (nunca por el texto).
      const limite = esLimiteDeEnvios(err);
      setReenvio({
        estado: 'listo',
        espera: limite ? 60 : 0,
        error: limite
          ? 'Ya se envió uno hace poco. Espera un minuto y revisa spam antes de pedir otro.'
          : mensajeDeSupabase(err, {
              porDefecto: 'No se pudo reenviar. Intenta de nuevo en un momento.',
              accion: 'reenviarte el enlace',
            }),
      });
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    olvidarAviso();
    try {
      const correo = normalizarCorreo(data.email);
      await sendPasswordReset(correo);
      setResetEmail(correo);
      setMode('reset-sent');
    } catch (err) {
      if (esLimiteDeEnvios(err)) {
        setError('Límite de envíos alcanzado. Espera unos minutos e intenta de nuevo.');
      } else if (codigoDeSupabase(err) === 'email_address_invalid') {
        forgotPasswordForm.setError(
          'email',
          { type: 'server', message: mensajeDeSupabase(err) },
          { shouldFocus: true },
        );
      } else {
        setError(
          mensajeDeSupabase(err, {
            porDefecto: 'No pudimos enviarte el enlace. Intenta de nuevo.',
            accion: 'enviarte el enlace',
          }),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * La consulta del segundo factor no respondió ni reintentando (Nico,
   * 02-10-2026): ni se sigue al destino ni se ofrece «Continuar como…»; sólo
   * «Reintentar». La sesión no se cierra.
   */
  if (
    !authLoading &&
    isAuthenticated &&
    user &&
    mfaCheckStatus === 'failed' &&
    (didAuthenticateInForm.current || (!quiereOtraCuenta && returnUrl && returnUrl !== '/'))
  ) {
    return (
      <div className={cn('w-full', className)}>
        <NoPudimosConfirmarTuSesion variante="tarjeta" />
      </div>
    );
  }

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
        <SesionYaAbierta destino={returnUrl} onCambiarDeCuenta={alCambiarDeCuenta} />
      </div>
    );
  }

  /*
   * 🔴 LOGIN-BUCLE (Nico, 06-10-2026): «vuelve a salir el login y luego de unos
   * segundos se cambia al de sigue con tu cuenta porque la identifica». Con una
   * sesión GUARDADA que todavía se está confirmando, el formulario vacío decía
   * algo falso («no tienes sesión») y segundos después lo reemplazaba la
   * tarjeta. Mientras se revisa —y sólo cuando venía a algo (`returnUrl`), el
   * mismo caso de la tarjeta— se dice eso, con la salida a otra cuenta a la
   * mano. Pasado el tope (`sin-confirmar`) vuelve el formulario.
   */
  if (
    authLoading &&
    confirmacionDeLaSesion === 'revisando' &&
    !didAuthenticateInForm.current &&
    !quiereOtraCuenta &&
    returnUrl &&
    returnUrl !== '/'
  ) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex w-full flex-col items-center gap-5 py-10 text-center" data-testid="revisando-sesion">
          <CargaDeMarca tamano="lg" disposicion="apilada" texto="Revisando tu sesión…" />
          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-60"
            onClick={() => void entrarConOtraDesdeLaEspera()}
            disabled={saliendoDeLaEspera}
            data-testid="revisando-sesion-otra-cuenta"
          >
            Entrar con otra cuenta
          </button>
        </div>
      </div>
    );
  }

  /*
   * La vista de la tarjeta. Al cambiar (entrar ↔ crear cuenta ↔ recuperar,
   * «Revisa tu correo»), el encabezado y el formulario salen JUNTOS y entra la
   * vista nueva: `CrossFade` (sale en 150 ms acelerando, entra en 200 ms
   * subiendo 4 px). Antes el título cambiaba de golpe y sólo el cuerpo se
   * fundía. Su `initial` es `false`: la vista del primer pintado llega visible
   * desde el HTML del servidor (antes el login nacía en `opacity: 0` hasta
   * hidratar).
   */
  const vista = mode === 'register' ? `register-${registerStep}` : mode;

  return (
    <div className={cn('w-full', className)}>
      <CrossFade swapKey={vista}>
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
          // El visto «llega» con el resorte de rebote leve del sistema.
          <motion.div
            initial={{ scale: motionScale.pop, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={motionSpring.bouncy}
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
            // Sin punto al final: pegado al correo se leía como parte de él (Nico, 01-10).
            <>Enviamos un enlace de confirmación a <span className="font-medium text-fg-muted">{resetEmail}</span></>
          )}
          {mode === 'forgot-password' && 'Te enviaremos un enlace para restablecer tu contraseña.'}
          {mode === 'reset-sent' && (
            <>Enviamos un enlace de recuperación a <span className="font-medium text-fg-muted">{resetEmail}</span></>
          )}
        </p>
      </div>

        {/* ── Login ─────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <div>
            <GoogleButton onClick={handleGoogleLogin} disabled={isLoading} isLoading={isLoading && conGoogle}>
              {isLoading && conGoogle ? 'Conectando...' : 'Continuar con Google'}
            </GoogleButton>

            <MonoDivider>o con email</MonoDivider>

            <form method="post" onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <fieldset disabled={isLoading} className="min-w-0 space-y-4">
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
                <AvisoBanner mensaje={avisoDeSesion && !error ? avisoDeSesion : null} confirmacion={avisoDeConfirmacion} />
                <ErrorBanner mensaje={error} />
                {error && correoSinConfirmar && (
                  <ReenvioDeConfirmacion reenvio={reenvio} onReenviar={reenviarConfirmacion} />
                )}
                {error && correoSinCuenta && (
                  <p className="text-[13px] text-fg-subtle">
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('register', correoSinCuenta)}
                      className={ENLACE}
                      data-testid="crear-cuenta-con-este-correo"
                    >
                      Crear una cuenta con este correo
                    </button>
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || !hidratado}
                  className="h-12 w-full rounded-full text-[14px] shadow-[0_12px_32px_-12px_rgba(26,64,255,0.65)] hover:-translate-y-px hover:shadow-[0_16px_40px_-12px_rgba(26,64,255,0.7)] active:translate-y-0 active:scale-[0.995]"
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
              </fieldset>
            </form>

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
          </div>
        )}

        {/* ── Register: Credentials ──────────────────────────────────────── */}
        {mode === 'register' && registerStep === 'credentials' && (
          <div>
            <GoogleButton onClick={handleGoogleRegister} disabled={isLoading} isLoading={isLoading && conGoogle}>
              Registrarse con Google
            </GoogleButton>

            <MonoDivider>o con tu email</MonoDivider>

            <form method="post" onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
              <fieldset disabled={isLoading} className="min-w-0 space-y-4">
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
                <AvisoBanner mensaje={avisoDeSesion && !error ? avisoDeSesion : null} confirmacion={avisoDeConfirmacion} />
                <ErrorBanner mensaje={error} />
                {error && correoYaRegistrado && (
                  <p className="text-[13px] text-fg-subtle">
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('login', correoYaRegistrado)}
                      className={ENLACE}
                      data-testid="entrar-con-este-correo"
                    >
                      Iniciar sesión con este correo
                    </button>
                  </p>
                )}
                <Button type="submit" disabled={isLoading || !hidratado} className="h-12 w-full rounded-full text-[14px] shadow-[0_12px_32px_-12px_rgba(26,64,255,0.65)] hover:-translate-y-px hover:shadow-[0_16px_40px_-12px_rgba(26,64,255,0.7)] active:translate-y-0 active:scale-[0.995]">
                  {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Creando cuenta...</>) : 'Crear cuenta'}
                </Button>
              </fieldset>
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
          </div>
        )}

        {/* ── Register: Confirm email ────────────────────────────────────── */}
        {mode === 'register' && registerStep === 'confirm-email' && (
          <div className="space-y-5">
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
          </div>
        )}

        {/* ── Forgot Password ────────────────────────────────────────────── */}
        {mode === 'forgot-password' && (
          <form
            method="post"
            onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)}
            className="space-y-4"
          >
            <fieldset disabled={isLoading} className="min-w-0 space-y-4">
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
              <AvisoBanner mensaje={avisoDeSesion && !error ? avisoDeSesion : null} confirmacion={avisoDeConfirmacion} />
              <ErrorBanner mensaje={error} />
              <Button type="submit" disabled={isLoading || !hidratado} className="w-full h-11 rounded-full text-[14px]">
                {isLoading ? (<><SpinnerGap className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : 'Enviar enlace de recuperación'}
              </Button>
              <p className="text-[12px] text-fg-subtle leading-relaxed">
                Ingresa el email asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </fieldset>
          </form>
        )}

        {/* ── Reset Email Sent ───────────────────────────────────────────── */}
        {mode === 'reset-sent' && (
          <div className="space-y-5">
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
          </div>
        )}
      </CrossFade>
    </div>
  );
}
