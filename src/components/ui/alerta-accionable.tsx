'use client'

/**
 * AlertaAccionable — la forma única de una alerta en el panel.
 *
 * Nico (2026-09-02): «esa alerta está súper rara, ni se entiende, ¿qué debe
 * hacer la inmobiliaria ahí? Las alertas tienen que ser todas claras y si hay
 * algo por hacer, con la acción directa». Una alerta que dice «Atención
 * requerida · la ocupación está por debajo del 70 %» sobre un propietario sin
 * inmuebles no le sirve a nadie.
 *
 * Toda alerta se arma con tres cosas, en este orden:
 *   1. `titulo`  — QUÉ pasó, con el número: «2 de 3 inmuebles llevan más de
 *      un mes sin arrendar», no «ocupación baja».
 *   2. `children` — QUÉ HACER (una frase), o por qué importa.
 *   3. `accion`  — el botón que lo hace, si existe. Sin acción posible no se
 *      inventa un botón, pero entonces la alerta tiene que justificar su
 *      lugar en pantalla.
 *
 * El vestido sale del DS (`Alert` + `AlertAction` de @leasefy/cadence);
 * esto sólo fija el contrato de contenido.
 *
 * Movimiento: el `Alert` del DS ya ENTRA subiendo 8 px. Para que también SALGA
 * animada (la persona resolvió lo que pedía, el dato cambió), la pantalla le
 * pasa `mostrar` en vez de montarla con `{cond && <AlertaAccionable … />}`:
 * entonces la maneja un `Presence` (entra subiendo 8 px, sale acelerando en
 * 150 ms y recién ahí se desmonta). La que ya estaba al montarse la pantalla
 * no se anima: esa entrada la pone el template.
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { Alert, AlertAction, Presence } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SeveridadDeAlerta = 'info' | 'success' | 'warning' | 'danger'

export interface AccionDeAlerta {
  label: string
  /** Navega (Link del panel). Excluyente con `onClick`. */
  href?: string
  onClick?: () => void
  /** `true` mientras corre lo que dispara `onClick`. */
  cargando?: boolean
  icon?: React.ReactNode
}

export interface AlertaAccionableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  severidad?: SeveridadDeAlerta
  /** Qué pasó, con el número. */
  titulo: string
  /** Qué hacer, en una frase. */
  children?: React.ReactNode
  /** El botón que lo hace. */
  accion?: AccionDeAlerta
  /** Un segundo camino, más discreto (p. ej. «Ver detalle»). */
  secundaria?: AccionDeAlerta
  icon?: React.ReactNode
  /**
   * Si se pasa, la alerta entra y SALE animada según este valor (`Presence`).
   * Sin él, se monta y desmonta con quien la pinta, como siempre.
   */
  mostrar?: boolean
}

function BotonDeAccion({ accion, principal }: { accion: AccionDeAlerta; principal: boolean }) {
  const contenido = (
    <>
      {accion.icon}
      {accion.label}
      {!accion.icon && principal && <ArrowRight className="h-3.5 w-3.5" weight="bold" />}
    </>
  )
  const variant = principal ? 'default' : 'ghost'
  if (accion.href) {
    return (
      <Button asChild size="sm" variant={variant} hideArrow>
        <Link href={accion.href} className="gap-1.5">
          {contenido}
        </Link>
      </Button>
    )
  }
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      hideArrow
      onClick={accion.onClick}
      isLoading={accion.cargando}
      disabled={accion.cargando}
      className="gap-1.5"
    >
      {contenido}
    </Button>
  )
}

/**
 * 🔴 QA-CONT-95 I-09 (04-10-2026): el `Alert` del DS pinta el título y el texto
 * de las alertas de advertencia y de éxito con el color de RELLENO
 * (`text-warning` #BF752B sobre #FBF1DD = 3,23:1; el texto, con su
 * `opacity-90`, 2,84:1). La de información ya trae su título oscuro
 * (#1B4F84); a éstas les faltaba. Los tonos de texto de la casa: `-700` en
 * claro y `-100` en oscuro (≥ 4,7:1 con la opacidad del texto).
 */
const TINTA_LEGIBLE: Partial<Record<SeveridadDeAlerta, string>> = {
  warning: 'text-warning-700 dark:text-warning-100',
  success: 'text-success-700 dark:text-success-100',
}

export function AlertaAccionable({
  severidad = 'warning',
  titulo,
  children,
  accion,
  secundaria,
  icon,
  mostrar,
  className,
  ...props
}: AlertaAccionableProps) {
  const alerta = (
    <Alert
      variant={severidad}
      title={titulo}
      icon={icon}
      // Dentro del `Presence` la entrada la pone él: sin la del DS, no sube dos veces.
      className={cn(mostrar !== undefined && '!animate-none', TINTA_LEGIBLE[severidad], className)}
      data-severidad={severidad}
      {...props}
    >
      {children}
      {(accion || secundaria) && (
        <AlertAction className="flex flex-wrap items-center gap-2">
          {accion && <BotonDeAccion accion={accion} principal />}
          {secundaria && <BotonDeAccion accion={secundaria} principal={false} />}
        </AlertAction>
      )}
    </Alert>
  )
  if (mostrar === undefined) return alerta
  return (
    <Presence show={mostrar} initial={false}>
      {alerta}
    </Presence>
  )
}

export default AlertaAccionable
