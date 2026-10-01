'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/use-auth';
import { useLenis } from '@/components/providers/SmoothScroll';
import { ActivarSegundoFactorPasoAPaso } from '@/components/auth/ActivarSegundoFactorPasoAPaso';
import { EsqueletoDelPanel } from '@/components/inmobiliaria/EsqueletoDelPanel';
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
  const { agency, mfaEnrollRequired, setMfaVerified, signOut } = useAuth();
  const caja = useRef<HTMLDivElement>(null);
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

  const cerrarSesion = useCallback(async () => {
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

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
  }, []);

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

      {typeof document === 'undefined'
        ? null
        : createPortal(
            <div
              className="fixed inset-0 z-[300] flex items-center justify-center p-4"
              // El velo de los modales hechos a mano (el de la migración), más
              // suave: el panel tiene que seguir viéndose detrás.
              style={{ backgroundColor: 'color-mix(in srgb, var(--ink) 40%, transparent)' }}
              data-testid="segundo-factor-dentro-velo"
            >
              <div
                ref={caja}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Activa tu segundo factor"
                className="max-h-[calc(100dvh-32px)] w-full max-w-[540px] overflow-y-auto overscroll-contain rounded-[20px] border border-border bg-surface p-6 shadow-lg outline-none sm:p-10"
                style={{ overscrollBehavior: 'contain' }}
                data-lenis-prevent
                data-testid="segundo-factor-dentro-modal"
              >
                <div className="space-y-6">
                  <ActivarSegundoFactorPasoAPaso onActivado={activar} onYaTeniaFactor={alYaTenerFactor} />

                  {activadoEn === null ? (
                    <div className="border-t border-border-faint pt-4 text-center">
                      <button
                        type="button"
                        onClick={() => void cerrarSesion()}
                        className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted transition-colors hover:text-fg"
                      >
                        <SignOut className="h-4 w-4" aria-hidden="true" />
                        Cerrar sesión
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )}
    </div>
  );
}
