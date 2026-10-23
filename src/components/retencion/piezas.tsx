'use client'

/**
 * Las piezas de página de Vinci (retención): la cabecera, la tarjeta y la
 * franja de números. Glow-up del 29-09-2026 (Nico: «el front de todos esos
 * agentes nuevos hay que hacerle glow up»).
 *
 * Copian el patrón de las pantallas buenas del panel, no inventan uno:
 *   · la CABECERA es el `EncabezadoDePantalla` común (desde el 22-10);
 *   · la TARJETA es la de la tabla de Contratos — `rounded-lg` (22 px; en
 *     cadence `rounded-xl` son 32), borde neutro, `bg-card`, y una cabecera
 *     con el ícono en su pozo, el título y una línea;
 *   · la FRANJA es el `StatStrip`/`Stat` de cadence, DENTRO de la tarjeta de
 *     la que habla (como las cifras de Contratos desde el 19-09).
 */
import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { StatStrip } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { cn } from '@/lib/utils'
import { useTr } from '@/lib/i18n/use-tr'

/** El Eyebrow de las tres pantallas: dónde estás, en una línea. */
// Revisora r25: el sobretítulo es la sección del menú; el nombre del agente va en el cuerpo.
export const EYEBROW_DE_VINCI = 'Agentes IA'

export function CabeceraDeVinci({
  titulo,
  descripcion,
  acciones,
  accionPrincipal,
  ayuda,
  junto,
  children,
  antes,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  /** Botones de apoyo (outline, `size="sm"`), a la derecha desde `lg`. */
  acciones?: ReactNode
  /** LA acción de la pantalla (la única azul, `size="sm"`). */
  accionPrincipal?: ReactNode
  /** El «¿Cómo funciona?» (`ParaEntenderMas`). */
  ayuda?: ReactNode
  /** Junto al título, en la misma línea (una insignia de estado). */
  junto?: ReactNode
  /** Lo que va debajo del encabezado (chips de estado, por ejemplo). */
  children?: ReactNode
  /** Lo que va ENCIMA del encabezado (el «← Volver» del detalle). */
  antes?: ReactNode
}) {
  const tr = useTr()
  // GLOW UP 22-10 (revisora r24, Retención #7): la cabecera de Vinci ES el encabezado común
  // (`EncabezadoDePantalla`): el mismo título de 40 px que el resto del panel, su ayuda y su principal.
  return (
    <div className="space-y-3">
      {antes}
      <EncabezadoDePantalla
        seccion={tr(EYEBROW_DE_VINCI)}
        titulo={titulo}
        descripcion={descripcion}
        acciones={acciones}
        accionPrincipal={accionPrincipal}
        ayuda={ayuda}
        junto={junto}
      />
      {children}
    </div>
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
          {/* Glow up 22-10: el ícono suelto, sin su pozo de color; el título liviano. */}
          {Icono ? <Icono className="mt-0.5 h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden="true" /> : null}
          <div className="min-w-0">
            <h2 id={idDelTitulo} className="text-base font-medium text-fg">
              {titulo}
            </h2>
            {descripcion ? <p className="mt-0.5 text-caption text-fg-muted">{descripcion}</p> : null}
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
