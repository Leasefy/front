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
 * 2. **Omitir está en todos los pasos** y cuenta como visto, igual que llegar
 *    al final — para TODA la inmobiliaria y una sola vez (Nico, 23-09: «si le
 *    da omitir no vuelve a aparecer y si lo ve completo no vuelve a
 *    aparecer»). Omitir, la ✕ y Esc guardan `omitido`; «Entendido» en el
 *    cierre, `completo` (`cerrarRecorrido`, `PanelPrefsContext`). Mientras
 *    no se sabe si la agencia ya lo vio (`tourDismissed === null`), no se
 *    monta.
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
 * 7. **Es lo ÚLTIMO de una cuenta nueva** (Nico, 30-09-2026): con migración,
 *    muro → confeti → segundo factor → recorrido; sin migración, la pregunta
 *    previa → segundo factor → recorrido. Arranca solo cuando no queda nada
 *    delante (`motivoParaEsperar`), lo mira cada `LATIDO` en vez de una vez, y
 *    si algo aparece con él abierto se PAUSA: se esconde sin marcarse visto y
 *    vuelve en la misma pantalla.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, preload } from 'react-dom';
import Image, { getImageProps } from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AirTrafficControl,
  ArrowLeft,
  ArrowRight,
  Buildings,
  ChartLine,
  ChatsCircle,
  Check,
  ClipboardText,
  Compass,
  CurrencyDollar,
  FilePlus,
  Lightbulb,
  MagnifyingGlass,
  Plus,
  UserCircle,
  X,
  type Icon,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { ASPA_DE_CIERRE } from '@/components/ui/aspa-de-cierre';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth/use-auth';
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { useMigracion } from '@/components/migracion/migracion-context';
import {
  PASOS_DEL_TOUR,
  elPanelEstaBloqueado,
  motivoParaEsperar,
  pantallasDelTour,
  pasosVisibles,
  type MotivoParaEsperar,
  type PantallaDelTour,
  type PasoDelTour,
  type SenalesDelPanel,
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
/**
 * Después de que cae una capa (el muro, el confeti, el segundo factor), la
 * calma que se pide antes de arrancar es más larga: al tocar «Entrar a
 * Leasefy» la sesión se refresca y RECIÉN AHÍ se sabe si hay que pedir el
 * segundo factor. Con los 1,2 s de siempre el recorrido alcanzaba a asomarse
 * antes de que `ProtectedRoute` se llevara a la persona a activarlo.
 */
const MIN_INTENTOS_TRAS_UNA_CAPA = 8;
/**
 * Cuánto se espera a que el muro conteste antes de arrancar igual. Sin esto,
 * con un back lento el recorrido salía y a los pocos segundos lo tapaba la
 * pregunta «¿Migramos tu inmobiliaria?». Con tope: si el muro nunca contesta
 * (el back falló), el recorrido no se pierde — ante la duda, el panel se ve.
 */
const ESPERA_POR_EL_MURO_MS = 6000;
/**
 * Ancho de la tarjeta anclada; también su tope en pantallas chicas. Era 340:
 * con el ícono de la parada, el dato en su pozo y el avance por paradas
 * (glow up, 30-09) el cuerpo quedaba en renglones de cuatro palabras.
 */
export const ANCHO_DE_LA_TARJETA = 360;
const ANCHO = ANCHO_DE_LA_TARJETA;
/** Hasta dónde llega la columna del sidebar (240 px + aire): lo que termina antes, se señala desde el costado. */
const COLUMNA_LATERAL = 320;
/**
 * Ancho de la bienvenida y el cierre, que no anclan a nada. Era 420: una
 * tarjeta chica con tres renglones de texto (Nico, 30-09: «super básico, usa
 * alguna imagen, hazlo más grande, más bonito»). Ahora son dos columnas —la
 * foto de marca y el contenido— y en pantalla angosta se apilan.
 */
const ANCHO_CENTRADO = 760;
/**
 * Las fotos de marca del recorrido: la marca instalada en espacios reales.
 * Las tres que `AgentIntroModal` le reservó al recorrido son la 02, la 09 y la
 * 15 (ver la nota de `AGENT_INTROS`). La bienvenida abre con una ENTRADA (la
 * 02: el portal de un edificio al atardecer) y el cierre termina ADENTRO (la
 * 15: la recepción de noche): se entra al panel y se queda uno en él.
 */
const FOTO_DE_LA_BIENVENIDA = '/images/features/leasefy-brand-02.jpg';
const FOTO_DEL_CIERRE = '/images/features/leasefy-brand-15.jpg';
/** El ancho que ocupa la foto: la columna en escritorio, todo el ancho en teléfono. */
const TAMANOS_DE_LA_FOTO = '(min-width: 640px) 320px, 100vw';

/**
 * Baja las dos fotos mientras el recorrido todavía espera (el muro, el
 * segundo factor, el conteo), con el MISMO `srcset` que va a pedir
 * `next/image`: medido en el navegador, la foto del cierre llegaba un rato
 * después que la tarjeta y la columna se veía gris.
 */
function precargarLasFotos(): void {
  for (const src of [FOTO_DE_LA_BIENVENIDA, FOTO_DEL_CIERRE]) {
    try {
      const { props } = getImageProps({ src, alt: '', fill: true, sizes: TAMANOS_DE_LA_FOTO });
      preload(props.src, {
        as: 'image',
        imageSrcSet: props.srcSet,
        imageSizes: props.sizes,
        fetchPriority: 'low',
      });
    } catch {
      // Sin precarga la foto llega igual, sólo un poco después.
    }
  }
}
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

/**
 * Si el objetivo vive dentro de una sección PLEGADA del sidebar (secciones
 * plegables, 22-09), la abre con su propio botón antes de medir: cerrada, la
 * caja mide 0 de alto y el anillo rodearía una fila invisible. Devuelve true
 * si tuvo que abrir, para que quien llama vuelva a medir cuando termine la
 * animación de altura. Se aprieta el botón (y no se toca el estado por fuera)
 * para que la sección quede abierta como si la persona la hubiera abierto:
 * también se guarda así.
 */
export function abrirSuSeccion(selector: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.querySelector(selector);
  const caja = el?.closest<HTMLElement>('[data-abierta="false"]');
  if (!caja?.id) return false;
  const boton = document.querySelector<HTMLButtonElement>(`button[aria-controls="${caja.id}"]`);
  if (!boton) return false;
  boton.click();
  return true;
}

/** Lo que dura la animación de altura de una sección, con un poco de margen. */
const APERTURA_DE_SECCION = 260;

/** Trae el elemento a la vista antes de señalarlo (el sidebar puede scrollear). */
function acercar(selector: string, suave: boolean): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(selector);
  if (!el || typeof (el as HTMLElement).scrollIntoView !== 'function') return;
  try {
    // `center` y no `nearest`: con `nearest` el ítem de abajo del menú
    // (Reportes, paso 7) quedaba pegado al borde del área que scrollea, medio
    // tapado por la tarjeta «Invita a tu equipo» del pie, y el anillo se veía
    // cortado encima de ella (Nico, 22-09).
    (el as HTMLElement).scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
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

  // 🔴 Lo que vive en la columna de la izquierda (el sidebar: 240 px, o 64 el
  // riel) se señala con la tarjeta AL LADO, a la derecha. Nico (22-09) vio los
  // pasos 6 y 7 con la tarjeta debajo/encima del ítem, montada SOBRE el
  // sidebar: tapaba justo lo que se estaba mostrando y las filas vecinas. A la
  // derecha no tapa nada del menú; se centra en el alto del ítem y no sale de
  // la ventana. Si no cabe al lado, vale lo de siempre (debajo, o encima).
  const derecha = recuadro.left + recuadro.width + MARGEN * 2;
  const esDeLaColumnaLateral = recuadro.left + recuadro.width <= COLUMNA_LATERAL;
  if (esDeLaColumnaLateral && derecha + ANCHO + MARGEN <= ventana.width) {
    const centradoEnAlto = recuadro.top + recuadro.height / 2 - alto / 2;
    const top = Math.min(
      Math.max(MARGEN, centradoEnAlto),
      Math.max(MARGEN, ventana.height - alto - MARGEN),
    );
    return { top, left: derecha, ancho: ANCHO };
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
  const { user, agency, mfaRequired, mfaEnrollRequired } = useAuth();
  const { tourDismissed, cerrarRecorrido } = usePanelPrefs();
  const reducirMovimiento = useReducedMotion();
  // Los permisos deciden qué filas del sidebar existen. Medir antes de que
  // resuelvan es medir el esqueleto. `…Safe` porque el recorrido tiene que
  // poder montarse (y probarse) sin el provider.
  const permisos = usePermissionsContextSafe();
  const permisosListos = permisos == null || !permisos.isLoading;

  // ── Lo que hay delante (ver `motivoParaEsperar`) ─────────────────────────
  // Se LEE de lo que ya existe: la sesión (segundo factor), el contexto del
  // muro y el DOM. `null` fuera del panel de la inmobiliaria ⇒ no hay muro.
  const migracion = useMigracion();
  //
  // `panelTapado` es LA señal del muro (la publica `MuroDeMigracion` desde el
  // 30-09): `true` mientras el muro, la pregunta previa, la migración abierta
  // a mano o la bienvenida con confeti tapan el panel. Pero antes de que el
  // muro conteste vale `false` —«todavía no sé» no es «no tapa»—, así que
  // mientras `estado` sea null se espera un poco (`ESPERA_POR_EL_MURO_MS`).
  const senales: SenalesDelPanel = {
    segundoFactorPendiente: Boolean(mfaRequired || mfaEnrollRequired),
    muro:
      migracion == null
        ? 'libre'
        : migracion.panelTapado === true || migracion.estado?.bloquea === true
          ? 'bloquea'
          : migracion.estado == null
            ? 'sin-contestar'
            : 'libre',
  };
  // Espejo para el latido, que corre fuera del render.
  const senalesRef = useRef(senales);
  senalesRef.current = senales;
  /**
   * El último motivo medido por el latido. `'sin-mirar'` hasta la primera
   * medición: arrancar a contar antes de mirar es justo lo que no se quiere.
   */
  const [delante, setDelante] = useState<MotivoParaEsperar | 'sin-mirar' | null>('sin-mirar');
  /** Hubo algo delante en esta sesión del recorrido ⇒ la calma pedida es más larga. */
  const vioAlgoDelanteRef = useRef(false);

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

  /*
   * 🔴 EL LATIDO: qué hay delante, medido cada `LATIDO` mientras el recorrido
   * está pendiente (y también con él abierto, para pausarlo).
   *
   * Hasta el 30-09 esto se miraba UNA vez, dentro del conteo, y si había una
   * capa el conteo se cortaba sin volver a programarse. El comentario decía
   * «para que el recorrido salga solo cuando la capa caiga», pero nadie lo
   * despertaba: las dependencias del efecto eran `[activo, permisosListos]` y
   * ninguna cambia cuando el muro baja. La cuenta nueva que entraba con el
   * muro puesto se quedaba sin recorrido toda la sesión (Nico, 30-09: «no se
   * está mostrando de manera automática a las cuentas nuevas»).
   *
   * Son cinco `querySelector` cada 300 ms, y sólo mientras la inmobiliaria no
   * lo haya visto: una vez por agencia.
   */
  useEffect(() => {
    if (!activo) {
      setDelante('sin-mirar');
      return;
    }
    precargarLasFotos();
    const desde = Date.now();
    let id: ReturnType<typeof setTimeout>;
    const mirar = () => {
      const actuales = senalesRef.current;
      const motivo = motivoParaEsperar((sel) => document.querySelector(sel) != null, {
        ...actuales,
        // El muro sin respuesta se espera, pero no para siempre.
        muro:
          actuales.muro === 'sin-contestar' && Date.now() - desde >= ESPERA_POR_EL_MURO_MS
            ? 'libre'
            : actuales.muro,
      });
      // Esperar la PRIMERA respuesta del muro no es que algo haya caído: no
      // alarga la calma de quien entra a un panel que ya estaba abierto.
      if (motivo && motivo !== 'muro-sin-contestar') vioAlgoDelanteRef.current = true;
      setDelante(motivo);
      id = setTimeout(mirar, LATIDO);
    };
    mirar();
    return () => clearTimeout(id);
  }, [activo]);

  // Lo que viene de React (sesión y muro) se obedece en el mismo render, sin
  // esperar al latido: un segundo factor pendiente esconde el recorrido YA.
  const libre =
    delante === null && !senales.segundoFactorPendiente && senales.muro !== 'bloquea';

  // Los pasos se resuelven al arrancar el recorrido, no al montar: el panel
  // tarda en pintar el sidebar y la píldora, y medir antes daría un recorrido
  // recortado (ver `LATIDO`). Mientras haya algo delante no se cuenta; cuando
  // cae, el efecto vuelve a correr con `libre` y el conteo empieza de cero.
  useEffect(() => {
    if (!activo) {
      setPasos(null);
      setIndice(0);
      yaArrancoRef.current = false;
      vioAlgoDelanteRef.current = false;
      return;
    }
    // Un refetch de permisos no puede reiniciar un recorrido ya empezado, y
    // una capa que aparece con el recorrido abierto lo PAUSA (ver `abierto`),
    // no lo vuelve a armar.
    if (!permisosListos || !libre || yaArrancoRef.current) return;
    let cancelado = false;
    let anterior = -1;
    let estables = 0;
    let intentos = 0;
    let id: ReturnType<typeof setTimeout>;
    const minimo = vioAlgoDelanteRef.current ? MIN_INTENTOS_TRAS_UNA_CAPA : MIN_INTENTOS;

    const arrancar = (visibles: PasoDelTour[]) => {
      yaArrancoRef.current = true;
      setPasos(visibles);
      setIndice(0);
      // Nadie a quien señalar (p. ej. el panel en un teléfono, sin sidebar) ⇒
      // el recorrido no arranca en esta sesión y NO se marca como visto: la
      // inmobiliaria no lo vio, y marcarlo acá se lo quitaría a quien entre
      // después desde un computador. `yaArrancoRef` evita reintentarlo en
      // cada navegación.
    };

    const contar = () => {
      if (cancelado) return;
      // Una capa que aparece ENTRE dos latidos: se deja de contar hasta que
      // caiga, y se vuelve a mirar (nunca se corta: ése era el defecto).
      if (elPanelEstaBloqueado((sel) => document.querySelector(sel) != null)) {
        vioAlgoDelanteRef.current = true;
        anterior = -1;
        estables = 0;
        intentos = 0;
        id = setTimeout(contar, LATIDO);
        return;
      }

      const visibles = pasosVisibles(sePuedeSenalar);
      intentos += 1;
      estables = visibles.length === anterior ? estables + 1 : 0;
      anterior = visibles.length;
      const asentado = visibles.length > 0 && estables >= ESTABLES && intentos >= minimo;
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
  }, [activo, permisosListos, libre]);

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
    // En pausa (una capa delante) no se mide ni se escucha nada: detrás de un
    // muro el elemento puede medir cero y el paso se saltaría sin que nadie
    // lo viera. Al reanudar, el efecto vuelve a correr y mide de nuevo.
    if (!libre) return;
    const abrio = abrirSuSeccion(selectorActual);
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
    // Recién abierta, la sección todavía está creciendo: se vuelve a acercar
    // y a medir cuando termina (ni `scroll` ni `resize` avisan de eso).
    const trasAbrir = abrio
      ? setTimeout(() => {
          acercar(selectorActual, false);
          remedir();
        }, APERTURA_DE_SECCION)
      : undefined;
    return () => {
      if (trasAbrir) clearTimeout(trasAbrir);
      window.removeEventListener('scroll', remedir, true);
      window.removeEventListener('resize', remedir);
    };
  }, [selectorActual, reducirMovimiento, libre]);

  const cerrar = useCallback((estado: 'completo' | 'omitido') => {
    void cerrarRecorrido(estado);
    setPasos(null);
    setIndice(0);
    // El foco vuelve a donde estaba: cerrar una capa no puede dejar a quien
    // navega con teclado al principio del documento.
    const previo = focoPrevioRef.current;
    focoPrevioRef.current = null;
    if (previo && typeof previo.focus === 'function' && previo.isConnected) previo.focus();
  }, [cerrarRecorrido]);

  // `libre` también cuenta con el recorrido ya empezado: una capa que aparece
  // encima (el muro abierto a mano, un modal que la persona pidió) lo PAUSA.
  // Se esconde sin marcar nada, sin teclado vivo —Esc no lo «omite» a
  // ciegas— y vuelve en la misma pantalla cuando la capa cae.
  const abierto =
    activo && libre && pantalla != null && (pantalla.tipo !== 'paso' || recuadro != null);

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
        cerrar('omitido');
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
        if (esUltimaPantalla) cerrar('completo');
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
  const hechos = pantalla.tipo === 'bienvenida' ? 0 : pantalla.tipo === 'cierre' ? total : nPaso;

  const idTitulo = 'tour-del-panel-titulo';
  const animar = !reducirMovimiento;
  const duracion = animar ? 0.18 : 0;
  // El velo se oscurece con la tinta de la casa: en oscuro `--ink` ya es
  // `#0a0a0a`, así que el recorrido no aclara ni ensucia el tema.
  const velo = 'color-mix(in srgb, var(--ink) 62%, transparent)';

  const nombre = user?.firstName?.trim() || user?.name?.trim() || '';
  const nombreInmobiliaria =
    agency?.name?.trim() || t('inmobiliaria.tour.bienvenida.tuInmobiliaria');

  const titulo =
    pantalla.tipo === 'paso'
      ? t(pantalla.paso.tituloKey)
      : t(
          pantalla.tipo === 'bienvenida'
            ? 'inmobiliaria.tour.bienvenida.titulo'
            : 'inmobiliaria.tour.cierre.titulo',
          { inmobiliaria: nombreInmobiliaria },
        );

  const progreso = (
    <ProgresoPorParadas total={total} hechos={hechos} etiqueta={t('inmobiliaria.tour.progreso')} />
  );

  const aspa = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => cerrar('omitido')}
      aria-label={t('inmobiliaria.tour.cerrar')}
      className={ASPA_DE_CIERRE}
      data-testid="tour-cerrar"
    >
      <X size={16} weight="bold" aria-hidden />
    </Button>
  );

  // Omitir, en TODAS las pantallas: es la promesa del recorrido.
  //
  // En la bienvenida y el cierre, en teléfono, el pie se apila: los botones
  // arriba (el primario a lo ancho) y «Omitir» debajo. En una fila no cabían
  // «Omitir», «Atrás» y «Empezar a trabajar» en 310 px y el cierre se salía
  // de la tarjeta por la derecha (medido a 390 px).
  const centrada = pantalla.tipo !== 'paso';
  const pie = (
    <div
      className={cn(
        'flex gap-3',
        centrada
          ? 'flex-col-reverse sm:flex-row sm:items-center sm:justify-between'
          : 'items-center justify-between',
      )}
    >
      <Button
        variant="link"
        size="sm"
        hideArrow
        onClick={() => cerrar('omitido')}
        className={cn('h-auto px-0 text-fg-muted hover:text-fg', centrada && 'self-center sm:self-auto')}
        data-testid="tour-saltar"
      >
        {t('inmobiliaria.tour.saltar')}
      </Button>

      <div className={cn('flex items-center gap-2', centrada && 'w-full sm:w-auto')}>
        {indice > 0 && (
          <Button
            variant="outline"
            size={pantalla.tipo === 'paso' ? 'sm' : 'default'}
            hideArrow
            onClick={retroceder}
            data-testid="tour-atras"
          >
            <ArrowLeft size={14} weight="bold" aria-hidden className="mr-1.5" />
            {t('inmobiliaria.tour.atras')}
          </Button>
        )}
        <Button
          size={pantalla.tipo === 'paso' ? 'sm' : 'default'}
          hideArrow
          onClick={pantalla.tipo === 'cierre' ? () => cerrar('completo') : avanzar}
          className={cn(centrada && 'flex-1 sm:flex-none')}
          data-testid="tour-siguiente"
        >
          {t(
            pantalla.tipo === 'bienvenida'
              ? 'inmobiliaria.tour.empezar'
              : pantalla.tipo === 'cierre'
                ? 'inmobiliaria.tour.entendido'
                : 'inmobiliaria.tour.siguiente',
          )}
          {pantalla.tipo !== 'cierre' && (
            <ArrowRight size={14} weight="bold" aria-hidden className="ml-1.5" />
          )}
        </Button>
      </div>
    </div>
  );

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
        // 🔴 Las dos ramas llevan `key` DISTINTA. Sin ella React reusaba el
        // mismo nodo (las dos son `motion.div` en la misma posición) al pasar
        // de un paso al cierre: el velo heredaba el `top/left/width/height` en
        // línea que framer le había escrito al recorte y quedaba como un
        // rectángulo gris sobre «Buscar», con el resto de la pantalla sin
        // oscurecer (Nico, 22-09, «Eso es todo»).
        <motion.div
          key="tour-foco"
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
          transition={animar ? { type: 'spring', stiffness: 380, damping: 36 } : { duration: 0 }}
          style={{ boxShadow: `0 0 0 9999px ${velo}` }}
        >
          {/* El halo: un anillo con el primario que respira muy despacio. */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-lg"
            style={{ boxShadow: `0 0 0 2px hsl(var(--primary)), 0 0 0 8px hsl(var(--primary) / 0.18)` }}
            animate={animar ? { opacity: [0.55, 1, 0.55] } : { opacity: 1 }}
            transition={
              animar ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }
            }
          />
        </motion.div>
      ) : (
        <motion.div
          key="tour-velo"
          aria-hidden
          data-testid="tour-velo"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: animar ? 0.24 : 0 }}
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
            // Sólo lo que se ve: la tarjeta sube un poco y aparece. Con
            // «reducir movimiento» no se mueve nada.
            initial={animar ? { opacity: 0, y: 10, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={animar ? { opacity: 0, y: -6, scale: 0.98 } : { opacity: 0 }}
            transition={{ duration: pantalla.tipo === 'paso' ? duracion : animar ? 0.32 : 0, ease: [0.22, 1, 0.36, 1] }}
            style={ubicacion ? undefined : { width: ANCHO_CENTRADO, maxWidth: '100%' }}
            // La cáscara es la de los modales hechos a mano (`rounded-[20px]`,
            // DESIGN §17) y la elevación, la de las capas: `shadow-lg`.
            className={cn(
              'overflow-y-auto overscroll-contain rounded-[20px] border border-border bg-surface shadow-lg outline-none',
              ubicacion
                ? 'max-h-[calc(100dvh-16px)] w-full p-5'
                : 'pointer-events-auto max-h-[calc(100dvh-32px)]',
            )}
            data-lenis-prevent
            data-testid="tour-tarjeta"
          >
            {/* Lo que el lector de pantalla anuncia en cada cambio de pantalla. */}
            <p className="sr-only" aria-live="polite">
              {pantalla.tipo === 'paso'
                ? `${t('inmobiliaria.tour.paso', { n: nPaso, total })} — ${titulo}`
                : titulo}
            </p>

            {pantalla.tipo === 'bienvenida' && (
              <PantallaCentrada foto={FOTO_DE_LA_BIENVENIDA} fotoAl="inicio" animar={animar} aspa={aspa}>
                {/* El texto se centra en el alto de la foto y el pie se apoya
                    abajo: sin la ruta (Nico, 30-09: «no es necesario dejarlo
                    ahí») la columna no queda con un hueco al final. */}
                <div className="my-auto">
                  <Eyebrow>
                    {nombre ? t('inmobiliaria.tour.bienvenida.saludo', { nombre }) : '\u00A0'}
                  </Eyebrow>
                  <h2
                    id={idTitulo}
                    className="mt-4 font-heading text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg [text-wrap:balance] sm:text-[32px]"
                  >
                    {titulo}
                  </h2>
                  <p className="mt-4 text-body text-fg-muted">
                    {t('inmobiliaria.tour.bienvenida.cuerpo', { total })}
                  </p>
                </div>
                <div className="mt-8">{pie}</div>
              </PantallaCentrada>
            )}

            {pantalla.tipo === 'paso' && (
              <>
                {progreso}
                <div className="mt-4 flex items-start gap-3">
                  <IconoDeLaParada id={pantalla.paso.id} />
                  <div className="min-w-0 flex-1">
                    <Eyebrow punto={false}>{t('inmobiliaria.tour.paso', { n: nPaso, total })}</Eyebrow>
                    <h2
                      id={idTitulo}
                      className="mt-1 font-heading text-[17px] font-semibold leading-snug tracking-[-0.01em] text-fg"
                    >
                      {titulo}
                    </h2>
                  </div>
                  <div className="-mr-1 -mt-1">{aspa}</div>
                </div>
                <p className="mt-3 text-body-sm text-fg-muted">{t(pantalla.paso.cuerpoKey)}</p>
                {pantalla.paso.datoKey && (
                  <p className="mt-3 flex gap-2.5 rounded-md bg-surface-muted px-3 py-2.5 text-caption text-fg-muted">
                    <Lightbulb size={16} aria-hidden className="mt-px shrink-0 text-primary" />
                    <span>{t(pantalla.paso.datoKey)}</span>
                  </p>
                )}
                <div className="mt-5">{pie}</div>
              </>
            )}

            {pantalla.tipo === 'cierre' && (
              <PantallaCentrada foto={FOTO_DEL_CIERRE} fotoAl="final" animar={animar} aspa={aspa}>
                <Eyebrow>{t('inmobiliaria.tour.cierre.eyebrow')}</Eyebrow>
                <h2
                  id={idTitulo}
                  className="mt-3 font-heading text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg [text-wrap:balance] sm:text-[30px]"
                >
                  {titulo}
                </h2>
                <div className="mt-5">{progreso}</div>
                <ul className="mt-5 space-y-3">
                  {['punto1', 'punto2', 'punto3'].map((k, i) => (
                    <motion.li
                      key={k}
                      initial={animar ? { opacity: 0, y: 6 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: animar ? 0.12 + i * 0.07 : 0, duration: animar ? 0.24 : 0 }}
                      className="flex gap-3 text-body-sm text-fg-muted"
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
                      >
                        <Check size={12} weight="bold" />
                      </span>
                      <span>{t(`inmobiliaria.tour.cierre.${k}`)}</span>
                    </motion.li>
                  ))}
                </ul>
                <p className="mt-5 flex gap-2.5 rounded-md bg-surface-muted px-3 py-2.5 text-caption text-fg-muted">
                  <Compass size={16} aria-hidden className="mt-px shrink-0 text-primary" />
                  <span>{t('inmobiliaria.tour.cierre.volver')}</span>
                </p>
                <div className="mt-7">{pie}</div>
              </PantallaCentrada>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Las piezas de la puesta en escena (glow up, 30-09-2026).
//
// Nico, de la bienvenida: «super básico, usa alguna imagen, hazlo más grande,
// más bonito». Y el mismo nivel en las paradas y en el cierre, para que no se
// vea un salto: las tres comparten la cáscara, el renglón de arriba (eyebrow
// en mono + la ✕ de la casa), el avance por paradas y el pie.
// ══════════════════════════════════════════════════════════════════════════

/**
 * El renglón de arriba: mono, mayúsculas, con el punto cobalto de la marca.
 * Las paradas lo llevan sin punto: su acento ya es el ícono de la parada.
 */
function Eyebrow({ children, punto = true }: { children: React.ReactNode; punto?: boolean }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
      {punto && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />}
      {children}
    </p>
  );
}

/**
 * El avance, UN segmento por parada. En la bienvenida está vacío y dice
 * cuántas son sin contarlas en texto; en cada paso se llena hasta donde va; en
 * el cierre, lleno. Es el mismo `progressbar` de antes, con sus números.
 */
function ProgresoPorParadas({
  total,
  hechos,
  etiqueta,
}: {
  total: number;
  hechos: number;
  etiqueta: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={hechos}
      className="flex gap-1"
      data-testid="tour-progreso"
    >
      {Array.from({ length: Math.max(1, total) }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'h-1 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none',
            i < hechos ? 'bg-primary' : 'bg-border',
          )}
        />
      ))}
    </div>
  );
}

/**
 * El ícono de cada parada es EL MISMO de la fila que señala (sidebar,
 * `arquitectura-del-panel.ts`; la píldora del Piloto; el perfil): lo que se
 * aprende en la tarjeta es lo que después se busca en el menú.
 */
const ICONO_DE_LA_PARADA: Record<string, Icon> = {
  buscador: MagnifyingGlass,
  nuevo: Plus,
  inmuebles: Buildings,
  postulaciones: ClipboardText,
  contratos: FilePlus,
  pagos: CurrencyDollar,
  reportes: ChartLine,
  piloto: AirTrafficControl,
  chat: ChatsCircle,
  perfil: UserCircle,
};

function IconoDeLaParada({ id }: { id: string }) {
  const Icono = ICONO_DE_LA_PARADA[id] ?? Compass;
  // Tinted Icon Tile (DESIGN §4): cobalto suave, el único acento del momento.
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"
    >
      <Icono size={20} />
    </span>
  );
}

/**
 * La bienvenida y el cierre: dos columnas, la foto de marca y el contenido.
 * En pantalla angosta la foto se vuelve una franja arriba. `fotoAl` la pone a
 * la izquierda en la bienvenida y a la derecha en el cierre: el recorrido abre
 * y cierra como un par.
 *
 * La ✕ va en la esquina de arriba a la derecha de TODO el modal, no de la
 * columna del texto (Nico, 30-09: «la x de cerrar en ambos no debería de
 * quedar en el lado derecho?»). En el cierre —y en teléfono, donde la foto es
 * la franja de arriba— queda sobre la foto: el chip de la casa es sólido
 * (`bg-surface-muted`) con un filete (`ring-border`) y una sombra suave para
 * despegarse de ella, en claro y en oscuro. Va
 * primera en el DOM: sigue siendo lo primero que encuentra el Tab.
 */
function PantallaCentrada({
  foto,
  fotoAl,
  animar,
  aspa,
  children,
}: {
  foto: string;
  fotoAl: 'inicio' | 'final';
  animar: boolean;
  aspa: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // `minmax(0,1fr)` también en teléfono: con la columna `auto` de
        // siempre, lo que no podía partirse la estiraba más que la tarjeta.
        'relative grid grid-cols-[minmax(0,1fr)] sm:min-h-[440px]',
        fotoAl === 'inicio'
          ? 'sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'
          : 'sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
      )}
    >
      <div className="absolute right-4 top-4 z-10 rounded-full shadow-sm ring-1 ring-border">{aspa}</div>
      <FotoDeMarca
        src={foto}
        animar={animar}
        className={fotoAl === 'final' ? 'sm:order-last' : undefined}
      />
      <div className="flex flex-col p-6 sm:p-8">{children}</div>
    </div>
  );
}

/**
 * La foto, limpia: sin píldora ni texto encima (Nico, 30-09: «quitale eso a
 * las imágenes»). La marca ya está EN la foto.
 */
function FotoDeMarca({
  src,
  animar,
  className,
}: {
  src: string;
  animar: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn('relative h-36 overflow-hidden bg-surface-muted sm:h-auto', className)}
    >
      {/* Un acercamiento lento al abrir, como quien entra. Sin movimiento, quieta. */}
      <motion.div
        className="absolute inset-0"
        initial={animar ? { scale: 1.06 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: animar ? 1.4 : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={TAMANOS_DE_LA_FOTO}
          className="object-cover object-[50%_42%]"
          priority
        />
      </motion.div>
    </div>
  );
}

export { PASOS_DEL_TOUR };
