'use client';

import { Suspense, useState } from 'react';
import { LeasefyLogo } from '@/components/brand';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeSlash, CheckCircle, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { useAuth } from '@/lib/auth';
import { getAccessToken } from '@/lib/api/client';
import { sanitizeReturnUrl } from '@/lib/utils';

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

  if (!url || !anonKey) throw new Error('Supabase no está configurado.');
  if (!token) throw new Error('No hay sesión activa. Pedí un nuevo enlace de recuperación.');

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
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = body.msg || body.error_description || body.error || message;
    } catch { /* keep default */ }
    throw new Error(enEspanol(message));
  }
}

/**
 * Supabase responde en inglés. Esta pantalla la ve un inquilino cuya
 * inmobiliaria acaba de migrar su contrato: «New password should be different
 * from the old password» está mal dos veces —el idioma, y hablar de una
 * contraseña anterior que nunca tuvo—.
 */
function enEspanol(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('different from the old')) {
    return 'Esa contraseña ya la usaste antes. Elegí otra.';
  }
  if (m.includes('at least') || m.includes('should be at least')) {
    return 'La contraseña es muy corta: mínimo 8 caracteres.';
  }
  if (m.includes('weak') || m.includes('pwned')) {
    return 'Esa contraseña es muy fácil de adivinar. Elegí una menos común.';
  }
  if (m.includes('expired') || m.includes('invalid') || m.includes('jwt')) {
    return 'El enlace ya no sirve. Pedí que te lo reenvíen.';
  }
  return mensaje;
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
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const esPrimeraVez = searchParams.get('nuevo') === '1';
  const destino = sanitizeReturnUrl(searchParams.get('next'), '/');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === confirm;
  const isStrong = password.length >= 8;
  // CRÍTICO: esperar a authLoading false antes de permitir submit, así
  // el AuthProvider terminó su init (fetchUser + checkMfaLevel) y no
  // chocan los locks de @supabase/auth-js cuando llamamos updateUser.
  const canSubmit =
    password && confirm && passwordsMatch && isStrong && !authLoading && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!isAuthenticated) {
      setError(
        esPrimeraVez
          ? 'El enlace de la invitación expiró. Pedile a tu inmobiliaria que te la reenvíe.'
          : 'El enlace de recuperación expiró o no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?"',
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updatePasswordDirect(password);
      setSuccess(true);
      setTimeout(() => router.push(destino), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error. Intenta de nuevo.';
      console.error('[update-password] error:', err);
      setError(msg);
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
              <LeasefyLogo size={28} tone="brand" />
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
                  ? 'Ya podés entrar con tu correo y esta contraseña. Te llevamos a tu arriendo…'
                  : 'Tu contraseña fue cambiada exitosamente. Redirigiendo...'}
              </p>
              <Link href={destino}>
                <Button className="w-full">
                  {esPrimeraVez ? 'Ver mi arriendo' : 'Ir al inicio'}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-surface-muted rounded-full flex items-center justify-center mb-4">
                  <Lock className="h-5 w-5 text-fg" />
                </div>
                <h1 className="text-2xl font-semibold text-fg mb-1">
                  {esPrimeraVez ? 'Creá tu contraseña' : 'Nueva contraseña'}
                </h1>
                <p className="text-sm text-fg-muted">
                  {esPrimeraVez
                    ? 'Es lo único que falta para entrar a tu portal de inquilino.'
                    : 'Elige una contraseña segura para tu cuenta'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="h-12 pr-11"
                      autoComplete="new-password"
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
                  {password && !isStrong && (
                    <p className="text-xs text-danger mt-1">Mínimo 8 caracteres</p>
                  )}
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
                  {confirm && !passwordsMatch && (
                    <p className="text-xs text-danger mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-danger bg-danger-soft px-4 py-3 rounded-[12px]">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-[14px]"
                  disabled={!canSubmit}
                >
                  {authLoading
                    ? 'Cargando sesión...'
                    : isSubmitting
                      ? 'Guardando...'
                      : 'Guardar contraseña'}
                  {!authLoading && !isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
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
