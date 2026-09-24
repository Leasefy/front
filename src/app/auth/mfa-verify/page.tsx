'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, SignOut } from '@phosphor-icons/react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import { FondoDeMarca } from '@/components/auth/FondoDeMarca';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import LogoDefs from '@/components/landing-v2/LogoDefs';
import { destinoTrasElSegundoFactor } from '@/lib/auth/regreso-tras-el-segundo-factor';
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect';

/**
 * El `returnUrl` de la barra. Se lee de `window.location` y no con
 * `useSearchParams` a propósito: éste obliga a envolver la página en
 * `<Suspense>` y el valor sólo se necesita al irse. Se sanea al usarlo.
 */
function returnUrlDeLaBarra(): string | null {
  if (typeof window === 'undefined') return null;
  // Se sanea ACÁ, donde se lee (lo exige el guardián de destinos de la URL);
  // `destinoTrasElSegundoFactor` vuelve a mirar, que no cuesta nada.
  const crudo = new URLSearchParams(window.location.search).get('returnUrl');
  const saneado = sanitizeReturnUrl(crudo, '/');
  return saneado === '/' ? null : saneado;
}

export default function MfaVerifyPage() {
  const router = useRouter();
  const { user, setMfaVerified, signOut, mfaRequired, mfaEnrollRequired } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  /**
   * 🔴 21-09-2026 · EL CANDADO CON LA LLAVE ADENTRO.
   *
   * Esta pantalla pedía «el código de 6 dígitos de tu app de autenticación» a
   * TODO el que llegara acá — incluido quien **no tiene ninguna app ni ningún
   * factor inscrito**, que es el caso de cualquier administrador o contador el
   * día que se despliega el segundo factor obligatorio. Sin app no hay código,
   * el botón «Verificar» queda muerto para siempre y la única salida es
   * «Cerrar sesión». Y no se puede ir a activarlo a Configuración → Seguridad,
   * porque `ProtectedRoute` devuelve acá mientras el segundo factor haga falta.
   *
   * `null` mientras se pregunta: hasta saberlo no se afirma ni una cosa ni la
   * otra, que es lo que evita que parpadee el formulario equivocado.
   */
  const [tieneFactor, setTieneFactor] = useState<boolean | null>(null);
  /**
   * 🔴 La salida a mano, que funciona pase lo que pase.
   *
   * `listFactors()` puede quedarse sin resolver ni rechazar —el propio
   * contexto de auth toma el candado del SDK, que es el mismo problema que
   * `MfaSetupSection` ya documentó con `enroll`—, y ahí `tieneFactor` se
   * quedaría en `null` para siempre y volvería a salir el campo del código.
   * Este botón no depende de que nadie conteste.
   */
  const [quiereInscribir, setQuiereInscribir] = useState(false);
  /** El código no era: las casillas se pintan hasta que se escriba otro. */
  const [hayError, setHayError] = useState(false);
  const inscribiendo = tieneFactor === false || quiereInscribir;

  // If MFA is not required, redirect away. T-0099: if enrollment turns out to
  // be what's actually pending (defensive — these two states are meant to be
  // mutually exclusive, see contract.md T-0099 §3), send to /auth/mfa-enroll
  // instead of stranding on a verify screen with nothing to verify. When
  // nothing is pending, go to the destination the person was headed to (the
  // saneado `returnUrl`) or the start of their panel.
  useEffect(() => {
    if (!user) return;
    if (mfaEnrollRequired) {
      router.replace('/auth/mfa-enroll');
      return;
    }
    if (!mfaRequired) {
      router.replace(destinoTrasElSegundoFactor(returnUrlDeLaBarra(), user.role));
    }
  }, [user, mfaRequired, mfaEnrollRequired, router]);

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
        setTieneFactor(Boolean(verified));
      } catch {
        // Si ni siquiera se pudo preguntar, se ofrece inscribirlo: es la
        // única de las dos salidas que sirve cuando no se sabe.
        setTieneFactor(false);
      }
    };
    loadFactor();
  }, []);

  /**
   * 🔴 Recibe el código APARTE del estado.
   *
   * Las casillas avisan que está completo en el mismo paso en que piden el
   * cambio de estado, así que cuando corre esto `code` todavía trae cinco
   * dígitos. Pasarlo explícito es lo que hace que enviarse solo funcione;
   * leerlo del estado verificaría el código de antes.
   */
  const handleVerify = useCallback(async (codigoExplicito?: string) => {
    const codigo = codigoExplicito ?? code;
    if (!factorId || codigo.length !== 6) return;
    setHayError(false);
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
        code: codigo,
      });
      if (verifyError) throw verifyError;

      // Mark MFA as verified in context
      setMfaVerified();

      // Al destino que traía la persona (QA 23-09), o al inicio de su panel.
      router.replace(destinoTrasElSegundoFactor(returnUrlDeLaBarra(), user?.role));
    } catch (err) {
      const msg = (err as Error).message || '';
      // 🔴 Las casillas se pintan en rojo además del aviso: el aviso se va solo
      // y el campo se queda vacío, así que sin esto no queda rastro de que lo
      // que falló fue el código y no otra cosa.
      setHayError(true);
      if (msg.includes('invalid') || msg.includes('expired')) {
        toast.error('Código incorrecto. Intenta con el siguiente.');
      } else {
        toast.error(msg || 'No se pudo verificar el código.');
      }
      setCode('');
    } finally {
      setIsLoading(false);
    }
  }, [factorId, code, setMfaVerified, user, router]);

  /** Seis dígitos y ya no hay nada más que preguntar: se envía solo. */
  const enviarSiSePuede = useCallback(
    (codigo: string) => {
      if (!isLoading && factorId) void handleVerify(codigo);
    },
    [isLoading, factorId, handleVerify],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

  return (
    <ForceLightMode>
      {/*
       * 🔴 22-09 · Esta pantalla era una página blanca pelada, y se llega a
       * ella DESDE `/auth`, que tiene el video de marca, el logotipo y los
       * testimonios. El corte se veía como si el producto se hubiera acabado a
       * mitad del acto de entrar.
       *
       * Entrar son dos pantallas, no una: misma caja, mismo fondo, mismo sitio
       * para la tarjeta. Lo único que no se repite son los testimonios —son
       * para convencer a quien llega, y acá ya entró: lo que necesita es
       * terminar, no que le vendan.
       */}
      <div className="relative min-h-screen bg-background" data-lenis-prevent>
        <FondoDeMarca />

        <LogoDefs />
        <div className="pointer-events-none fixed inset-0 z-[1] hidden lg:block">
          <BrandHomeLink
            aria-label="Leasefy — inicio"
            className="pointer-events-auto absolute left-8 top-8 inline-flex text-white"
          >
            <svg viewBox="0 0 947 235" className="block h-8 w-auto" role="img" aria-label="Leasefy">
              <use href="#lfLogo" />
            </svg>
          </BrandHomeLink>
        </div>

        <div className="relative z-10 flex min-h-screen flex-col lg:flex-row lg:items-center lg:justify-end lg:p-8">
          <div
            className="relative flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:max-h-[calc(100vh-4rem)] lg:w-[480px] lg:overflow-y-auto lg:rounded-lg lg:bg-surface lg:p-10 lg:shadow-[0_24px_64px_-16px_rgba(20,19,15,0.45)] lg:ring-1 lg:ring-black/5"
            data-lenis-prevent
            data-testid="mfa-tarjeta"
          >
            <div className="mx-auto w-full space-y-7">
              {/* El escudo, del tamaño de un sello y no de un icono suelto. */}
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary-soft ring-1 ring-primary/10">
                  <ShieldCheck className="h-7 w-7 text-primary" weight="fill" />
                </div>
              </div>

              <div className="space-y-2 text-center">
                {/* 🔴 El mismo título que su hermana `/auth`, con el tamaño
                    puesto a mano. No es `text-h2`: esa clase es responsiva y a
                    partir de `lg` llega a 36 px, con lo que «Verificación de
                    seguridad» se parte en dos renglones dentro de una tarjeta
                    de 480. (`DESIGN.md` dice que `.text-h2` son 22 px y no es
                    cierto — medido: 36.) */}
                <h1 className="text-balance font-heading text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-fg">
                  {inscribiendo ? 'Activa tu segundo factor' : 'Verificación de seguridad'}
                </h1>
                <p className="text-pretty text-body-sm text-fg-muted">
                  {inscribiendo
                    ? 'Tu rol maneja la plata de propietarios e inquilinos, así que entrar con contraseña no alcanza. Actívalo acá una vez: son dos minutos.'
                    : 'Abre tu app de autenticación y escribe el código de seis dígitos.'}
                </p>
              </div>

              {/*
                🔴 Sin factor inscrito NO se pide un código: no existe. Se
                ofrece inscribirlo, acá mismo, porque Configuración → Seguridad
                está del otro lado del muro que esta pantalla levanta.
              */}
              {inscribiendo ? (
                <div data-testid="inscribir-el-segundo-factor">
                  <MfaSetupSection />
                </div>
              ) : (
                <div className="space-y-5">
                  <CasillasDeCodigo
                    aria-label="Código de verificación de 6 dígitos"
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      if (hayError) setHayError(false);
                    }}
                    hayError={hayError}
                    onCompleto={enviarSiSePuede}
                    disabled={isLoading}
                    autoFocus
                  />

                  <Button
                    onClick={() => void handleVerify()}
                    disabled={isLoading || code.length !== 6 || !factorId}
                    isLoading={isLoading}
                    hideArrow
                    className="w-full"
                  >
                    {isLoading ? 'Verificando…' : 'Verificar'}
                  </Button>

                  {/* El código cambia cada 30 s: decirlo evita el «lo escribí
                      bien y me lo rechazó». */}
                  <p className="text-pretty text-center text-caption text-fg-subtle">
                    El código cambia cada 30 segundos. Si te lo rechaza, espera
                    al siguiente.
                  </p>
                </div>
              )}

              {/* 🔴 La puerta de emergencia: sin app no hay código, y hay que
                  poder decirlo aunque el SDK no conteste. */}
              {!inscribiendo && (
                <div className="border-t border-border-faint pt-5 text-center">
                  <button
                    onClick={() => setQuiereInscribir(true)}
                    className="text-body-sm text-primary underline-offset-4 hover:underline"
                    data-testid="no-tengo-la-app"
                  >
                    No tengo la app de autenticación — activarla ahora
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted transition-colors hover:text-fg"
                >
                  <SignOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ForceLightMode>
  );
}
