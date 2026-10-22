'use client';

/**
 * El encabezado de una pantalla del panel — GLOW UP (Nico, 20-10-2026).
 *
 * Nico: «utiliza bien la información superior con las acciones principales o
 * secundarias, muestra bien qué debe hacer el usuario». Cada pantalla armaba su
 * cabecera a mano, cada una con su orden: unas con la acción a la derecha, otras
 * con la ayuda en el lugar de la acción, otras sin descripción. Acá queda UNA
 * gramática:
 *
 *   · arriba a la izquierda, DÓNDE estoy (la sección, en mono) y QUÉ es esto
 *     (el título y una sola línea que dice para qué sirve la pantalla);
 *   · arriba a la derecha, lo que se HACE, de lo más callado a lo más fuerte:
 *     la ayuda («¿Cómo funciona?», que abre su cajón), las secundarias (borde)
 *     y, en la punta, la acción principal (cobalto: la que más se usa aquí).
 *
 * En el celular las acciones bajan debajo del título y la principal ocupa el
 * ancho: es la que se busca con el pulgar.
 *
 * Todos los botones del encabezado van en `size="sm"` (36 px), el tamaño del
 * «¿Cómo funciona?» (`ParaEntenderMas`): son una sola fila y se leen juntos.
 *
 * Contenedor y título como el resto del panel (Nico 12-10): `h1 text-h2`.
 */

import type { ReactNode } from 'react';
import { SectionLabel } from '@/components/ui/section-label';
import { cn } from '@/lib/utils';

export interface EncabezadoDePantallaProps {
  /** La sección del menú a la que pertenece (eyebrow mono). */
  seccion?: ReactNode;
  titulo: ReactNode;
  /** UNA línea: para qué sirve la pantalla. No una explicación: eso va en `ayuda`. */
  descripcion?: ReactNode;
  /** La acción que más se hace aquí. Un `Button` (o `Button asChild` con un enlace). */
  accionPrincipal?: ReactNode;
  /** Acciones de apoyo (botones `outline`/`secondary`), en el orden en que se leen. */
  acciones?: ReactNode;
  /** El «¿Cómo funciona?» de la pantalla (`ParaEntenderMas` o similar). Va primero, callado. */
  ayuda?: ReactNode;
  /** Algo que acompaña al título en la misma línea (una insignia de estado). */
  junto?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function EncabezadoDePantalla({
  seccion,
  titulo,
  descripcion,
  accionPrincipal,
  acciones,
  ayuda,
  junto,
  className,
  'data-testid': testId,
}: EncabezadoDePantallaProps) {
  const hayAcciones = Boolean(accionPrincipal || acciones || ayuda);
  return (
    <header
      className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}
      data-testid={testId}
    >
      {/*
        🔴 21-10 (Nico: «impacto visual real en todo»): el encabezado editorial.
        Título grande y liviano con el interletrado cerrado de la marca (30 px en
        el celular, 40 en escritorio), la sección en mono con aire, y la línea de
        para qué sirve en texto de lectura (15 px), no en el gris chico de antes.
        Es la pieza que comparten ~250 pantallas: el cambio se ve en todas.
      */}
      <div className="min-w-0 space-y-2">
        {seccion ? (
          <SectionLabel className="tracking-[0.14em] text-fg-subtle">{seccion}</SectionLabel>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[30px] font-[420] leading-[1.08] tracking-[-0.025em] text-fg lg:text-[40px]">{titulo}</h1>
          {junto}
        </div>
        {descripcion ? (
          <p className="max-w-2xl text-[15px] leading-relaxed text-fg-muted">{descripcion}</p>
        ) : null}
      </div>
      {hayAcciones ? (
        <div
          className={cn(
            'flex shrink-0 flex-wrap items-center gap-2',
            // En el celular la principal va primero y a todo el ancho.
            '[&>[data-principal]]:order-first [&>[data-principal]]:w-full sm:[&>[data-principal]]:order-none sm:[&>[data-principal]]:w-auto',
          )}
        >
          {ayuda ? <div className="flex items-center">{ayuda}</div> : null}
          {acciones}
          {accionPrincipal ? (
            <div data-principal="" className="flex [&>*]:w-full sm:[&>*]:w-auto">
              {accionPrincipal}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
