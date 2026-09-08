'use client';

/**
 * TourDelPanel — el recorrido guiado del panel de inmobiliaria.
 *
 * ── Qué es ────────────────────────────────────────────────────────────────
 *
 * Un recorrido con principio y final, no tres burbujas sueltas:
 *
 *   bienvenida (centrada, saluda por el nombre)
 *     → N paradas sobre elementos REALES, en el orden del negocio
 *       → cierre (centrada, resume y dice por dónde volver a verlo)
 *
 * El guion vive en `pasos-del-tour.ts`. Acá está la puesta en escena: el
 * recorte sobre el elemento, la tarjeta, el teclado y el foco.
 *
 * ── Las decisiones que vale la pena dejar escritas ────────────────────────
 *
 * 1. **Un paso sin su elemento no existe.** Los pasos se resuelven al arrancar
 *    (el panel tarda en pintar el sidebar y la píldora) y se filtran por
 *    `sePuedeSenalar`, que NO es un `querySelector` a secas: un elemento
 *    presente pero de tamaño cero —el sidebar por debajo de `lg`— no se puede
 *    señalar. Si además desaparece a mitad del recorrido, su paso se salta
 *    solo. Nunca se señala un hueco.
 * 2. **Omitir está en todos los pasos** y cuenta como visto
 *    (`setTourDismissed(true)`), igual que llegar al final: es la misma
 *    preferencia que mueve el interruptor de Configuración → Preferencias.
 * 3. **El velo NO se puede clickear para cerrar.** Cierran la ✕, «Omitir» y
 *    Esc, que son los tres caminos que un lector de pantalla también encuentra.
 *    Un botón invisible a pantalla completa se anunciaba como un control más y
 *    cerraba el recorrido de un clic despistado.
 * 4. **El foco queda atrapado en la tarjeta** mientras está abierta y vuelve al
 *    elemento que tenía el foco antes de abrirla.
 * 5. **Todo en tokens** (`bg-surface`, `border-border`, `text-fg`,
 *    `hsl(var(--primary))`, `var(--ink)` para el velo) — el recorrido se ve
 *    igual de bien en claro y en oscuro, y el velo se oscurece con la tinta de
 *    la casa, no con un negro clavado.
 * 6. **`prefers-reduced-motion` apaga la respiración del halo** y acorta las
 *    transiciones a cero.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth/use-auth';
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import {
  PASOS_DEL_TOUR,
  elPanelEstaBloqueado,
  pantallasDelTour,
  pasosVisibles,
  type PantallaDelTour,
  type PasoDelTour,
} from './pasos-del-tour';

/** Aire alrededor del elemento resaltado. */
const MARGEN = 8;
/**
 * Cada cuánto se vuelve a contar cuántos pasos hay, y hasta cuándo.
 *
 * 🔴 Esto NO es un `setTimeout` de cortesía. El sidebar dibuja un esqueleto
 * mientras cargan los permisos, así que a los 400 ms —lo que esperaba la
 * versión anterior— sólo existían el buscador y la píldora del Piloto: de ahí
 * salía «el onboarding son dos pasos».
 *
 * Por eso el conteo NO empieza hasta que los permisos están resueltos —son
 * ellos los que deciden qué filas dibuja el sidebar— y aun entonces se cuenta
 * cada `LATIDO` hasta que el número lleve `ESTABLES` conteos sin moverse, con
 * un piso de `MIN_INTENTOS`: el esqueleto también se queda quieto, así que
 * «dos conteos iguales» aceptaba un recorrido de tres paradas medido antes de
 * que el sidebar existiera. Al agotar `INTENTOS` se arranca con lo que haya.
 */
const LATIDO = 300;
const ESTABLES = 3;
const MIN_INTENTOS = 4;
const INTENTOS = 20;
/** Ancho de la tarjeta anclada; también su tope en pantallas chicas. */
const ANCHO = 340;
/** Ancho de la bienvenida y el cierre, que no anclan a nada. */
const ANCHO_CENTRADO = 420;
/**
 * Por debajo de esto la tarjeta se va abajo, a lo ancho: al lado de un
 * elemento no cabe, y centrada tapa justo lo que está señalando.
 */
const ANGOSTO = 640;

interface Recuadro {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Un elemento se puede señalar si está en el documento Y ocupa espacio.
 *
 * Lo segundo no es un detalle: por debajo de `lg` el sidebar existe en el DOM
 * pero mide 0×0, así que `querySelector` decía que sí y el recorrido se
 * quedaba clavado en un paso al que no le podía dibujar el recuadro.
 */
export function sePuedeSenalar(selector: string): boolean {
  return medir(selector) != null;
}

function medir(selector: string): Recuadro | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Trae el elemento a la vista antes de señalarlo (el sidebar puede scrollear). */
function acercar(selector: string, suave: boolean): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(selector);
  if (!el || typeof (el as HTMLElement).scrollIntoView !== 'function') return;
  try {
    (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
  } catch {
    // Un navegador sin opciones de scroll no puede tumbar el recorrido.
  }
}

/**
 * Dónde poner la tarjeta: debajo del elemento si cabe, si no encima, y
 * siempre dentro de la ventana. En pantalla angosta se va abajo, a lo ancho.
 *
 * Se calcula acá, aparte del componente, para poder probar los casos que se
 * rompen solos — un elemento pegado al borde, una ventana más angosta que la
 * tarjeta.
 */
export function ubicarTarjeta(
  recuadro: Recuadro,
  ventana: { width: number; height: number },
  alto = 200,
): { top: number; left: number; ancho: number } {
  if (ventana.width < ANGOSTO) {
    // Abajo y a lo ancho: al lado no cabe, y centrada taparía lo señalado.
    return {
      top: Math.max(MARGEN, ventana.height - alto - MARGEN),
      left: MARGEN,
      ancho: Math.max(0, ventana.width - MARGEN * 2),
    };
  }

  const debajo = recuadro.top + recuadro.height + MARGEN * 2;
  const cabeDebajo = debajo + alto < ventana.height;
  const top = cabeDebajo
    ? debajo
    : Math.max(MARGEN, recuadro.top - alto - MARGEN * 2);

  const centrado = recuadro.left + recuadro.width / 2 - ANCHO / 2;
  const left = Math.min(
    Math.max(MARGEN, centrado),
    Math.max(MARGEN, ventana.width - ANCHO - MARGEN),
  );

  return { top, left, ancho: ANCHO };
}

/** Los focusables de la tarjeta, para atrapar el Tab adentro. */
function focusables(caja: HTMLElement): HTMLElement[] {
  return Array.from(
    caja.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
  );
}

export function TourDelPanel() {
  const { t } = useI18n();
  const { user, agency } = useAuth();
  const { tourDismissed, setTourDismissed } = usePanelPrefs();
  const reducirMovimiento = useReducedMotion();
  // Los permisos deciden qué filas del sidebar existen. Medir antes de que
  // resuelvan es medir el esqueleto. `…Safe` porque el recorrido tiene que
  // poder montarse (y probarse) sin el provider.
  const permisos = usePermissionsContextSafe();
  const permisosListos = permisos == null || !permisos.isLoading;

  const [pasos, setPasos] = useState<PasoDelTour[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [recuadro, setRecuadro] = useState<Recuadro | null>(null);
  /**
   * El alto REAL de la tarjeta. Leerlo del ref durante el render devuelve el de
   * la pantalla ANTERIOR (o el valor por defecto en la primera), y con eso la
   * tarjeta pegada abajo en pantalla angosta se salía 47 px por el pie. Se mide
   * después de pintar y se vuelve a ubicar con el número bueno.
   */
  const [altoTarjeta, setAltoTarjeta] = useState(220);
  const tarjetaRef = useRef<HTMLDivElement | null>(null);
  const focoPrevioRef = useRef<HTMLElement | null>(null);
  const yaArrancoRef = useRef(false);

  const activo = tourDismissed === false;

  // Los pasos se resuelven al arrancar el recorrido, no al montar: el panel
  // tarda en pintar el sidebar y la píldora, y medir antes daría un recorrido
  // recortado (ver `LATIDO`).
  useEffect(() => {
    if (!activo) {
      setPasos(null);
      setIndice(0);
      yaArrancoRef.current = false;
      return;
    }
    // Un refetch de permisos no puede reiniciar un recorrido ya empezado.
    if (!permisosListos || yaArrancoRef.current) return;
    let cancelado = false;
    let anterior = -1;
    let estables = 0;
    let intentos = 0;
    let id: ReturnType<typeof setTimeout>;

    const arrancar = (visibles: PasoDelTour[]) => {
      yaArrancoRef.current = true;
      setPasos(visibles);
      setIndice(0);
      // Nadie a quien señalar ⇒ el recorrido no arranca y la preferencia se
      // apaga igual, para no reintentarlo en cada navegación.
      if (visibles.length === 0) setTourDismissed(true);
    };

    const contar = () => {
      if (cancelado) return;
      const hay = (sel: string) => document.querySelector(sel) != null;

      // Con el muro de la puesta en marcha —o un modal que la persona abrió—
      // no se arranca, y la preferencia se deja COMO ESTÁ, para que el
      // recorrido salga solo cuando la capa caiga, en vez de perderse.
      if (elPanelEstaBloqueado(hay)) {
        setPasos(null);
        return;
      }

      const visibles = pasosVisibles(sePuedeSenalar);
      intentos += 1;
      estables = visibles.length === anterior ? estables + 1 : 0;
      anterior = visibles.length;
      const asentado = visibles.length > 0 && estables >= ESTABLES && intentos >= MIN_INTENTOS;
      if (asentado || intentos >= INTENTOS) {
        arrancar(visibles);
        return;
      }
      id = setTimeout(contar, LATIDO);
    };

    id = setTimeout(contar, LATIDO);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [activo, permisosListos, setTourDismissed]);

  const pantallas = useMemo<PantallaDelTour[]>(
    () => (pasos ? pantallasDelTour(pasos) : []),
    [pasos],
  );
  const pantalla = pantallas[indice] ?? null;
  const selectorActual = pantalla?.tipo === 'paso' ? pantalla.paso.selector : null;

  // El recuadro se remide en scroll y resize: el elemento se mueve y el hueco
  // tiene que seguirlo, si no el recorrido señala aire. Y si el elemento se
  // fue entre que se armó el guion y que llegó su turno, el paso se salta.
  useLayoutEffect(() => {
    if (!selectorActual) {
      setRecuadro(null);
      return;
    }
    acercar(selectorActual, !reducirMovimiento);
    const medida = medir(selectorActual);
    if (!medida) {
      setIndice((i) => i + 1);
      return;
    }
    setRecuadro(medida);
    // 🔴 Si al remedir el elemento ya no ocupa espacio —achicar la ventana por
    // debajo de `lg` esconde el sidebar entero— el paso se salta en vez de
    // dejar el recorrido congelado sobre un recuadro que no existe.
    const remedir = () => {
      const ahora = medir(selectorActual);
      if (!ahora) {
        setIndice((i) => i + 1);
        return;
      }
      setRecuadro(ahora);
    };
    window.addEventListener('scroll', remedir, true);
    window.addEventListener('resize', remedir);
    return () => {
      window.removeEventListener('scroll', remedir, true);
      window.removeEventListener('resize', remedir);
    };
  }, [selectorActual, reducirMovimiento]);

  const cerrar = useCallback(() => {
    setTourDismissed(true);
    setPasos(null);
    setIndice(0);
    // El foco vuelve a donde estaba: cerrar una capa no puede dejar a quien
    // navega con teclado al principio del documento.
    const previo = focoPrevioRef.current;
    focoPrevioRef.current = null;
    if (previo && typeof previo.focus === 'function' && previo.isConnected) previo.focus();
  }, [setTourDismissed]);

  const abierto = activo && pantalla != null && (pantalla.tipo !== 'paso' || recuadro != null);

  useLayoutEffect(() => {
    const caja = tarjetaRef.current;
    if (!caja) return;
    const medirAlto = () => {
      const h = caja.offsetHeight;
      if (h) setAltoTarjeta((previo) => (previo === h ? previo : h));
    };
    medirAlto();
    // El alto también cambia sin cambiar de pantalla (la ventana se angosta y
    // el cuerpo pasa a tres líneas), así que se observa en vez de medir una vez.
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medirAlto);
    observador.observe(caja);
    return () => observador.disconnect();
  }, [abierto, indice]);

  const avanzar = useCallback(() => {
    setIndice((i) => (i + 1 >= pantallas.length ? i : i + 1));
  }, [pantallas.length]);
  const retroceder = useCallback(() => setIndice((i) => Math.max(0, i - 1)), []);

  // Foco: se guarda el de antes, se lleva a la tarjeta, y en cada pantalla
  // nueva vuelve a la tarjeta para que el lector de pantalla lea el paso.
  useEffect(() => {
    if (!abierto) return;
    if (!focoPrevioRef.current && typeof document !== 'undefined') {
      const activoAhora = document.activeElement;
      focoPrevioRef.current = activoAhora instanceof HTMLElement ? activoAhora : null;
    }
    tarjetaRef.current?.focus();
  }, [abierto, indice]);

  // Teclado: →/Enter avanza · ← retrocede · Esc omite · Tab da vueltas adentro.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrar();
        return;
      }
      if (e.key === 'Tab') {
        const caja = tarjetaRef.current;
        if (!caja) return;
        const items = focusables(caja);
        if (items.length === 0) {
          e.preventDefault();
          caja.focus();
          return;
        }
        const primero = items[0]!;
        const ultimo = items[items.length - 1]!;
        const foco = document.activeElement;
        if (e.shiftKey && (foco === primero || foco === caja)) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && foco === ultimo) {
          e.preventDefault();
          primero.focus();
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        retroceder();
        return;
      }
      // Enter sólo desde la tarjeta misma: sobre un botón ya lo activa el
      // navegador, y atajarlo acá lo dispararía dos veces.
      const esUltimaPantalla = indice >= pantallas.length - 1;
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === tarjetaRef.current)) {
        e.preventDefault();
        if (esUltimaPantalla) cerrar();
        else avanzar();
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, avanzar, retroceder, cerrar, indice, pantallas.length]);

  if (!abierto || !pantalla) return null;
  if (typeof document === 'undefined') return null;

  const ventana = { width: window.innerWidth, height: window.innerHeight };
  const anclada = pantalla.tipo === 'paso' && recuadro != null;
  const ubicacion = anclada && recuadro ? ubicarTarjeta(recuadro, ventana, altoTarjeta) : null;

  const total = pantalla.tipo === 'paso' ? pantalla.totalDePasos : (pasos?.length ?? 0);
  const nPaso = pantalla.tipo === 'paso' ? pantalla.indiceDelPaso + 1 : 0;
  const avance =
    pantalla.tipo === 'bienvenida' ? 0 : pantalla.tipo === 'cierre' ? 1 : nPaso / Math.max(1, total);

  const idTitulo = 'tour-del-panel-titulo';
  const duracion = reducirMovimiento ? 0 : 0.18;
  // El velo se oscurece con la tinta de la casa: en oscuro `--ink` ya es
  // `#0a0a0a`, así que el recorrido no aclara ni ensucia el tema.
  const velo = 'color-mix(in srgb, var(--ink) 62%, transparent)';

  const nombre = user?.firstName?.trim() || user?.name?.trim() || '';
  const nombreInmobiliaria =
    agency?.name?.trim() || t('inmobiliaria.tour.bienvenida.tuInmobiliaria');

  return createPortal(
    <div
      className="fixed inset-0 z-[400]"
      data-testid="tour-del-panel"
      data-pantalla={pantalla.tipo}
    >
      {/* El velo. En la bienvenida y el cierre cubre todo; en un paso lo pinta
          el propio recorte con su `box-shadow`, y ponerlo dos veces oscurecería
          el doble. Sin `onClick`: se cierra por la ✕, «Omitir» o Esc. */}
      {anclada && recuadro ? (
        <motion.div
          aria-hidden
          data-testid="tour-foco"
          className="pointer-events-none absolute rounded-lg"
          initial={false}
          animate={{
            top: recuadro.top - MARGEN,
            left: recuadro.left - MARGEN,
            width: recuadro.width + MARGEN * 2,
            height: recuadro.height + MARGEN * 2,
          }}
          transition={
            reducirMovimiento ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }
          }
          style={{ boxShadow: `0 0 0 9999px ${velo}` }}
        >
          {/* El halo: un anillo con el primario que respira muy despacio. */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-lg"
            style={{ boxShadow: `0 0 0 2px hsl(var(--primary)), 0 0 0 8px hsl(var(--primary) / 0.18)` }}
            animate={reducirMovimiento ? { opacity: 1 } : { opacity: [0.55, 1, 0.55] }}
            transition={
              reducirMovimiento
                ? { duration: 0 }
                : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            }
          />
        </motion.div>
      ) : (
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: duracion }}
          style={{ backgroundColor: velo }}
        />
      )}

      {/* 🔴 La POSICIÓN vive en este envoltorio, no en la tarjeta: framer-motion
          escribe `transform` en línea para animar, y eso le gana a las clases
          `-translate-x-1/2` de Tailwind — la bienvenida quedaba arrancando en el
          centro en vez de centrada. Acá el centrado es flex y no hay transform
          que pisar. */}
      <div
        className={
          ubicacion
            ? 'absolute'
            : 'pointer-events-none absolute inset-0 flex items-center justify-center p-4'
        }
        style={
          ubicacion
            ? { top: ubicacion.top, left: ubicacion.left, width: ubicacion.ancho, maxWidth: 'calc(100vw - 16px)' }
            : undefined
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pantalla.tipo === 'paso' ? pantalla.paso.id : pantalla.tipo}
            ref={tarjetaRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            tabIndex={-1}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: duracion }}
            style={ubicacion ? undefined : { width: ANCHO_CENTRADO, maxWidth: '100%' }}
            className={
              ubicacion
                ? 'max-h-[calc(100vh-16px)] w-full overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-xl outline-none'
                : 'pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-xl outline-none'
            }
            data-testid="tour-tarjeta"
          >
            {/* Lo que el lector de pantalla anuncia en cada cambio de pantalla. */}
            <p className="sr-only" aria-live="polite">
              {pantalla.tipo === 'paso'
                ? `${t('inmobiliaria.tour.paso', { n: nPaso, total })} — ${t(pantalla.paso.tituloKey)}`
                : t(
                    pantalla.tipo === 'bienvenida'
                      ? 'inmobiliaria.tour.bienvenida.titulo'
                      : 'inmobiliaria.tour.cierre.titulo',
                    { inmobiliaria: nombreInmobiliaria },
                  )}
            </p>

            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-caption uppercase tracking-wide text-fg-subtle">
                {pantalla.tipo === 'paso'
                  ? t('inmobiliaria.tour.paso', { n: nPaso, total })
                  : nombre
                    ? t('inmobiliaria.tour.bienvenida.saludo', { nombre })
                    : '\u00A0'}
              </p>
              <Button
                variant="ghost"
                size="icon"
                hideArrow
                onClick={cerrar}
                aria-label={t('inmobiliaria.tour.cerrar')}
                className="-mr-2 -mt-2 h-8 w-8 shrink-0 text-fg-subtle hover:text-fg"
                data-testid="tour-cerrar"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            {/* El progreso real: cuánto del recorrido va, contando sólo los pasos
                anclados (la bienvenida arranca en cero y el cierre lo completa). */}
            <div
              className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-label={t('inmobiliaria.tour.progreso')}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={pantalla.tipo === 'cierre' ? total : nPaso}
              data-testid="tour-progreso"
            >
              <motion.span
                className="block h-full rounded-full"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
                initial={false}
                animate={{ width: `${Math.round(avance * 100)}%` }}
                transition={{ duration: duracion }}
              />
            </div>

            <h2 id={idTitulo} className="mt-3 text-base font-semibold text-fg">
              {pantalla.tipo === 'paso'
                ? t(pantalla.paso.tituloKey)
                : t(
                    pantalla.tipo === 'bienvenida'
                      ? 'inmobiliaria.tour.bienvenida.titulo'
                      : 'inmobiliaria.tour.cierre.titulo',
                    { inmobiliaria: nombreInmobiliaria },
                  )}
            </h2>

            {pantalla.tipo === 'paso' && (
              <>
                <p className="mt-1.5 text-body-sm text-fg-muted">{t(pantalla.paso.cuerpoKey)}</p>
                {pantalla.paso.datoKey && (
                  <p className="mt-2 border-l-2 border-border pl-3 text-body-sm text-fg-subtle">
                    {t(pantalla.paso.datoKey)}
                  </p>
                )}
              </>
            )}

            {pantalla.tipo === 'bienvenida' && (
              <p className="mt-1.5 text-body-sm text-fg-muted">
                {t('inmobiliaria.tour.bienvenida.cuerpo', { total })}
              </p>
            )}

            {pantalla.tipo === 'cierre' && (
              <>
                <ul className="mt-3 space-y-2">
                  {['punto1', 'punto2', 'punto3'].map((k) => (
                    <li key={k} className="flex gap-2 text-body-sm text-fg-muted">
                      <span
                        aria-hidden
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                      />
                      {t(`inmobiliaria.tour.cierre.${k}`)}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-body-sm text-fg-subtle">
                  {t('inmobiliaria.tour.cierre.volver')}
                </p>
              </>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              {/* Omitir, en TODAS las pantallas: es la promesa del recorrido. */}
              <Button
                variant="link"
                size="sm"
                hideArrow
                onClick={cerrar}
                className="h-auto px-0 text-fg-muted hover:text-fg"
                data-testid="tour-saltar"
              >
                {t('inmobiliaria.tour.saltar')}
              </Button>

              <div className="flex items-center gap-2">
                {indice > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    hideArrow
                    onClick={retroceder}
                    data-testid="tour-atras"
                  >
                    {t('inmobiliaria.tour.atras')}
                  </Button>
                )}
                <Button
                  size="sm"
                  hideArrow
                  onClick={pantalla.tipo === 'cierre' ? cerrar : avanzar}
                  data-testid="tour-siguiente"
                >
                  {t(
                    pantalla.tipo === 'bienvenida'
                      ? 'inmobiliaria.tour.empezar'
                      : pantalla.tipo === 'cierre'
                        ? 'inmobiliaria.tour.entendido'
                        : 'inmobiliaria.tour.siguiente',
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  );
}

export { PASOS_DEL_TOUR };
