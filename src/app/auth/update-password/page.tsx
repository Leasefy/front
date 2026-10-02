'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeSlash, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { useAuth } from '@/lib/auth';
import { getAccessToken } from '@/lib/api/client';
import { sanitizeReturnUrl } from '@/lib/utils';
import { MedidorDeContrasena } from '@/components/auth/MedidorDeContrasena';
import { fortalezaDeContrasena } from '@/lib/auth/fortaleza-de-contrasena';
import { useHidratado } from '@/lib/hooks/use-hidratado';
import { rutaAlSegundoFactor } from '@/lib/auth/regreso-tras-el-segundo-factor';
import { borrarMarcaDeRecuperacion, rutaParaEntrarConLaNueva } from '@/lib/auth/sesion-de-recuperacion';
import { anunciarCierre } from '@/lib/auth/session-terminal';
import { codigoDeSupabase, mensajeDeSupabase } from '@/lib/auth/errores-de-supabase';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';

/**
 * Supabase no deja cambiar la contraseña de una cuenta con segundo factor
 * desde una sesión `aal1` (la que abre el enlace de recuperación): responde
 * 403 `insufficient_aal` con «AAL2 session is required to update email or
 * password when MFA is enabled.» (Nico, 30-09-2026, producción). Antes eso
 * salía tal cual, en inglés, y no había forma de seguir.
 */
class FaltaElSegundoFactor extends Error {
  constructor() {
    super('Para cambiar la contraseña primero confirma el código de tu app de autenticación.');
    this.name = 'FaltaElSegundoFactor';
  }
}

/** Un aviso de esta pantalla, ya en español (sin sesión, sin configuración). */
class AvisoDeLaPantalla extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'AvisoDeLaPantalla';
  }
}

/**
 * Llama al endpoint REST de Supabase Auth directo con fetch nativo, sin pasar
 * por el GoTrueClient JS. Lo hacemos así porque el cliente JS se cuelga
 * indefinidamente en este flow (lock interno o algo similar) y no envía la
 * request al backend. Con fetch directo tenemos el access_token cacheado por
 * el AuthProvider y mandamos el PUT /auth/v1/user manualmente.
 */
async function updatePasswordDirect(newPassword: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = getAccessToken();

  if (!url || !anonKey) throw new AvisoDeLaPantalla('Supabase no está configurado.');
  if (!token) throw new AvisoDeLaPantalla('No hay sesión activa. Pide un nuevo enlace de recuperación.');

  const res = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!res.ok) {
    // El cuerpo de GoTrue (`{ code, error_code, msg, weak_password }`) se
    // guarda tal cual: se decide por `error_code` y `status`, nunca por el
    // texto en inglés (02-10-2026). Un `fetch` que no salió sube como
    // `TypeError` y el traductor lo dice como «conexión».
    let cuerpo: Record<string, unknown> = {};
    try {
      const leido: unknown = await res.json();
      if (leido && typeof leido === 'object') cuerpo = leido as Record<string, unknown>;
    } catch { /* sin cuerpo: queda el status */ }
    const error = Object.assign(new Error(`Error ${res.status}`), { ...cuerpo, status: res.status });
    if (codigoDeSupabase(error) === 'insufficient_aal') throw new FaltaElSegundoFactor();
    throw error;
  }
}

/**
 * Supabase responde en inglés. Esta pantalla la ve un inquilino cuya
 * inmobiliaria acaba de migrar su contrato: «New password should be different
 * from the old password» está mal dos veces —el idioma, y hablar de una
 * contraseña anterior que nunca tuvo—. Las frases propias de esta pantalla,
 * por código; lo demás, el traductor de Supabase.
 */
const FRASES_DE_LA_CONTRASENA_NUEVA = {
  same_password: 'Esa contraseña ya la usaste antes. Elige otra.',
  bad_jwt: 'El enlace ya no sirve. Pide que te lo reenvíen.',
  invalid_jwt: 'El enlace ya no sirve. Pide que te lo reenvíen.',
  session_not_found: 'El enlace ya no sirve. Pide que te lo reenvíen.',
  session_expired: 'El enlace ya no sirve. Pide que te lo reenvíen.',
  no_authorization: 'El enlace ya no sirve. Pide que te lo reenvíen.',
} as const;

/** Lo que es de la contraseña nueva va debajo de ella, no al cartel. */
function esDeLaContrasena(err: unknown): boolean {
  const codigo = codigoDeSupabase(err);
  return codigo === 'weak_password' || codigo === 'same_password';
}

/**
 * Crear o cambiar la contraseña.
 *
 * Sirve para dos cosas que se parecen y no son iguales:
 *
 * - **Recuperarla** («olvidé mi contraseña»): la persona ya tenía una.
 * - **Crearla por primera vez** (`?nuevo=1`): llega de una invitación —por
 *   ejemplo, un inquilino cuya inmobiliaria acaba de migrar su contrato— y
 *   nunca tuvo. Decirle «tu contraseña fue cambiada» sería mentirle sobre algo
 *   que nunca existió, y «el enlace de recuperación expiró» lo mandaría a pedir
 *   una recuperación de una cuenta que todavía no puede usar.
 *
 * `?next=` es a dónde va después: para el inquilino migrado, su contrato.
 */
function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated, mfaRequired, signOut } = useAuth();

  const esPrimeraVez = searchParams.get('nuevo') === '1';
  const destino = sanitizeReturnUrl(searchParams.get('next'), '/');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** El error de la contraseña nueva (débil, repetida): va debajo del campo. */
  const [errorDeLaClave, setErrorDeLaClave] = useState<string | null>(null);
  const claveRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);
  /** Cerrando la sesión del enlace antes de mandar a entrar con la nueva. */
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  /*
   * Los campos de acá no llevan `name`, así que un envío nativo antes de
   * hidratar no mandaría la contraseña a ningún lado. Igual va la misma guarda
   * que el login (`method="post"` y botón apagado hasta hidratar): que la
   * seguridad del formulario no dependa de que nadie le agregue un `name`.
   */
  const hidratado = useHidratado();

  /*
   * Cuenta con segundo factor: primero el código y después la contraseña. La
   * pantalla del código ya resuelve todo (incluido «No tengo la app») y vuelve
   * acá con la sesión en `aal2`. Mismo destino si Supabase lo exige al guardar
   * y el contexto no lo había detectado.
   */
  const alSegundoFactor = () => {
    const aqui = `/auth/update-password${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    router.replace(rutaAlSegundoFactor(aqui));
  };
  useEffect(() => {
    if (!authLoading && isAuthenticated && mfaRequired) alSegundoFactor();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo cuando cambia la sesión
  }, [authLoading, isAuthenticated, mfaRequired]);

  const passwordsMatch = password === confirm;
  // El mismo mínimo que el registro (medidor de contraseña, 2026-09-07).
  const isStrong = fortalezaDeContrasena(password).cumpleMinimo;
  // CRÍTICO: esperar a authLoading false antes de permitir submit, así
  // el AuthProvider terminó su init (fetchUser + checkMfaLevel) y no
  // chocan los locks de @supabase/auth-js cuando llamamos updateUser.
  const canSubmit =
    hidratado && password && confirm && passwordsMatch && isStrong && !authLoading && !mfaRequired && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!isAuthenticated) {
      setError(
        esPrimeraVez
          ? 'El enlace de la invitación expiró. Pídele a tu inmobiliaria que te la reenvíe.'
          : 'El enlace de recuperación expiró o no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?"',
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setErrorDeLaClave(null);

    try {
      await updatePasswordDirect(password);
      // Ya no es una sesión «sólo para cambiar la contraseña».
      borrarMarcaDeRecuperacion();
      setSuccess(true);
      if (esPrimeraVez) {
        // La invitación: no tiene otra forma de entrar que esta sesión.
        setTimeout(() => router.push(destino), 2000);
        return;
      }
      /*
       * 🔴 QA 01-10-2026: «luego de renovar una contraseña está dirigiendo
       * directamente hacia la landing y no hacia el login», y en la landing los
       * botones pasaban solos de «Ir al panel» a «Iniciar sesión». Antes se
       * navegaba a `/` con la sesión del ENLACE todavía viva: la landing la
       * mostraba como una sesión normal hasta que algo la cerraba.
       *
       * Ahora la sesión del enlace se cierra acá —revocada en el servidor y
       * borrada de este navegador— y se ESPERA a que termine; recién después se
       * va a entrar con la contraseña nueva. Navegación dura y `replace`: no
       * queda nada de esta sesión en memoria, y «atrás» no vuelve a este
       * formulario.
       */
      setCerrandoSesion(true);
      // La contraseña YA quedó guardada: un fallo al cerrar (red caída) no se
      // pinta como error de este formulario. `signOut` igual borra la sesión
      // de este navegador aunque la revocación en el servidor no responda.
      await signOut().catch(() => {});
      anunciarCierre('contrasena-actualizada');
      window.location.replace(rutaParaEntrarConLaNueva(destino));
    } catch (err) {
      if (err instanceof FaltaElSegundoFactor) {
        alSegundoFactor();
        return;
      }
      console.error('[update-password] error:', err);
      const mensaje = mensajeDeSupabase(err, {
        frases: FRASES_DE_LA_CONTRASENA_NUEVA,
        porDefecto: 'No pudimos guardar tu contraseña. Intenta de nuevo.',
        accion: 'guardar tu contraseña',
      });
      if (esDeLaContrasena(err)) {
        setErrorDeLaClave(mensaje);
        claveRef.current?.focus();
      } else if (err instanceof AvisoDeLaPantalla) {
        setError(err.message);
      } else {
        setError(mensaje);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ForceLightMode>
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[400px]">
          {/* Logo — authenticated users go to their dashboard */}
          <div className="flex justify-center mb-8">
            <BrandHomeLink>
              <LeasefyLogotype size={24} className="text-fg" title="Leasefy" />
            </BrandHomeLink>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-success-soft rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-9 w-9 text-success" weight="fill" />
              </div>
              <h1 className="text-xl font-semibold text-fg mb-2">
                {esPrimeraVez ? 'Tu cuenta quedó lista' : 'Contraseña actualizada'}
              </h1>
              <p className="text-sm text-fg-muted mb-6">
                {esPrimeraVez
                  ? 'Ya puedes entrar con tu correo y esta contraseña. Te llevamos a tu arriendo…'
                  : 'Ahora entra con la contraseña nueva. Te llevamos a iniciar sesión…'}
              </p>
              {/* En la recuperación no hay botón: navegar antes de que termine
                  el cierre dejaría viva la sesión del enlace. */}
              {esPrimeraVez ? (
                <Link href={destino}>
                  <Button className="w-full">Ver mi arriendo</Button>
                </Link>
              ) : (
                <p className="text-xs text-fg-subtle" role="status" data-testid="cerrando-sesion-del-enlace">
                  {cerrandoSesion ? 'Cerrando la sesión del enlace…' : 'Un momento…'}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-surface-muted rounded-full flex items-center justify-center mb-4">
                  <Lock className="h-5 w-5 text-fg" />
                </div>
                <h1 className="text-2xl font-semibold text-fg mb-1">
                  {esPrimeraVez ? 'Crea tu contraseña' : 'Nueva contraseña'}
                </h1>
                <p className="text-sm text-fg-muted">
                  {esPrimeraVez
                    ? 'Es lo único que falta para entrar a tu portal de inquilino.'
                    : 'Elige una contraseña segura para tu cuenta'}
                </p>
              </div>

              <form method="post" onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Input
                      ref={claveRef}
                      id="nueva-contrasena"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorDeLaClave(null);
                      }}
                      placeholder="Mínimo 8 caracteres"
                      className="h-12 pr-11"
                      autoComplete="new-password"
                      aria-invalid={errorDeLaClave ? true : undefined}
                      aria-describedby={errorDeLaClave ? 'nueva-contrasena-error' : undefined}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                    >
                      {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <ErrorDelCampo id="nueva-contrasena-error" mensaje={errorDeLaClave} />
                  <MedidorDeContrasena contrasena={password} className="mt-2" />
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="h-12 pr-11"
                      autoComplete="new-password"
                      aria-invalid={confirm && !passwordsMatch ? true : undefined}
                      aria-describedby={confirm && !passwordsMatch ? 'confirmar-contrasena-error' : undefined}
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                    >
                      {showConfirm ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <ErrorDelCampo
                    id="confirmar-contrasena-error"
                    mensaje={confirm && !passwordsMatch ? 'Las contraseñas no coinciden' : null}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-danger bg-danger-soft px-4 py-3 rounded-[12px]">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-[14px]"
                  disabled={!canSubmit}
                >
                  {/* Una sola flecha: la ↗ que ya pone el botón (antes se sumaba
                      otra → a mano y quedaban dos). */}
                  {authLoading || mfaRequired
                    ? 'Cargando sesión...'
                    : isSubmitting
                      ? 'Guardando...'
                      : 'Guardar contraseña'}
                </Button>
              </form>

              {/* A quien nunca tuvo contraseña no se le pregunta si la
                  recordó. */}
              {esPrimeraVez ? null : (
                <p className="text-center text-xs text-fg-muted mt-6">
                  ¿Recordaste tu contraseña?{' '}
                  <Link href="/auth" className="text-fg hover:underline">
                    Iniciar sesión
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </ForceLightMode>
  );
}

export default function UpdatePasswordPage() {
  // `useSearchParams` obliga a un límite de Suspense en el App Router.
  return (
    <Suspense fallback={null}>
      <UpdatePasswordContent />
    </Suspense>
  );
}
