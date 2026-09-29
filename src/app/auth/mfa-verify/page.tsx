'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, SignOut } from '@phosphor-icons/react';
import { getSupabase } from '@/lib/supabase/client';
import { getAccessToken } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import { RestablecerSegundoFactorPorCorreo } from '@/components/auth/RestablecerSegundoFactorPorCorreo';
import { leerRestablecimientoPendiente } from '@/lib/auth/restablecimiento-pendiente';
import { mensajeDeSupabaseAuth } from '@/lib/auth/errores-del-segundo-factor';
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

/** La primera promesa que se RESUELVA (las que fallan no ganan); si fallan todas, falla. */
function primeroQueConteste<T>(promesas: Promise<T>[]): Promise<T> {
  return new Promise((resolver, rechazar) => {
    let fallidas = 0;
    for (const p of promesas) {
      p.then(resolver, () => {
        fallidas += 1;
        if (fallidas === promesas.length) rechazar(new Error('no se pudo saber si hay factor'));
      });
    }
  });
}

function conTope<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, rechazar) => setTimeout(() => rechazar(new Error('sin respuesta')), ms)),
  ]);
}

/**
 * El factor verificado por HTTP (`GET /auth/v1/user`), sin pasar por el
 * candado del SDK. Falla si no hay token o Supabase no contesta en 10 s.
 */
async function factorVerificadoPorHttp(): Promise<string | null> {
  const token = getAccessToken();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) throw new Error('sin sesión');
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), 10_000);
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      signal: control.signal,
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const usuario = (await res.json()) as { factors?: Array<{ id: string; factor_type: string; status: string }> };
    return usuario.factors?.find((f) => f.factor_type === 'totp' && f.status === 'verified')?.id ?? null;
  } finally {
    clearTimeout(reloj);
  }
}

export default function MfaVerifyPage() {
  const router = useRouter();
  const { user, setMfaVerified, signOut, mfaRequired, mfaEnrollRequired, isLoading: cargandoLaSesion } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  /**
   * 🔴 El candado de verdad contra el doble envío (Nico, 24-09: «cuando uno
   * ponga el código debe bloquearse todo»). `isLoading` es estado de React y
   * tarda un render en verse: un doble clic, o el envío automático del sexto
   * dígito más un clic, alcanzaban a verificar dos veces el mismo código (y el
   * segundo volvía como «código incorrecto»). Un ref se ve al instante.
   */
  const verificandoRef = useRef(false);
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
  /**
   * 🔴 29-09-2026 · «No tengo la app» con un factor YA verificado (caso B).
   *
   * Antes montaba `MfaSetupSection`, que mostraba el factor «Activado» con un
   * «Desactivar» que Supabase rechazaba (422: quitar un factor verificado
   * exige `aal2`, y sin la app no hay `aal2`). Ahora se ofrece restablecerlo
   * con un código que llega al correo de la cuenta: la contraseña sola no
   * alcanza, porque entonces quien la robe quitaría el factor y pondría el suyo.
   */
  const [sinLaApp, setSinLaApp] = useState(false);
  /** El código del correo sirvió: los factores ya no están, toca inscribir uno nuevo. */
  const [restablecido, setRestablecido] = useState(false);
  /** Caso A: cambiando el factor CON la app desde `MfaSetupSection`. */
  const [cambiandoElFactor, setCambiandoElFactor] = useState(false);
  const inscribiendo = restablecido || (!sinLaApp && (tieneFactor === false || quiereInscribir));
  /**
   * Mientras la persona cambia o restablece el factor, la pantalla NO se va
   * sola: pasar el código de la app sube la sesión a `aal2` (y el efecto de
   * abajo la mandaría al panel antes de inscribir el nuevo), y quitar los
   * factores hace que el contexto pida «inscribir» (y la mandaría a
   * `/auth/mfa-enroll` a mitad de camino). Al terminar, sale por
   * `alActivarElNuevo`, como la verificación normal.
   */
  const enUnFlujoPropio = sinLaApp || restablecido || cambiandoElFactor || quiereInscribir;

  /**
   * 🔴 Nico, 29-09: pidió el código al correo, la página se montó de nuevo
   * mientras lo buscaba y volvió a las casillas de la APP; escribió ahí el
   * código del correo y le dijo «Código incorrecto». Si hay un restablecimiento
   * pedido y vigente para esta cuenta, se vuelve solo a las casillas del correo
   * (`restablecimiento-pendiente.ts`).
   */
  const usuarioId = typeof user?.id === 'string' ? user.id : null;
  useEffect(() => {
    if (usuarioId && tieneFactor === true && leerRestablecimientoPendiente(usuarioId)) setSinLaApp(true);
  }, [usuarioId, tieneFactor]);

  // If MFA is not required, redirect away. T-0099: if enrollment turns out to
  // be what's actually pending (defensive — these two states are meant to be
  // mutually exclusive, see contract.md T-0099 §3), send to /auth/mfa-enroll
  // instead of stranding on a verify screen with nothing to verify. When
  // nothing is pending, go to the destination the person was headed to (the
  // saneado `returnUrl`) or the start of their panel.
  useEffect(() => {
    // 🔴 Nico, 29-09: recién llegado del login, el usuario ya está pero el
    // chequeo del segundo factor no ha terminado y `mfaRequired` sigue en su
    // valor de fábrica (false). Sin esperar a `cargandoLaSesion`, esta pantalla
    // creía que ya no hacía falta, mandaba al panel, el panel la devolvía acá
    // y se montaba de nuevo — y se perdía lo que la persona ya había tocado
    // («No tengo la app» había que tocarlo dos veces).
    if (!user || cargandoLaSesion || enUnFlujoPropio) return;
    if (mfaEnrollRequired) {
      router.replace('/auth/mfa-enroll');
      return;
    }
    if (!mfaRequired) {
      router.replace(destinoTrasElSegundoFactor(returnUrlDeLaBarra(), user.role));
    }
  }, [user, cargandoLaSesion, mfaRequired, mfaEnrollRequired, router, enUnFlujoPropio]);

  /**
   * ¿Tiene un factor verificado? Se pregunta por el SDK Y por HTTP a la vez y
   * gana el primero que conteste: `listFactors()` puede quedarse esperando el
   * candado del SDK (ver `MfaSetupSection`). La promesa queda guardada para
   * que «No tengo la app» espere la respuesta en vez de adivinar.
   */
  const consultaDelFactorRef = useRef<Promise<string | null> | null>(null);
  useEffect(() => {
    let vivo = true;
    const porElSdk = (async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('sin Supabase');
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return factors?.totp?.find((f) => f.status === 'verified')?.id ?? null;
    })();
    const consulta = primeroQueConteste([porElSdk, factorVerificadoPorHttp()]);
    consultaDelFactorRef.current = consulta;
    consulta
      .then((id) => {
        if (!vivo) return;
        if (id) setFactorId(id);
        setTieneFactor(Boolean(id));
      })
      .catch(() => {
        // Si ni siquiera se pudo preguntar, se ofrece inscribirlo: es la
        // única de las dos salidas que sirve cuando no se sabe.
        if (vivo) setTieneFactor(false);
      });
    return () => {
      vivo = false;
    };
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
    if (verificandoRef.current) return;
    verificandoRef.current = true;
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
      // Si salió bien, la pantalla se QUEDA bloqueada hasta que cambie: antes
      // el `finally` la soltaba mientras la navegación todavía estaba en
      // camino y el botón volvía a «Verificar» con el código ya usado.
      router.replace(destinoTrasElSegundoFactor(returnUrlDeLaBarra(), user?.role));
    } catch (err) {
      verificandoRef.current = false;
      setIsLoading(false);
      const msg = (err as Error).message || '';
      // 🔴 Las casillas se pintan en rojo además del aviso: el aviso se va solo
      // y el campo se queda vacío, así que sin esto no queda rastro de que lo
      // que falló fue el código y no otra cosa.
      setHayError(true);
      if (msg.includes('invalid') || msg.includes('expired')) {
        toast.error('Código incorrecto. Intenta con el siguiente.');
      } else {
        // Nada en inglés ni un «Error 422» pelado (29-09).
        const e = err as { status?: number; code?: string };
        toast.error(mensajeDeSupabaseAuth({ status: e.status, codigo: e.code, mensaje: msg }));
      }
      setCode('');
    }
  }, [factorId, code, setMfaVerified, user, router]);

  /** Seis dígitos y ya no hay nada más que preguntar: se envía solo. */
  const enviarSiSePuede = useCallback(
    (codigo: string) => {
      if (!verificandoRef.current && factorId) void handleVerify(codigo);
    },
    [factorId, handleVerify],
  );

  /**
   * El factor nuevo quedó activo por el SDK (`MfaSetupSection` con
   * `enElIngreso`): la sesión ya es `aal2`. Sale como la verificación normal.
   */
  const alActivarElNuevo = useCallback(() => {
    setMfaVerified();
    router.replace(destinoTrasElSegundoFactor(returnUrlDeLaBarra(), user?.role));
  }, [setMfaVerified, router, user]);

  /** «No tengo la app»: con factor verificado, al correo; sin factor, a inscribirlo. */
  const [revisandoLaCuenta, setRevisandoLaCuenta] = useState(false);
  const noTengoLaApp = useCallback(async () => {
    let tiene = tieneFactor;
    if (tiene === null) {
      // Todavía no se sabe: se espera la respuesta (con tope) en vez de
      // mandar a inscribir a quien ya tiene un factor.
      setRevisandoLaCuenta(true);
      try {
        const id = await conTope(consultaDelFactorRef.current ?? Promise.resolve(null), 10_000);
        tiene = Boolean(id);
        if (id) setFactorId(id);
        setTieneFactor(tiene);
      } catch {
        tiene = false;
      } finally {
        setRevisandoLaCuenta(false);
      }
    }
    if (tiene) setSinLaApp(true);
    else setQuiereInscribir(true);
  }, [tieneFactor]);

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
                  {restablecido
                    ? 'Activa tu segundo factor de nuevo'
                    : sinLaApp
                      ? 'Restablece tu segundo factor'
                      : inscribiendo
                        ? 'Activa tu segundo factor'
                        : 'Verificación de seguridad'}
                </h1>
                <p className="text-pretty text-body-sm text-fg-muted">
                  {restablecido
                    ? 'Listo: quitamos el anterior. Escanea el código QR con tu app de autenticación y escribe el primer código; al terminar entras.'
                    : sinLaApp
                      ? 'Si perdiste la app de autenticación o el celular donde la tenías, lo restableces con un código que te mandamos al correo.'
                      : inscribiendo
                        ? 'Tu rol maneja la plata de propietarios e inquilinos, así que entrar con contraseña no alcanza. Actívalo acá una vez: son dos minutos.'
                        : 'Abre tu app de autenticación y escribe el código de seis dígitos.'}
                </p>
              </div>

              {/*
                🔴 Sin factor inscrito NO se pide un código: no existe. Se
                ofrece inscribirlo, acá mismo, porque Configuración → Seguridad
                está del otro lado del muro que esta pantalla levanta.
              */}
              {sinLaApp && !restablecido ? (
                <RestablecerSegundoFactorPorCorreo
                  correo={user?.email}
                  usuarioId={usuarioId}
                  onRestablecido={() => {
                    setRestablecido(true);
                    setSinLaApp(false);
                  }}
                  onVolver={() => setSinLaApp(false)}
                />
              ) : inscribiendo ? (
                <div data-testid="inscribir-el-segundo-factor">
                  <MfaSetupSection
                    // `key`: tras restablecer se monta DE NUEVO, para que vuelva
                    // a mirar los factores (ya no hay) y arranque la inscripción.
                    key={restablecido ? 'nuevo' : 'actual'}
                    enElIngreso
                    inscribirAlAbrir={restablecido}
                    onActivado={alActivarElNuevo}
                    onSinLaApp={() => {
                      setQuiereInscribir(false);
                      setSinLaApp(true);
                    }}
                    onCambioDeFactor={setCambiandoElFactor}
                  />
                </div>
              ) : (
                <div className="space-y-5" aria-busy={isLoading}>
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
              {!inscribiendo && !sinLaApp && (
                <div className="border-t border-border-faint pt-5 text-center">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => void noTengoLaApp()}
                    disabled={isLoading || revisandoLaCuenta}
                    data-testid="no-tengo-la-app"
                  >
                    {revisandoLaCuenta
                      ? 'Revisando tu cuenta…'
                      : tieneFactor === true
                      ? 'No tengo la app de autenticación'
                      : 'No tengo la app de autenticación — activarla ahora'}
                  </Button>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-50"
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
