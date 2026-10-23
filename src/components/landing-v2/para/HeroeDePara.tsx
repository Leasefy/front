'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CorrienteDeVoltaje } from '@/components/landing-v2/CorrienteDeVoltaje';
import { cn } from '@/lib/utils';
import { FotoQueSeRevela } from './FotoQueSeRevela';
import { ANCHO, BotonDePara, Ceja, CifrasConPunto, type Cifra } from './piezas';

export interface HeroeDeParaProps {
  /** Rótulo de arriba (DM Mono, con su punto). */
  ceja: ReactNode;
  titulo: ReactNode;
  entrada: ReactNode;
  principal: { href: string; texto: ReactNode };
  secundaria?: { href: string; texto: ReactNode };
  cifras: Cifra[];
  foto: { src: string; alt: string; rotulo?: ReactNode };
  /** La pieza del producto que flota sobre la foto (claro, sin vidrio). */
  pieza?: ReactNode;
  /** Composición de la corriente: cada página con la suya. */
  semilla?: number;
}

/**
 * El héroe de las páginas por público: papel, el título liviano a la
 * izquierda, la foto en estrías de voltaje a la derecha (se revela a color) con
 * una pieza del producto encima, las cifras en DM Mono y, abajo, la corriente
 * de píxeles (PIX). Sin velos negros, sin degradados de color, sin vidrio.
 */
export function HeroeDePara({
  ceja,
  titulo,
  entrada,
  principal,
  secundaria,
  cifras,
  foto,
  pieza,
  semilla = 7,
}: HeroeDeParaProps) {
  const quieto = useReducedMotion();
  const sube = (retraso: number) =>
    quieto
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay: retraso, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section
      data-testid="heroe-de-para"
      className="relative overflow-hidden bg-[#FBFAF8] pb-[clamp(130px,15vw,210px)] pt-[clamp(108px,10vw,150px)] text-[#121110]"
    >
      <CorrienteDeVoltaje
        fondo="papel"
        forma="horizonte"
        semilla={semilla}
        fuerza={0.62}
        className="absolute inset-x-0 bottom-0 z-0 h-[clamp(170px,19vw,270px)] w-full opacity-90 [mask-image:linear-gradient(to_top,#000_0%,rgba(0,0,0,.8)_25%,rgba(0,0,0,.25)_60%,transparent_88%)]"
      />

      <div className={cn(ANCHO, 'relative z-[1]')}>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div className="min-w-0">
            <motion.div {...sube(0)}>
              <Ceja>{ceja}</Ceja>
            </motion.div>
            <motion.h1
              {...sube(0.08)}
              className="mt-6 font-heading text-[clamp(42px,5.6vw,84px)] font-[340] leading-[0.98] tracking-[-0.045em] text-[#121110]"
            >
              {titulo}
            </motion.h1>
            <motion.p
              {...sube(0.16)}
              className="mt-6 max-w-[560px] text-[clamp(17px,1.35vw,20px)] leading-[1.55] text-[#5B5751]"
            >
              {entrada}
            </motion.p>
            <motion.div {...sube(0.24)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BotonDePara href={principal.href} className="w-full sm:w-auto">
                {principal.texto}
              </BotonDePara>
              {secundaria ? (
                <BotonDePara href={secundaria.href} variante="arena" className="w-full sm:w-auto">
                  {secundaria.texto}
                </BotonDePara>
              ) : null}
            </motion.div>
          </div>

          <motion.div {...sube(0.2)} className="relative min-w-0">
            <FotoQueSeRevela
              src={foto.src}
              alt={foto.alt}
              rotulo={foto.rotulo}
              proporcion={5 / 4}
              paso={7}
              prioridad
            />
            {pieza ? (
              <div className="relative z-[2] -mt-16 ml-auto w-[min(330px,92%)] sm:-mt-24 lg:absolute lg:-bottom-16 lg:-left-20 lg:ml-0 lg:mt-0 lg:w-[320px]">
                {pieza}
              </div>
            ) : null}
          </motion.div>
        </div>

        <motion.div {...sube(0.32)} className="mt-[clamp(48px,6vw,88px)]">
          <CifrasConPunto cifras={cifras} />
        </motion.div>
      </div>
    </section>
  );
}
