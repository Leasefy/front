'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/lib/auth/use-auth';
import { useLenis } from '@/components/providers/SmoothScroll';
import { ActivarSegundoFactorPasoAPaso } from '@/components/auth/ActivarSegundoFactorPasoAPaso';
import { EsqueletoDelPanel } from '@/components/inmobiliaria/EsqueletoDelPanel';
import { SUAVE, TarjetaDePuestaEnMarcha } from '@/components/puesta-en-marcha/TarjetaDePuestaEnMarcha';
import { leerRelevo } from '@/components/puesta-en-marcha/relevo';
import { AvisoDelMuroContext } from '@/components/migracion/migracion-context';
import { rutaAlSegundoFactor } from '@/lib/auth/regreso-tras-el-segundo-factor';
import { useSalidaDelSegundoFactor } from '@/lib/auth/use-salida-del-segundo-factor';

/**
 * 🔴 Activar el segundo factor DENTRO del panel de la inmobiliaria.
 *
 * Nico, 30-09-2026: «¿por qué me está sacando y me lleva a esta página? …
 * Todo lo de activar el 2FA, si no migro o luego de cuando migre, debe pasar
 * ya DENTRO, porque yo estoy es dentro». Al resolver la migración el back
 * pasa a exigir el segundo factor, `mfaEnrollRequired` se prende y
 * `ProtectedRoute` lo mandaba a `/auth/mfa-enroll`, la pantalla de entrar.
 *
 * Ahora `ProtectedRoute` lo deja pasar en el panel y este componente, en el
 * layout, decide qué se monta:
 *
 *  - `mfaEnrollRequired` → NO se montan los hijos (los providers del panel,
 *    el sidebar con sus badges, el Piloto, la página): con la sesión en `aal1`
 *    el back contesta 403 `SEGUNDO_FACTOR_REQUERIDO` a casi todo, y montar el
 *    panel era la lluvia de 403 de T-0099 — con sus toasts saliendo ENCIMA del
 *    modal, porque el `<Toaster>` es global. En su lugar va un esqueleto
 *    quieto del panel, atenuado, y encima el paso a paso.
 *  - Al activar → el «Listo» se deja leer, se espera a que el contexto suelte
 *    `mfaEnrollRequired` (o carga completa a los 8 s), y recién ahí se montan
 *    los hijos: el panel de verdad, con el recorrido arrancando solo.
 *
 * ── El orden: migración → segundo factor → recorrido ───────────────────────
 * El back no exige el segundo factor mientras la migración de una agencia
 * nueva está abierta, así que con el muro puesto `mfaEnrollRequired` es false.
 * Igual, si se prende mientras el muro, la pregunta o la bienvenida tapan el
 * panel (`AvisoDelMuroContext`), el panel con el muro se queda delante y esta
 * escena entra cuando el muro deja de tapar. El registro a medias
 * (`AsistentePendienteGuard`) va en el layout por encima de esto y manda
 * antes que las dos cosas.
 *
 * ── El siguiente paso, no un pop-up (Nico, 30-09-2026) ──────────────────────
 * «¿dentro de la plataforma por qué pone el "Cerrar sesión"? … no se siente
 * que esto del 2FA es obligatorio realmente, y no se siente una interacción
 * sana con el de migración». Así que:
 *  - SIN «Cerrar sesión»: adentro no se sale, se termina. (La página de
 *    afuera, `/auth/mfa-enroll`, lo conserva: sirve para recuperar acceso.)
 *  - La MISMA tarjeta que «¿Migramos tu inmobiliaria?» (`TarjetaDePuestaEnMarcha`):
 *    mismo ancho, radio, sombra y velo, la foto de marca a la izquierda y el
 *    mismo «Antes de empezar». El encabezado lo pone esta escena y dice sin
 *    rodeos que es obligatorio y que es lo último; el paso a paso no repite
 *    el suyo (`sinEncabezado`).
 *  - Viniendo de la decisión (`leerRelevo`), la tarjeta no vuelve a entrar:
 *    la foto se funde sobre la de la decisión y el contenido aparece suave.
 *    Llegando sola (al recargar), entra como entra la decisión.
 */
export function SegundoFactorDentroDelPanel({ children }: { children: ReactNode }) {
  const { mfaEnrollRequired } = useAuth();
  /** El muro de la migración (o su bienvenida) tapa el panel. */
  const [muroTapando, setMuroTapando] = useState(false);
  /**
   * Ya pasó el primer código y la escena está mostrando el «Listo»: se queda
   * hasta que el hook de salida diga, aunque el contexto ya haya soltado
   * `mfaEnrollRequired`.
   */
  const [terminando, setTerminando] = useState(false);

  const alActivar = useCallback(() => setTerminando(true), []);
  const alSalir = useCallback(() => setTerminando(false), []);

  if ((mfaEnrollRequired && !muroTapando) || terminando) {
    return <EscenaDelSegundoFactor onActivado={alActivar} onSalir={alSalir} />;
  }

  return <AvisoDelMuroContext.Provider value={setMuroTapando}>{children}</AvisoDelMuroContext.Provider>;
}

/**
 * La foto del segundo factor: la entrada de noche con el logo encendido —es
 * lo último antes de entrar—. Libre en la secuencia: la decisión usa la 13,
 * el recorrido la 02 y la 15, `AGENT_INTROS` de la 01 a la 08.
 */
export const FOTO_DEL_SEGUNDO_FACTOR = '/images/features/leasefy-brand-11.jpg';

/**
 * `useLayoutEffect` en el navegador: el portal se pone ANTES de pintar, así el
 * relevo desde la decisión no deja un cuadro sin velo. En el servidor no corre.
 */
const useEfectoAntesDePintar = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Los focusables del modal, para que el Tab no se escape al panel de atrás. */
function focusables(caja: HTMLElement): HTMLElement[] {
  return Array.from(
    caja.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest('[inert]'));
}

/** La URL en la que está, para volver a ella con una carga completa. */
function aquiMismo(): string {
  if (typeof window === 'undefined') return '/panel/inmobiliaria';
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

function EscenaDelSegundoFactor({
  onActivado,
  onSalir,
}: {
  onActivado: () => void;
  onSalir: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { agency, mfaEnrollRequired, setMfaVerified } = useAuth();
  const caja = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const idEntrada = useId();
  const animar = !useReducedMotion();
  /**
   * El portal va después de montar: en el servidor no hay `document`, y
   * decidirlo en el render con `typeof document` hace que el HTML del servidor
   * y el primer render del cliente no coincidan (error de hidratación). Antes
   * de pintar, para que entre en el mismo cuadro en que se fue la decisión.
   */
  const [montado, setMontado] = useState(false);
  useEfectoAntesDePintar(() => setMontado(true), []);
  /** La foto de la decisión si viene de ella; se lee una vez, al montar. */
  const [fotoAnterior] = useState(leerRelevo);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  // La misma salida que `/auth/mfa-enroll`; acá «salir» es soltar la escena
  // para que el layout monte el panel donde estaba, sin navegar.
  const { activadoEn, alActivar, yaSalioRef } = useSalidaDelSegundoFactor({
    mfaEnrollRequired,
    setMfaVerified,
    destino: aquiMismo,
    salir: onSalir,
  });

  const activar = useCallback(() => {
    onActivado();
    alActivar();
  }, [onActivado, alActivar]);

  /**
   * Al abrir, la cuenta ya tenía un factor verificado (otra pestaña, otro
   * dispositivo): falta escribir su código, y eso es el inicio de sesión
   * (`/auth/mfa-verify`), con la vuelta a esta misma pantalla.
   */
  const alYaTenerFactor = useCallback(() => {
    if (yaSalioRef.current) return;
    yaSalioRef.current = true;
    router.replace(rutaAlSegundoFactor(pathname));
  }, [router, pathname, yaSalioRef]);

  // El fondo no scrollea mientras el modal está (DESIGN §8).
  useEffect(() => {
    const controles = lenisRef.current;
    controles.stop();
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
      controles.start();
    };
  }, []);

  // Foco adentro al abrir, y el Tab da la vuelta sin salir del modal.
  useEffect(() => {
    if (!montado) return;
    const raf = requestAnimationFrame(() => caja.current?.focus());
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !caja.current) return;
      const lista = focusables(caja.current);
      if (lista.length === 0) {
        e.preventDefault();
        caja.current.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      const adentro = activo instanceof Node && caja.current.contains(activo);
      if (e.shiftKey && (activo === primero || activo === caja.current || !adentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (activo === ultimo || !adentro)) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [montado]);

  const relevo = fotoAnterior !== null;
  const activado = activadoEn !== null;

  return (
    <div className="relative min-h-screen bg-plan-page" data-testid="segundo-factor-dentro-del-panel">
      {/* El panel, dibujado y quieto: se ve, no se toca, no pide nada. */}
      <div
        inert
        aria-hidden
        className="pointer-events-none min-h-screen select-none blur-[3px] saturate-[0.6]"
      >
        <EsqueletoDelPanel nombre={agency?.name} />
      </div>

      {!montado ? null : (
        <TarjetaDePuestaEnMarcha
          foto={FOTO_DEL_SEGUNDO_FACTOR}
          encuadre="object-[50%_72%]"
          entrada={relevo ? 'ya-estaba' : 'aparece'}
          fotoAnterior={fotoAnterior}
          capa="z-[300]"
          cajaRef={caja}
          tituloId={idTitulo}
          descripcionId={activado ? undefined : idEntrada}
          testids={{
            velo: 'segundo-factor-dentro-velo',
            tarjeta: 'segundo-factor-dentro-modal',
            foto: 'segundo-factor-dentro-foto',
          }}
        >
          <motion.div
            className="flex flex-1 flex-col"
            // En el relevo, el contenido nuevo entra donde se fue el de la
            // decisión; llegando sola, entra con la tarjeta.
            initial={animar && relevo ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animar && relevo ? 0.08 : 0, duration: animar ? 0.34 : 0, ease: SUAVE }}
          >
            {activado ? (
              // El «Listo» trae su propio título a la vista; éste sólo nombra el diálogo.
              <span id={idTitulo} className="sr-only">
                Tu cuenta quedó protegida
              </span>
            ) : (
              <div>
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
                  Antes de empezar
                </p>
                <h2
                  id={idTitulo}
                  className="mt-4 text-balance font-heading text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-fg md:text-[34px]"
                >
                  Protege tu cuenta
                </h2>
                <p
                  id={idEntrada}
                  className="mt-3 text-pretty text-body text-fg-muted"
                  data-testid="segundo-factor-dentro-obligatorio"
                >
                  Es el último paso antes de entrar y es obligatorio: tu rol maneja plata. Toma
                  unos dos minutos.
                </p>
              </div>
            )}
            {/* 🔴 Siempre en este mismo lugar del árbol: si cambiara de sitio
                al activar, se volvería a montar y perdería su «Listo». */}
            <div className={activado ? 'flex flex-1 flex-col justify-center' : 'mt-5'}>
              <ActivarSegundoFactorPasoAPaso
                onActivado={activar}
                onYaTeniaFactor={alYaTenerFactor}
                sinEncabezado
              />
            </div>
          </motion.div>
        </TarjetaDePuestaEnMarcha>
      )}
    </div>
  );
}
