'use client';
/**
 * Guardar en Configuración: UNA barra por pantalla.
 *
 * Nico, 20-10-2026, en Perfil → «Cobros y mora»: «hago cambios aquí y no hay
 * botón de guardar». Sí había uno, pero al final de todo el formulario, debajo
 * de Impuestos y Retenciones: «el guardar cambios sí está pero está super raro
 * por ahí tirado, hay que mejorar la experiencia de guardado en configuración,
 * todo». Cada sección guardaba distinto: unas con «Editar» y el botón al final,
 * otras al tocar el interruptor, otras con un «Guardar» por tarjeta.
 *
 * Eligió (20-10): los campos se editan directo y, apenas cambias algo, aparece
 * abajo —siempre a la vista— «N cambios sin guardar · Descartar · Guardar
 * cambios». Si te vas sin guardar, avisa. Igual en todas las secciones.
 *
 * ── Cómo se usa ────────────────────────────────────────────────────────────
 *
 * El marco de Configuración monta `<ProveedorDeCambiosPorGuardar>` y pinta
 * `<BarraDeGuardado>` al pie de la sección. Cada tarjeta con datos editables
 * llama a `useCambiosPorGuardar({ id, cambios, guardar, descartar })`:
 *
 *   · `cambios`: cuántos datos difieren de lo guardado (0 = nada pendiente).
 *   · `guardar`: guarda lo suyo. `false` (o un error) = no se pudo; la
 *     tarjeta ya dijo por qué en su sitio, y la barra se queda.
 *   · `descartar`: vuelve a lo guardado.
 *
 * La barra junta las tarjetas: con tres tarjetas cambiadas dice «3 cambios» y
 * «Guardar cambios» las guarda una tras otra (si una falla, se detiene ahí).
 *
 * Fuera del proveedor (una prueba que monta la tarjeta sola, otra pantalla que
 * la reutiliza) el gancho devuelve `conBarra: false` y la tarjeta conserva su
 * botón propio: nada queda sin forma de guardar.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle } from '@phosphor-icons/react';
import {
  enterTransition,
  exitTransition,
  motionDistance,
  usePrefersReducedMotion,
} from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { cn } from '@/lib/utils';

/**
 * Lo que una tarjeta sabe hacer con lo suyo. `guardar` devuelve `false` si no
 * se pudo (la barra lo dice) o `'cancelado'` si la persona se echó para atrás
 * en una confirmación propia de la tarjeta (la barra se queda, sin error).
 */
interface Manejadores {
  guardar: () => Promise<boolean | void | 'cancelado'> | boolean | void | 'cancelado';
  descartar: () => void;
}

type EstadoDeLaBarra = 'quieto' | 'guardando' | 'guardado' | 'fallo';

interface ContextoDeGuardado {
  registrar: (id: string, manejadores: MutableRefObject<Manejadores>) => void;
  quitar: (id: string) => void;
  marcar: (id: string, cambios: number) => void;
  total: number;
  estado: EstadoDeLaBarra;
  guardarTodo: () => Promise<boolean>;
  descartarTodo: () => Promise<void>;
  /** `true` si se puede salir: no hay nada pendiente, o la persona dijo que sí. */
  pedirPermisoParaSalir: () => Promise<boolean>;
}

const Contexto = createContext<ContextoDeGuardado | null>(null);

/** «1 cambio sin guardar» / «3 cambios sin guardar». */
export function fraseDeCambios(n: number): string {
  return n === 1 ? '1 cambio sin guardar' : `${n} cambios sin guardar`;
}

/** Cuánto se queda a la vista el «Cambios guardados» antes de irse. */
const MS_DEL_GUARDADO = 1800;

export function ProveedorDeCambiosPorGuardar({ children }: { children: ReactNode }) {
  const router = useRouter();
  const manejadores = useRef(new Map<string, MutableRefObject<Manejadores>>());
  const [cambiosPorId, setCambiosPorId] = useState<Record<string, number>>({});
  const cambiosRef = useRef(cambiosPorId);
  cambiosRef.current = cambiosPorId;
  const [estado, setEstado] = useState<EstadoDeLaBarra>('quieto');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = Object.values(cambiosPorId).reduce((s, n) => s + n, 0);
  const totalRef = useRef(total);
  totalRef.current = total;

  const registrar = useCallback((id: string, m: MutableRefObject<Manejadores>) => {
    manejadores.current.set(id, m);
  }, []);
  const quitar = useCallback((id: string) => {
    manejadores.current.delete(id);
    setCambiosPorId((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);
  const marcar = useCallback((id: string, cambios: number) => {
    setCambiosPorId((prev) => (prev[id] === cambios ? prev : { ...prev, [id]: cambios }));
  }, []);

  const pendientes = () =>
    [...manejadores.current.keys()].filter((id) => (cambiosRef.current[id] ?? 0) > 0);

  const guardandoRef = useRef(false);
  const guardarTodo = useCallback(async () => {
    if (guardandoRef.current) return false;
    const ids = pendientes();
    if (ids.length === 0) return true;
    guardandoRef.current = true;
    if (temporizador.current) clearTimeout(temporizador.current);
    setEstado('guardando');
    try {
      for (const id of ids) {
        const m = manejadores.current.get(id);
        // Una tarjeta con cambios que ya no está (se desmontó en medio): lo
        // suyo no se guardó, y la barra no puede decir «guardados».
        if (!m) {
          setEstado('fallo');
          return false;
        }
        let ok: boolean | void | 'cancelado';
        try {
          ok = await m.current.guardar();
        } catch {
          ok = false;
        }
        if (ok === 'cancelado') {
          setEstado('quieto');
          return false;
        }
        if (ok === false) {
          setEstado('fallo');
          return false;
        }
      }
      setEstado('guardado');
      temporizador.current = setTimeout(() => setEstado('quieto'), MS_DEL_GUARDADO);
      return true;
    } finally {
      guardandoRef.current = false;
    }
    // `pendientes` lee refs: no cambia entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descartarSinPreguntar = useCallback(() => {
    for (const id of pendientes()) manejadores.current.get(id)?.current.descartar();
    setEstado('quieto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descartarTodo = useCallback(async () => {
    const n = totalRef.current;
    if (n === 0) return;
    const ok = await confirmar({
      tipo: 'advertencia',
      titulo: '¿Descartar los cambios?',
      descripcion: `Tienes ${fraseDeCambios(n)}. Vuelven a quedar como estaban guardados.`,
      accion: 'Descartar',
      cancelar: 'Seguir editando',
    });
    if (ok) descartarSinPreguntar();
  }, [descartarSinPreguntar]);

  const pedirPermisoParaSalir = useCallback(async () => {
    const n = totalRef.current;
    if (n === 0) return true;
    const ok = await confirmar({
      tipo: 'advertencia',
      titulo: '¿Salir sin guardar?',
      descripcion: `Tienes ${fraseDeCambios(n)}. Si sales ahora, se pierden.`,
      accion: 'Salir sin guardar',
      cancelar: 'Seguir editando',
    });
    if (ok) descartarSinPreguntar();
    return ok;
  }, [descartarSinPreguntar]);

  const hayPendientes = total > 0;

  // Cerrar la pestaña o recargar con cambios: el aviso del navegador (es el
  // único que el navegador deja mostrar en ese momento).
  useEffect(() => {
    if (!hayPendientes) return;
    const alSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [hayPendientes]);

  // Un enlace a otra pantalla del panel (el menú de Configuración, la barra
  // lateral, «Ver reglas de mora →»): se pregunta antes de irse. Se escucha en
  // la fase de captura del documento, antes de que el `<Link>` navegue.
  useEffect(() => {
    if (!hayPendientes) return;
    const alClic = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!enlace || enlace.target === '_blank' || enlace.hasAttribute('download')) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin) return; // afuera: lo cubre `beforeunload`
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      void pedirPermisoParaSalir().then((ok) => {
        if (ok) router.push(destino.pathname + destino.search + destino.hash);
      });
    };
    document.addEventListener('click', alClic, true);
    return () => document.removeEventListener('click', alClic, true);
  }, [hayPendientes, pedirPermisoParaSalir, router]);

  // ⌘S / Ctrl+S guarda, como en cualquier editor.
  useEffect(() => {
    if (!hayPendientes) return;
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void guardarTodo();
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [hayPendientes, guardarTodo]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const valor = useMemo<ContextoDeGuardado>(
    () => ({
      registrar,
      quitar,
      marcar,
      total,
      estado,
      guardarTodo,
      descartarTodo,
      pedirPermisoParaSalir,
    }),
    [registrar, quitar, marcar, total, estado, guardarTodo, descartarTodo, pedirPermisoParaSalir],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Para el marco: pedir permiso antes de navegar por código (el selector del celular). */
export function usePermisoParaSalir(): () => Promise<boolean> {
  const ctx = useContext(Contexto);
  return ctx?.pedirPermisoParaSalir ?? (async () => true);
}

/**
 * Una tarjeta le cuenta a la barra lo que tiene pendiente.
 *
 * `activo: false` (p. ej. quien no puede editar) no la registra. Devuelve
 * `conBarra`: si es `false`, la tarjeta pinta su propio botón de guardar.
 */
export function useCambiosPorGuardar({
  id,
  cambios,
  guardar,
  descartar,
  activo = true,
}: {
  id: string;
  cambios: number;
  guardar: Manejadores['guardar'];
  descartar: Manejadores['descartar'];
  activo?: boolean;
}): { conBarra: boolean } {
  const ctx = useContext(Contexto);
  const manejadores = useRef<Manejadores>({ guardar, descartar });
  // Siempre las funciones del último render: guardan lo que está escrito ahora.
  useEffect(() => {
    manejadores.current = { guardar, descartar };
  });
  const registrar = ctx?.registrar;
  const quitar = ctx?.quitar;
  const marcar = ctx?.marcar;
  useEffect(() => {
    if (!registrar || !quitar || !activo) return;
    registrar(id, manejadores);
    return () => quitar(id);
  }, [registrar, quitar, id, activo]);
  useEffect(() => {
    if (marcar && activo) marcar(id, Math.max(0, cambios));
  }, [marcar, id, cambios, activo]);
  return { conBarra: ctx !== null && activo };
}

/**
 * La barra: pegada al borde de abajo de la sección mientras haya algo sin
 * guardar. Sube con el movimiento de Cadence; al guardar dice «Cambios
 * guardados» un momento y se va.
 */
export function BarraDeGuardado({ className }: { className?: string }) {
  const ctx = useContext(Contexto);
  const reducido = usePrefersReducedMotion();
  if (!ctx) return null;
  const { total, estado, guardarTodo, descartarTodo } = ctx;
  const guardando = estado === 'guardando';
  const visible = total > 0 || guardando || estado === 'guardado' || estado === 'fallo';
  const recienGuardado = estado === 'guardado' && total === 0;
  // Una tarjeta se fue en medio de guardar: no queda nada que guardar, pero sí
  // que decirlo.
  const falloSinPendientes = estado === 'fallo' && total === 0;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="barra-de-guardado"
          initial={{ opacity: 0, y: motionDistance.sm }}
          animate={{ opacity: 1, y: 0, transition: enterTransition(reducido) }}
          exit={{ opacity: 0, y: motionDistance.sm, transition: exitTransition(reducido) }}
          className={cn('sticky bottom-0 z-30 pb-4 pt-2', className)}
          data-testid="barra-de-guardado"
          data-estado={recienGuardado ? 'guardado' : estado}
        >
          <div
            role="region"
            aria-label="Cambios sin guardar"
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-0.5" aria-live="polite">
              {recienGuardado ? (
                <p className="flex items-center gap-2 text-sm font-medium text-fg">
                  <CheckCircle weight="fill" className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  Cambios guardados
                </p>
              ) : falloSinPendientes ? (
                <p className="text-sm text-danger" data-testid="barra-de-guardado-perdido">
                  No se guardó todo: revisa los datos de arriba y vuelve a escribir lo que falte.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm font-medium text-fg">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  <span data-testid="barra-de-guardado-cuantos">{fraseDeCambios(total)}</span>
                </p>
              )}
              {estado === 'fallo' && total > 0 ? (
                <p className="text-sm text-danger">No se guardó todo: revisa lo marcado arriba.</p>
              ) : null}
            </div>
            {recienGuardado || falloSinPendientes ? null : (
              <div className="flex items-center gap-2 sm:shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  hideArrow
                  onClick={() => void descartarTodo()}
                  disabled={guardando}
                  className="flex-1 sm:flex-none"
                >
                  Descartar
                </Button>
                <Button
                  type="button"
                  hideArrow
                  onClick={() => void guardarTodo()}
                  disabled={guardando}
                  isLoading={guardando}
                  title="Guardar (⌘S)"
                  data-testid="barra-de-guardado-guardar"
                  className="flex-1 gap-1.5 sm:flex-none"
                >
                  {guardando ? (
                    'Guardando…'
                  ) : (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
