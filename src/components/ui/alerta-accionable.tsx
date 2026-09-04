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
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { Alert, AlertAction } from '@leasefy/cadence'
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

export function AlertaAccionable({
  severidad = 'warning',
  titulo,
  children,
  accion,
  secundaria,
  icon,
  className,
  ...props
}: AlertaAccionableProps) {
  return (
    <Alert
      variant={severidad}
      title={titulo}
      icon={icon}
      className={cn(className)}
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
}

export default AlertaAccionable
