'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { useCatalogo, useTurno } from './catalogo';

type AlTocar = (e: MouseEvent<HTMLAnchorElement>) => void;

/** El número de inmuebles publicados, al lado de «Marketplace». Sin catálogo, nada. */
export function CuentaDelMarketplace() {
  const { total, cargando, fallo } = useCatalogo();
  if (cargando || fallo || !total) return null;
  return (
    <b className="mk-n" aria-label={`${total} inmuebles publicados`}>
      {total.toLocaleString('es-CO')}
    </b>
  );
}

/* ── La franja de arriba ────────────────────────────────────────────────────
 *
 * Arriba de TODAS las páginas públicas, encima del header (Nico, 16-10-2026:
 * «agrégalo para toda la experiencia, dale opción de poder cerrarlo»). En vez
 * de cifras («quita eso de 14 inmuebles 5 inmobiliarias… otro tipo de
 * conquista y sentido de urgencia»), las inmobiliarias que ya publican, de a
 * una, y «¿Y tú?». Sale del catálogo: si no hay nada publicado, queda la
 * frase fija «Antes que tu competencia».
 *
 * Sin «■ Nuevo» al principio (Nico, 16-10-2026: «quitemos esto de nuevo»).
 *
 * Va en el flujo de la página, no dentro del header fijo: así empuja el
 * contenido en vez de taparlo (las pantallas reservan 76 px para el header y
 * ni uno más). Al bajar se va con la página y el header la sigue hasta
 * quedar pegado arriba: `--franja-y` es dónde termina la franja en pantalla.
 *
 * Cerrada se queda cerrada una semana en ese navegador (y en la visita, al
 * pasar de una página a otra). La primera carga se pinta abierta siempre: el
 * servidor no sabe si la cerraron, y pintar distinto en el cliente rompería
 * la hidratación.
 */

const CLAVE = 'leasefy.franja-del-marketplace';
const DURA_CERRADA = 7 * 24 * 60 * 60 * 1000;

/** Lo que ya se sabe en esta visita; `null` hasta leerlo la primera vez. */
let cerradaEnEstaVisita: boolean | null = null;

function leerCerrada(): boolean {
  try {
    const t = Number(window.localStorage.getItem(CLAVE));
    return t > 0 && Date.now() - t < DURA_CERRADA;
  } catch {
    return false;
  }
}

function guardarCerrada() {
  try {
    window.localStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin almacenamiento (ventana privada): se cierra igual, hasta recargar.
  }
}

/** Si la franja se ve, y la mano que la cierra. `cerrando` dura lo que dura la salida. */
export function useFranjaDelMarketplace() {
  const [visible, setVisible] = useState(() => cerradaEnEstaVisita !== true);
  const [cerrando, setCerrando] = useState(false);
  const reloj = useRef(0);

  const ocultar = useCallback(() => {
    setCerrando(true);
    setVisible(false);
    window.clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => setCerrando(false), 400);
  }, []);

  useEffect(() => {
    if (cerradaEnEstaVisita === null) cerradaEnEstaVisita = leerCerrada();
    if (cerradaEnEstaVisita) ocultar();
    return () => window.clearTimeout(reloj.current);
  }, [ocultar]);

  const cerrar = useCallback(() => {
    cerradaEnEstaVisita = true;
    guardarCerrada();
    ocultar();
  }, [ocultar]);

  return { visible, cerrando, cerrar };
}

const LARGO_MAXIMO = 56;

/** «Teja Roja Arriendos ya publica en Laureles»: una por inmobiliaria, con su barrio. */
function useQuienesYaPublican(): string[] {
  const { inmuebles } = useCatalogo();
  return useMemo(() => {
    const vistas = new Set<string>();
    const frases: string[] = [];
    for (const p of inmuebles) {
      const nombre = p.agencyName?.trim();
      const donde = p.neighborhood?.trim() || p.city?.trim();
      if (!nombre || !donde || vistas.has(nombre)) continue;
      vistas.add(nombre);
      const frase = `${nombre} ya publica en ${donde}`;
      // Una razón social larguísima no cabe en la franja: esa se salta.
      if (frase.length <= LARGO_MAXIMO) frases.push(frase);
    }
    return frases.slice(0, 8);
  }, [inmuebles]);
}

export function FranjaDelMarketplace({
  hrefPublicar,
  alTocarPublicar,
  alCerrar,
}: {
  hrefPublicar: string;
  alTocarPublicar: AlTocar;
  alCerrar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const quienes = useQuienesYaPublican();
  const turno = useTurno(quienes.length, 3400);
  // El ancho de la frase más larga (más el «·», el punto verde y sus
  // espacios): si cada una midiera lo suyo, la fila centrada bailaría de lado
  // a lado con cada cambio.
  const ancho = useMemo(() => Math.max(0, ...quienes.map((q) => q.length)) + 8, [quienes]);

  // El header sigue a la franja mientras se ve; después queda arriba del todo.
  useEffect(() => {
    const raiz = document.documentElement;
    const medir = () => {
      const el = ref.current;
      if (!el) return;
      raiz.style.setProperty('--franja-y', `${Math.max(0, Math.round(el.getBoundingClientRect().bottom))}px`);
    };
    medir();
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
      raiz.style.removeProperty('--franja-y');
    };
  }, []);

  return (
    <motion.div
      ref={ref}
      className="mk-anuncio"
      role="region"
      aria-label="Marketplace de Leasefy"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ height: 0, opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
    >
      <div className="container mk-anuncio-fila">
        <a href={hrefPublicar} onClick={alTocarPublicar} className="mk-anuncio-t">
          <span className="mk-anuncio-largo">Publica tus inmuebles gratis en el marketplace de Leasefy</span>
          <span className="mk-anuncio-corto">Publica gratis antes que tu competencia</span>
        </a>
        {quienes.length > 0 && (
          <span className="mk-anuncio-quien" style={{ width: `calc(${ancho} * (1ch + .14em) + 44px)` }}>
            <i className="mk-vivo" aria-hidden="true" />
            <span className="mk-anuncio-pista">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={quienes[turno]}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
                  transition={{ duration: motionDuration.base, ease: motionEase.enter }}
                >
                  {quienes[turno]}. <b>¿Y tú?</b>
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
        )}
        {/* Sin nadie publicando todavía, o sin ancho para la que pasa. */}
        <span className="mk-anuncio-fija" data-con-quien={quienes.length > 0 || undefined}>
          Antes que tu competencia
        </span>
        <a href={hrefPublicar} onClick={alTocarPublicar} className="mk-anuncio-ir" aria-hidden="true" tabIndex={-1}>
          →
        </a>
      </div>
      <button type="button" className="mk-anuncio-x" aria-label="Cerrar este aviso" onClick={alCerrar}>
        ×
      </button>
    </motion.div>
  );
}
