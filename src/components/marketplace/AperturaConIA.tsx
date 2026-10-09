'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence';

import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { PensamientoDelTurno } from '@/components/beta/PensamientoDelTurno';
import { cifraEnTexto, type PasoDelPensamiento } from '@/lib/chat/pensamiento';

/**
 * ══ AL ABRIR «BUSCAR CON IA» (Nico, 09-10-2026) ═══════════════════════════
 *
 * «Algo bien top al abrir y buscar con IA». La página se oscurece, el orbe de
 * Ori crece en el centro, lo que la persona escribió queda arriba y salen las
 * líneas en vivo —las mismas del chat del panel— con lo que DE VERDAD pasó:
 * qué se entendió (las pastillas que va a ver) y cuántos inmuebles cumplen.
 * Nada inventado: si todavía no hay respuesta, la línea corre; si no hay
 * ninguno, lo dice. Al terminar se abre sola a los resultados.
 *
 * Mínimo ~1,6 s en pantalla para que se alcance a leer, nunca más de lo que
 * tarda la búsqueda + un respiro. «Ver los resultados ya» o Esc la cierran.
 * Con movimiento reducido no se muestra: se va directo a los resultados.
 */

const MINIMO_EN_PANTALLA_MS = 1600;
const RESPIRO_CON_EL_RESULTADO_MS = 900;

export interface AperturaConIAProps {
  /** Lo que escribió la persona. */
  texto: string;
  /** La búsqueda todavía no respondió. */
  cargando: boolean;
  /** Lo que se entendió, con las palabras de las pastillas. */
  entendido: string[];
  /** Cuántos cumplen (`meta.total`); `null` mientras no se sabe. */
  total: number | null;
  /** Ya se fue: quitar la marca de la URL. */
  onTerminar: () => void;
}

export function AperturaConIA({ texto, cargando, entendido, total, onTerminar }: AperturaConIAProps) {
  const reducido = usePrefersReducedMotion();
  const [inicio] = useState(() => Date.now());
  const [cerrando, setCerrando] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Con movimiento reducido no hay capa: directo a los resultados.
  useEffect(() => {
    if (reducido) onTerminar();
  }, [reducido, onTerminar]);

  // Cuando llega la respuesta: lo que falta del mínimo, un respiro y se abre.
  useEffect(() => {
    if (cargando || cerrando) return;
    const falta = Math.max(0, MINIMO_EN_PANTALLA_MS - (Date.now() - inicio));
    const t = window.setTimeout(() => setCerrando(true), falta + RESPIRO_CON_EL_RESULTADO_MS);
    return () => window.clearTimeout(t);
  }, [cargando, cerrando, inicio]);

  // La página de atrás no se mueve mientras la capa está, y Esc la cierra.
  useEffect(() => {
    if (reducido) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botonRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCerrando(true);
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [reducido]);

  const pasos = useMemo<PasoDelPensamiento[]>(() => {
    const lista: PasoDelPensamiento[] = [
      { id: 'leer', fase: 'pregunta', texto: 'Leí lo que escribiste', estado: 'listo' },
      {
        id: 'entender',
        fase: 'clasificacion',
        texto: cargando ? 'Entendiendo qué buscas' : entendido.length > 0 ? 'Esto es lo que buscas' : 'Lo busco tal cual lo escribiste',
        estado: cargando ? 'en_curso' : 'listo',
        ...(!cargando && entendido.length > 0 ? { resultado: { texto: entendido.join(' · ') } } : {}),
      },
    ];
    if (!cargando && total !== null) {
      lista.push({
        id: 'buscar',
        fase: 'busqueda',
        texto: 'Busqué en los inmuebles disponibles',
        estado: 'listo',
        resultado:
          total === 0
            ? { texto: 'ninguno cumple todo: quita una pastilla y te muestro los más cercanos' }
            : {
                texto: `${cifraEnTexto(total)} ${total === 1 ? 'cumple' : 'cumplen'}`,
                cifra: total,
                formato: 'numero',
              },
      });
    }
    return lista;
  }, [cargando, entendido, total]);

  if (reducido) return null;

  return (
    <AnimatePresence onExitComplete={onTerminar}>
      {!cerrando && (
        <motion.div
          key="apertura-con-ia"
          role="dialog"
          aria-modal="true"
          aria-label="Ori está buscando"
          className="dark fixed inset-0 z-[300] overflow-y-auto bg-[#080808] text-fg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionDuration.slow, ease: motionEase.standard }}
          data-testid="apertura-con-ia"
        >
          <div className="mx-auto flex min-h-full max-w-[680px] flex-col justify-center px-6 py-16">
            <motion.div
              className="self-start"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
            >
              <OrbeDeAgente agente="orquestador" estado={cargando ? 'trabajando' : 'listo'} tamano={88} decorativo />
            </motion.div>

            <motion.p
              className="mt-6 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.12 }}
            >
              Ori {cargando ? 'está buscando' : 'ya buscó'}
            </motion.p>

            <motion.p
              className="mt-3 font-heading text-[24px] leading-snug tracking-[-0.02em] text-fg text-balance md:text-[30px]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionDuration.reveal, ease: motionEase.enter, delay: 0.2 }}
            >
              «{texto}»
            </motion.p>

            <motion.div
              className="mt-9"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: motionDuration.slow, ease: motionEase.standard, delay: 0.35 }}
            >
              <PensamientoDelTurno pasos={pasos} vivo />
            </motion.div>

            <button
              ref={botonRef}
              type="button"
              onClick={() => setCerrando(true)}
              className="mt-10 self-start rounded-full border border-border px-4 py-2 text-[13px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver los resultados ya
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
