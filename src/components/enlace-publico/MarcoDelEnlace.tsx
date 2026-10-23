'use client';

/**
 * El marco de las pantallas que se abren desde un enlace, sin sesión (glow up
 * 22-10-2026): firmar un acta, un mandato o una consignación, y confirmar el
 * cambio de una cuenta bancaria.
 *
 * Antes cada una pintaba lo suyo: una caja de ícono azul arriba, «Cargando…»
 * suelto, el título y los avisos con pesos distintos. Quien llega desde un
 * correo necesita, en este orden:
 *   1. saber que es Leasefy y de parte de quién viene (el logotipo y la
 *      inmobiliaria, arriba, fuera de la tarjeta);
 *   2. qué le piden, en un título y UNA línea;
 *   3. lo que va a firmar o confirmar, y el botón al final.
 * Cuando el enlace no sirve (vencido, inválido, ya usado), un aviso con su
 * ícono suelto, un título y qué hacer: nunca una pantalla sin salida.
 *
 * Sólo presentación: cada página sigue haciendo sus llamadas y sus estados.
 */

import type { ReactNode } from 'react';
import { CheckCircle, Clock, Info, LinkBreak, WarningCircle } from '@phosphor-icons/react';
import { Appear, CrossFade } from '@leasefy/cadence';

import { LeasefyLogotype } from '@/components/brand';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { cn } from '@/lib/utils';

const ANCHOS = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

export interface MarcoDelEnlaceProps {
  /** De parte de quién viene el enlace (la inmobiliaria), si ya se sabe. */
  de?: string | null;
  /** El ancho de la tarjeta: `md` para confirmar, `xl` para leer un acta. */
  ancho?: keyof typeof ANCHOS;
  /** Cambia cuando cambia lo que se ve (cargando → contenido → aviso): se cruzan, no saltan. */
  vista?: string;
  children: ReactNode;
}

export function MarcoDelEnlace({ de, ancho = 'md', vista, children }: MarcoDelEnlaceProps) {
  return (
    <main className="min-h-screen bg-bg px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
      <div className={cn('mx-auto w-full', ANCHOS[ancho])}>
        <header className="mb-5 flex min-h-6 items-center justify-between gap-4 sm:mb-6">
          <LeasefyLogotype className="h-5 w-auto shrink-0 text-fg" title="Leasefy" />
          {de ? (
            <p className="min-w-0 truncate text-caption text-fg-muted" data-testid="enlace-de-parte-de">
              De parte de <span className="text-fg">{de}</span>
            </p>
          ) : null}
        </header>
        <Appear
          as="section"
          className="rounded-lg border border-border bg-surface p-5 shadow-xs sm:p-8"
        >
          {vista === undefined ? (
            <div className="space-y-6">{children}</div>
          ) : (
            <CrossFade swapKey={vista} className="space-y-6">
              {children}
            </CrossFade>
          )}
        </Appear>
      </div>
    </main>
  );
}

export interface TituloDelEnlaceProps {
  /** Qué documento o trámite es («Acta de entrega», «Mandato»). */
  rotulo?: ReactNode;
  titulo: ReactNode;
  /** UNA línea: quién lo pide y qué se hace aquí. */
  descripcion?: ReactNode;
}

/** El encabezado de la tarjeta: rótulo, título liviano y una línea. */
export function TituloDelEnlace({ rotulo, titulo, descripcion }: TituloDelEnlaceProps) {
  return (
    <div className="space-y-2">
      {rotulo ? <p className="text-caption text-fg-subtle">{rotulo}</p> : null}
      <h1 className="text-balance font-heading text-[26px] font-[420] leading-[1.12] tracking-[-0.025em] text-fg sm:text-[30px]">
        {titulo}
      </h1>
      {descripcion ? (
        <p className="text-pretty text-body-sm leading-relaxed text-fg-muted">{descripcion}</p>
      ) : null}
    </div>
  );
}

/** La carga, con la marca (es una carga de pantalla entera para quien llega del correo). */
export function CargandoElEnlace({ texto }: { texto: string }) {
  return (
    <CargaDeMarca
      tamano="md"
      disposicion="apilada"
      texto={texto}
      className="flex py-10 text-center"
    />
  );
}

type TonoDelAviso = 'invalido' | 'vencido' | 'hecho' | 'neutro';

const ICONO_DEL_AVISO = {
  invalido: { Icono: LinkBreak, color: 'text-fg-subtle' },
  vencido: { Icono: Clock, color: 'text-warning' },
  hecho: { Icono: CheckCircle, color: 'text-success' },
  neutro: { Icono: Info, color: 'text-fg-subtle' },
} as const;

export interface AvisoDelEnlaceProps {
  tono: TonoDelAviso;
  titulo: ReactNode;
  children?: ReactNode;
  /** Otro ícono que el del tono (p. ej. la advertencia de un error). */
  conAdvertencia?: boolean;
  'data-testid'?: string;
}

/**
 * El enlace ya no sirve, o lo que se pedía ya está hecho: el ícono suelto (sin
 * caja de color), el título y qué hacer ahora.
 */
export function AvisoDelEnlace({ tono, titulo, children, conAdvertencia, 'data-testid': testId }: AvisoDelEnlaceProps) {
  const { Icono, color } = conAdvertencia
    ? { Icono: WarningCircle, color: 'text-warning' }
    : ICONO_DEL_AVISO[tono];
  return (
    <div className="space-y-3 py-2" data-testid={testId} role={tono === 'hecho' ? 'status' : undefined}>
      <Icono className={cn('h-8 w-8', color)} weight={tono === 'hecho' ? 'fill' : 'regular'} aria-hidden="true" />
      <h1 className="text-balance font-heading text-[24px] font-[420] leading-[1.15] tracking-[-0.02em] text-fg">
        {titulo}
      </h1>
      {children ? <div className="space-y-2 text-pretty text-body-sm leading-relaxed text-fg-muted">{children}</div> : null}
    </div>
  );
}

/**
 * Un renglón del resumen de lo que se firma o confirma: el rótulo arriba y el
 * dato debajo (en el celular no se aprietan dos columnas).
 */
export function DatoDelEnlace({ rotulo, children, mono }: { rotulo: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-fg-muted">{rotulo}</dt>
      <dd className={cn('mt-0.5 break-words text-body-sm text-fg', mono && 'font-mono tabular-nums')}>{children}</dd>
    </div>
  );
}

export interface PasoDelEnlace {
  titulo: string;
  estado: 'hecho' | 'actual' | 'pendiente';
}

/**
 * Los pasos de un trámite por enlace, en una fila: dónde va la persona y
 * cuántos le faltan (el mandato: leerlo → pedir el código → firmar).
 */
export function PasosDelEnlace({ pasos, etiqueta }: { pasos: PasoDelEnlace[]; etiqueta: string }) {
  return (
    <ol aria-label={etiqueta} className="flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="pasos-del-enlace">
      {pasos.map((paso, i) => (
        <li
          key={paso.titulo}
          aria-current={paso.estado === 'actual' ? 'step' : undefined}
          className={cn(
            'flex items-center gap-2 text-caption',
            paso.estado === 'actual' ? 'text-fg' : paso.estado === 'hecho' ? 'text-fg-muted' : 'text-fg-subtle',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-caption leading-none tabular-nums',
              paso.estado === 'actual'
                ? 'bg-fg text-bg'
                : paso.estado === 'hecho'
                  ? 'bg-success-soft text-success'
                  : 'border border-border text-fg-subtle',
            )}
          >
            {paso.estado === 'hecho' ? <CheckCircle className="h-3.5 w-3.5" weight="fill" /> : i + 1}
          </span>
          <span>
            <span className="sr-only">{paso.estado === 'hecho' ? 'Hecho: ' : paso.estado === 'actual' ? 'Ahora: ' : 'Después: '}</span>
            {paso.titulo}
          </span>
          {i < pasos.length - 1 ? <span aria-hidden="true" className="h-px w-4 bg-border" /> : null}
        </li>
      ))}
    </ol>
  );
}
