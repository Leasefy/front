'use client'

/**
 * Las piezas de página de Vinci (retención): la cabecera, la tarjeta y la
 * franja de números. Glow-up del 29-09-2026 (Nico: «el front de todos esos
 * agentes nuevos hay que hacerle glow up»).
 *
 * Copian el patrón de las pantallas buenas del panel, no inventan uno:
 *   · la CABECERA es la de Contratos y Cobranza — Eyebrow, `h1` en `text-h2`
 *     y una línea de descripción; las acciones a la derecha desde `lg`;
 *   · la TARJETA es la de la tabla de Contratos — `rounded-lg` (22 px; en
 *     cadence `rounded-xl` son 32), borde neutro, `bg-card`, y una cabecera
 *     con el ícono en su pozo, el título y una línea;
 *   · la FRANJA es el `StatStrip`/`Stat` de cadence, DENTRO de la tarjeta de
 *     la que habla (como las cifras de Contratos desde el 19-09).
 */
import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { Eyebrow, StatStrip } from '@leasefy/cadence'
import { cn } from '@/lib/utils'

/** El Eyebrow de las tres pantallas: dónde estás, en una línea. */
export const EYEBROW_DE_VINCI = 'Agentes IA · Vinci'

export function CabeceraDeVinci({
  titulo,
  descripcion,
  acciones,
  children,
  antes,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  /** Botones de la página, a la derecha desde `lg` (debajo en el teléfono). */
  acciones?: ReactNode
  /** Lo que va debajo de la descripción (chips de estado, por ejemplo). */
  children?: ReactNode
  /** Lo que va ENCIMA del Eyebrow (el «← Volver» del detalle). */
  antes?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        {antes}
        <Eyebrow>{EYEBROW_DE_VINCI}</Eyebrow>
        <h1 className="text-h2 text-fg">{titulo}</h1>
        {descripcion ? <p className="max-w-2xl text-sm text-fg-muted">{descripcion}</p> : null}
        {children}
      </div>
      {acciones ? <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div> : null}
    </header>
  )
}

/**
 * Una tarjeta del panel con su cabecera. `cuerpo` apagado deja que el hijo
 * pinte hasta el borde (una tabla, una lista con divisores): la tarjeta lleva
 * `overflow-hidden`, así que nada de adentro necesita copiar su radio.
 */
export function TarjetaDeVinci({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  children,
  cuerpo = true,
  className,
  id,
  ...rest
}: {
  icono?: Icon
  titulo: ReactNode
  descripcion?: ReactNode
  accion?: ReactNode
  children?: ReactNode
  cuerpo?: boolean
  className?: string
  id?: string
  'data-testid'?: string
}) {
  const idDelTitulo = id ? `${id}-titulo` : undefined
  return (
    <section
      aria-labelledby={idDelTitulo}
      className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}
      data-testid={rest['data-testid']}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        {/* Arriba, no al centro: con una descripción de varias líneas (el
            teléfono) el ícono quedaba flotando a media altura del párrafo. */}
        <div className="flex min-w-0 items-start gap-3">
          {Icono ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
              <Icono className="h-[18px] w-[18px] text-fg-muted" weight="duotone" aria-hidden="true" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 id={idDelTitulo} className="text-base font-semibold text-fg">
              {titulo}
            </h2>
            {descripcion ? <p className="mt-0.5 text-xs text-fg-muted">{descripcion}</p> : null}
          </div>
        </div>
        {accion ? <div className="flex shrink-0 items-center gap-2">{accion}</div> : null}
      </div>
      {cuerpo ? <div className="p-5">{children}</div> : children}
    </section>
  )
}

/**
 * La franja de números (`StatStrip` de cadence) para ir DENTRO de una
 * tarjeta: sin sus bordes horneados (la línea la pone quien la contiene, con
 * `!border-0` para no sortear la especificidad — ver `PilotoPulso`), en dos
 * columnas en el teléfono y en una fila desde `md`.
 *
 * En el teléfono: la primera de cada fila no lleva la línea de la izquierda,
 * de la tercera en adelante llevan una arriba, y si quedan impares la última
 * ocupa la fila entera. La cifra baja a 18 px para que «$12.345.678» quepa en
 * media columna a 390 px.
 */
export function FranjaDeVinci({
  children,
  columnas,
  className,
  ...rest
}: {
  children: ReactNode
  columnas: 3 | 4
  className?: string
  'data-testid'?: string
}) {
  return (
    <StatStrip
      data-testid={rest['data-testid']}
      className={cn(
        '!border-0 grid grid-cols-2',
        columnas === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4',
        '[&>*]:min-w-0 [&>*]:!px-5 [&>*]:!py-4',
        'max-md:[&>*:nth-child(odd)]:!border-l-0 max-md:[&>*:nth-child(n+3)]:border-t',
        'max-md:[&>*:last-child:nth-child(odd)]:col-span-2',
        'max-md:[&>*>div:nth-child(2)]:!text-[18px]',
        className,
      )}
    >
      {children}
    </StatStrip>
  )
}
