'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Piezas de las páginas por público (`/para/*`) con la identidad de la landing
 * «Producto en vivo» (Cadence 2, 23-10-2026): papel #FBFAF8, tinta, UN solo azul
 * (voltaje #1A40FF) para la acción, la medianoche para UN momento de marca, Host
 * Grotesk con títulos livianos, DM Mono para cifras y rótulos, la esquina
 * superelipse y los puntos cuadrados de voltaje.
 *
 * Las páginas públicas son SIEMPRE claras (`LandingChrome` monta
 * `ForceLightMode`), así que los colores van escritos tal cual, como en la
 * referencia, y no dependen del tema.
 */

/** La esquina suavizada de Cadence 2 donde el navegador la tiene. */
export const ESQUINA = 'supports-[corner-shape:superellipse(1.5)]:[corner-shape:superellipse(1.5)]';

/** El ancho de la página: 1320 px de contenido y su margen que respira. */
export const ANCHO = 'mx-auto w-full max-w-[1432px] px-4 sm:px-8 lg:px-14';

/** El punto cuadrado de voltaje: la puntuación de la marca. */
export function Punto({ className, enNoche = false }: { className?: string; enNoche?: boolean }) {
  return (
    <i
      aria-hidden="true"
      className={cn(
        'inline-block h-2 w-2 flex-none rounded-[2px]',
        enNoche ? 'bg-[#4D6BFF]' : 'bg-[#1A40FF]',
        className,
      )}
    />
  );
}

/** El rótulo de arriba de cada bloque: punto + DM Mono en mayúscula. */
export function Ceja({
  children,
  marca,
  enNoche = false,
  className,
}: {
  children: ReactNode;
  /** Lo que va en tinta antes del rótulo (una hora, un número). */
  marca?: ReactNode;
  enNoche?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2.5 font-mono text-caption uppercase leading-[1.3] tracking-[0.08em]',
        enNoche ? 'text-[#8E93B0]' : 'text-[#706B64]',
        className,
      )}
    >
      <Punto enNoche={enNoche} />
      {marca ? (
        <b className={cn('font-medium', enNoche ? 'text-[#F3F1ED]' : 'text-[#121110]')}>{marca}</b>
      ) : null}
      <span>{children}</span>
    </p>
  );
}

/** El azul de la marca dentro de un título. */
export function Acento({ children, enNoche = false }: { children: ReactNode; enNoche?: boolean }) {
  return <span className={enNoche ? 'text-[#8FA2FF]' : 'text-[#1A40FF]'}>{children}</span>;
}

/** Título de sección: liviano, grande y apretado; la jerarquía la da el tamaño. */
export function TituloDeSeccion({
  children,
  className,
  enNoche = false,
}: {
  children: ReactNode;
  className?: string;
  enNoche?: boolean;
}) {
  return (
    <h2
      className={cn(
        'font-heading text-[clamp(34px,4.4vw,64px)] font-[360] leading-[1.03] tracking-[-0.04em]',
        enNoche ? 'text-[#F3F1ED]' : 'text-[#121110]',
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Entrada({
  children,
  className,
  enNoche = false,
}: {
  children: ReactNode;
  className?: string;
  enNoche?: boolean;
}) {
  return (
    <p
      className={cn(
        'max-w-[620px] text-[clamp(17px,1.3vw,19px)] leading-[1.55]',
        enNoche ? 'text-[#B9BCD0]' : 'text-[#5B5751]',
        className,
      )}
    >
      {children}
    </p>
  );
}

type Variante = 'azul' | 'arena' | 'blanco' | 'linea-noche';

const VARIANTES: Record<Variante, string> = {
  azul: 'bg-[#1A40FF] text-white hover:bg-[#1535E6]',
  arena: 'bg-[#F3F1ED] text-[#121110] hover:bg-[#E7E3DC]',
  blanco: 'bg-white text-[#0A0F2C] hover:bg-[#E9EDFF]',
  'linea-noche': 'bg-white/[0.08] text-[#F3F1ED] hover:bg-white/[0.14]',
};

/**
 * Botón de la landing: radio completo con superelipse. UN azul por bloque; el
 * secundario es arena (o blanco en la medianoche).
 */
export function BotonDePara({
  href,
  children,
  variante = 'azul',
  grande = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variante?: Variante;
  grande?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full font-medium tracking-[-0.005em]',
        'transition-[transform,background-color,color] duration-fast ease-spring active:scale-[0.97]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#1A40FF]',
        grande ? 'h-[58px] px-[34px] text-[18px]' : 'h-[50px] px-[26px] text-[16px]',
        ESQUINA,
        VARIANTES[variante],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export interface Cifra {
  valor: ReactNode;
  rotulo: ReactNode;
}

/**
 * Una fila de cifras: cada una con su punto, en DM Mono y sin negrilla, sobre
 * un filete. A 390 px pasan a dos columnas.
 */
export function CifrasConPunto({
  cifras,
  enNoche = false,
  className,
}: {
  cifras: Cifra[];
  enNoche?: boolean;
  className?: string;
}) {
  return (
    <dl
      data-testid="cifras"
      className={cn(
        'grid border-t sm:grid-cols-[repeat(var(--n),minmax(0,1fr))]',
        cifras.length <= 3 ? 'grid-cols-[repeat(var(--n),minmax(0,1fr))]' : 'grid-cols-2',
        enNoche ? 'border-white/[0.08]' : 'border-[#E7E3DC]',
        className,
      )}
      style={{ ['--n' as string]: String(cifras.length) }}
    >
      {cifras.map((c, i) => (
        <div
          key={i}
          className={cn(
            'flex flex-col gap-2 border-b py-5 pr-4',
            enNoche ? 'border-white/[0.08]' : 'border-[#E7E3DC]',
          )}
        >
          <dt className={cn('flex items-center gap-2 text-caption', enNoche ? 'text-[#B9BCD0]' : 'text-[#5B5751]')}>
            <Punto enNoche={enNoche} className="h-1.5 w-1.5" />
            {c.rotulo}
          </dt>
          <dd
            className={cn(
              'font-mono text-[clamp(26px,2.6vw,36px)] font-normal leading-none tracking-[-0.03em] tabular-nums',
              enNoche ? 'text-[#F3F1ED]' : 'text-[#121110]',
            )}
          >
            {c.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * El hilo de puntos de la landing: una línea de cuadritos de voltaje que se
 * dibuja de izquierda a derecha (o de arriba abajo) cuando entra en pantalla.
 */
export function HiloDePuntos({
  vertical = false,
  className,
  enNoche = false,
}: {
  vertical?: boolean;
  className?: string;
  enNoche?: boolean;
}) {
  const quieto = useReducedMotion();
  const color = enNoche ? '#4D6BFF' : '#1A40FF';
  const desde = vertical ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)';
  return (
    <motion.div
      aria-hidden="true"
      className={cn(vertical ? 'h-full w-[6px]' : 'h-[6px] w-full', 'pointer-events-none', className)}
      initial={quieto ? false : { clipPath: desde }}
      whileInView={{ clipPath: 'inset(0 0 0 0)' }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg className="block h-full w-full overflow-visible" preserveAspectRatio="none">
        <line
          x1={vertical ? '3' : '0'}
          y1={vertical ? '0' : '3'}
          x2={vertical ? '3' : '100%'}
          y2={vertical ? '100%' : '3'}
          stroke={color}
          strokeWidth="5"
          strokeDasharray="0 13"
          strokeLinecap="square"
        />
      </svg>
    </motion.div>
  );
}

/**
 * Lista numerada a dos columnas sobre filetes (la de «Publica gratis» de la
 * referencia): el número en DM Mono voltaje, el título liviano y su línea.
 */
export function ListaNumerada({
  items,
  className,
  enNoche = false,
  columnas = 2,
}: {
  items: { titulo: ReactNode; texto?: ReactNode; extra?: ReactNode }[];
  className?: string;
  enNoche?: boolean;
  columnas?: 1 | 2 | 3;
}) {
  const filete = enNoche ? 'border-white/[0.08]' : 'border-[#E7E3DC]';
  return (
    <ol
      className={cn(
        'grid grid-cols-1 gap-x-8 border-t',
        columnas === 2 && 'sm:grid-cols-2',
        columnas === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        filete,
        className,
      )}
    >
      {items.map((it, i) => (
        <li key={i} className={cn('border-b py-5', filete)}>
          <span className={cn('font-mono text-caption tracking-[0.06em]', enNoche ? 'text-[#8FA2FF]' : 'text-[#1A40FF]')}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <p
            className={cn(
              'mt-1.5 text-[17px] font-[450] leading-snug tracking-[-0.01em]',
              enNoche ? 'text-[#F3F1ED]' : 'text-[#121110]',
            )}
          >
            {it.titulo}
          </p>
          {it.texto ? (
            <p className={cn('mt-1 text-[15px] leading-[1.45]', enNoche ? 'text-[#B9BCD0]' : 'text-[#5B5751]')}>
              {it.texto}
            </p>
          ) : null}
          {it.extra}
        </li>
      ))}
    </ol>
  );
}

/** Una tarjeta de superficie de la landing: blanca, susurro y esquina suave. */
export function Tarjeta({
  children,
  className,
  enNoche = false,
}: {
  children: ReactNode;
  className?: string;
  enNoche?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[24px]',
        ESQUINA,
        enNoche
          ? 'bg-[#101116] text-[#F3F1ED] ring-1 ring-white/[0.08]'
          : 'bg-white text-[#121110] shadow-[0_1px_2px_rgba(18,17,16,.06),0_2px_8px_-2px_rgba(18,17,16,.06)] ring-1 ring-[#ECE8E1]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Rótulo pequeño de estado dentro de una pieza del producto (DM Mono). */
export function Rotulo({
  children,
  tono = 'voltaje',
  className,
}: {
  children: ReactNode;
  tono?: 'voltaje' | 'exito' | 'aviso' | 'neutro';
  className?: string;
}) {
  const tonos = {
    voltaje: 'bg-[#E9EDFF] text-[#1A40FF]',
    exito: 'bg-[#E3F1E8] text-[#2B7549]',
    aviso: 'bg-[#FBF0DC] text-[#8A5A0F]',
    neutro: 'bg-[#F3F1ED] text-[#5B5751]',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center whitespace-nowrap rounded-[9px] px-2.5 font-mono text-caption tracking-[0.04em]',
        ESQUINA,
        tonos[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Sección con su fondo y su aire. */
export function Seccion({
  children,
  fondo = 'papel',
  className,
  id,
}: {
  children: ReactNode;
  fondo?: 'papel' | 'arena' | 'noche';
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      data-fondo={fondo}
      className={cn(
        'relative overflow-hidden py-[clamp(88px,11vw,150px)]',
        fondo === 'papel' && 'bg-[#FBFAF8] text-[#121110]',
        fondo === 'arena' && 'bg-[#F3F1ED] text-[#121110]',
        fondo === 'noche' && 'bg-[#07080C] text-[#F3F1ED]',
        className,
      )}
    >
      {children}
    </section>
  );
}
