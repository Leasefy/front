'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase, motionSpring } from '@leasefy/cadence';

import { useQuieto } from '@/components/landing-v2/marketplace/catalogo';

/**
 * Un inmueble que se publica solo, en bucle, en la obra de la ventana de cuenta
 * (Nico, 19-10-2026: «dale un glow up al login, algo hermoso por más que sea un
 * modal»). Es la misma idea que «inmueble armándose» de la vitrina de la
 * landing, que Nico aprobó el 16-10: la foto entra borrosa mientras sube, se
 * enfoca, los datos se llenan y sale «Publicado». Detrás asoman dos más: se
 * publica uno o muchos.
 *
 * Nada inventado: las fotos son las portadas propias de Leasefy y los datos son
 * barras, no un precio ni un barrio de mentira. Con «reducir movimiento» queda
 * quieto, ya publicado.
 */
const FOTOS = [1, 2, 3, 4, 5, 6].map((n) => `/marketplace/portadas/leasefy-${n}.webp`);

type Fase = 'subiendo' | 'datos' | 'publicado';
const SIGUIENTE: Record<Fase, Fase> = { subiendo: 'datos', datos: 'publicado', publicado: 'subiendo' };
const DURA: Record<Fase, number> = { subiendo: 1700, datos: 1200, publicado: 2300 };
const AVANCE: Record<Fase, number> = { subiendo: 0.92, datos: 1, publicado: 1 };
/** El ancho de cada barra de datos: el título, dónde queda y el precio. */
const BARRAS = [0.86, 0.58, 0.4];

export function InmuebleQueSePublica() {
  const quieto = useQuieto();
  const [fase, setFase] = useState<Fase>('subiendo');
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    if (quieto) return;
    const t = window.setTimeout(() => {
      if (fase === 'publicado') setVuelta((v) => v + 1);
      setFase(SIGUIENTE[fase]);
    }, DURA[fase]);
    return () => window.clearTimeout(t);
  }, [fase, quieto]);

  const ahora: Fase = quieto ? 'publicado' : fase;
  const foto = FOTOS[vuelta % FOTOS.length];
  const borrosa = ahora === 'subiendo';
  const conDatos = ahora !== 'subiendo';

  return (
    <div className="relative mx-auto h-[248px] w-[228px]" aria-hidden="true" data-testid="inmueble-que-se-publica">
      {/* Los que vienen detrás: se publica uno o muchos. */}
      <span className="absolute inset-0 translate-x-5 translate-y-3 rotate-[5deg] rounded-[18px] bg-white/20 ring-1 ring-white/25" />
      <span className="absolute inset-0 translate-x-2.5 translate-y-1.5 rotate-[2.5deg] rounded-[18px] bg-white/35 ring-1 ring-white/30" />

      <div className="absolute inset-0 overflow-hidden rounded-[18px] bg-surface p-2 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-surface-muted">
          <AnimatePresence initial={false}>
            <motion.span
              key={foto}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.08, filter: 'blur(16px)' }}
              animate={{
                opacity: 1,
                scale: borrosa ? 1.05 : 1,
                filter: borrosa ? 'blur(12px)' : 'blur(0px)',
              }}
              exit={{ opacity: 0, transition: { duration: motionDuration.slow, ease: motionEase.exit } }}
              transition={{ duration: motionDuration.reveal * 2, ease: motionEase.enter }}
            >
              <Image src={foto} alt="" fill sizes="228px" style={{ objectFit: 'cover' }} />
            </motion.span>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {borrosa && (
              <motion.span
                key="subiendo"
                className="absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-white"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
                transition={{ duration: motionDuration.base, ease: motionEase.enter }}
              >
                Subiendo fotos
              </motion.span>
            )}
          </AnimatePresence>

          <span
            className="absolute inset-x-3 bottom-3 h-1 overflow-hidden rounded-full bg-white/35 transition-opacity duration-base ease-standard"
            style={{ opacity: ahora === 'publicado' ? 0 : 1 }}
          >
            {/* Una barra por vuelta: cada foto nueva arranca su subida desde cero. */}
            <motion.i
              key={vuelta}
              className="block h-full w-full origin-left rounded-full bg-white"
              initial={quieto ? false : { scaleX: 0 }}
              animate={{ scaleX: AVANCE[ahora] }}
              transition={{ duration: DURA[ahora] / 1000, ease: motionEase.standard }}
            />
          </span>
        </div>

        <div className="space-y-2 px-1.5 pb-1 pt-3">
          {BARRAS.map((ancho, k) => (
            <span
              key={k}
              className="block h-2 overflow-hidden rounded-full bg-surface-muted"
              style={{ width: `${ancho * 100}%` }}
            >
              <motion.i
                className={k === 2 ? 'block h-full w-full origin-left rounded-full bg-primary/70' : 'block h-full w-full origin-left rounded-full bg-fg/15'}
                initial={false}
                animate={{ scaleX: conDatos ? 1 : 0.08 }}
                transition={{
                  duration: motionDuration.slow,
                  ease: motionEase.enter,
                  delay: conDatos ? 0.12 + k * 0.12 : 0,
                }}
              />
            </span>
          ))}
        </div>

        <AnimatePresence>
          {ahora === 'publicado' && (
            <motion.span
              key={`publicado-${vuelta}`}
              className="absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-fg shadow-[0_4px_12px_-4px_rgba(20,19,15,0.35)]"
              initial={{ opacity: 0, scale: 0.7, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
              transition={motionSpring.bouncy}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Publicado
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
