'use client'

/**
 * El vacío, que son DOS vacíos distintos.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * Una lista sin filas puede significar dos cosas opuestas, y la pantalla las
 * decía igual:
 *
 *   «Todavía no hay inmuebles»  → nunca creaste uno. Lo útil es crear el primero.
 *   «Todavía no hay inmuebles»  → tenés 200, pero ninguno coincide con lo que
 *                                 buscaste. Lo útil es limpiar el filtro.
 *
 * Decirle «no tenés inmuebles» a alguien que tiene 200 es afirmar algo falso, y
 * además lo deja sin salida: el botón que necesita —limpiar la búsqueda— no
 * está. Nico lo reportó al revés: una pantalla sin nada creado que en vez de
 * invitar a crear mostraba un error.
 *
 * ⚠️ Este componente es SÓLO para el vacío. «Cargando» y «falló» los resuelve
 * `EstadoDeDatos` antes de llegar acá — son cuatro estados, no dos.
 * Ver `src/components/estado/EstadoDeDatos.tsx`.
 */

import Link from 'next/link'
import { MagnifyingGlass, Plus, type Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SinDatosProps {
  /**
   * ¿Hay una búsqueda o un filtro puesto? Es lo único que distingue los dos
   * vacíos, y tiene que salir del estado real de los filtros — no de si la
   * lista quedó corta.
   */
  hayFiltros?: boolean
  /** En plural y en minúscula: «inmuebles», «contratos», «propietarios». */
  queSon: string
  /** El icono del dominio. Sólo se usa en el vacío de verdad. */
  icono?: Icon
  /** Texto propio para el vacío de verdad; si no, se arma con `queSon`. */
  titulo?: string
  descripcion?: string
  /** Crear el primero. Sólo aparece cuando NO hay filtros puestos. */
  crear?: { label: string; href?: string; onClick?: () => void }
  /**
   * Una acción propia, cuando crear no es «ir a una ruta».
   *
   * ⚠️ Existe porque algunas cosas NO se crean desde cero: un contrato nace de
   * una postulación aprobada, y `/contratos/nuevo` sin `?applicationId=`
   * responde «Falta el parámetro applicationId». Un enlace ahí es un botón que
   * lleva a un error. Tiene prioridad sobre `crear`.
   */
  accion?: React.ReactNode
  /** Volver a ver todo. Sólo aparece cuando SÍ hay filtros. */
  onLimpiarFiltros?: () => void
  className?: string
}

export function SinDatos({
  hayFiltros = false,
  queSon,
  icono: IconoDelDominio,
  titulo,
  descripcion,
  crear,
  accion,
  onLimpiarFiltros,
  className,
}: SinDatosProps) {
  const Icono = hayFiltros ? MagnifyingGlass : (IconoDelDominio ?? MagnifyingGlass)

  const tituloFinal = hayFiltros
    ? `Ningún resultado`
    : (titulo ?? `Todavía no tenés ${queSon}`)

  const descripcionFinal = hayFiltros
    ? `Ningún ${queSon.replace(/e?s$/, '')} coincide con lo que buscaste. Probá con otra búsqueda o quitá los filtros.`
    : (descripcion ?? `Cuando agregues el primero, aparece acá.`)

  return (
    <div
      className={cn('px-6 py-16 text-center', className)}
      data-testid="sin-datos"
      data-caso={hayFiltros ? 'filtros' : 'vacio'}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
        <Icono weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-[15px] font-semibold text-fg">{tituloFinal}</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
          {descripcionFinal}
        </p>
      </div>

      {/* La acción cambia con el caso: crear cuando no hay nada, limpiar
          cuando lo que falta es lo que se buscó. Ofrecer «crear el primero»
          a quien tiene 200 y filtró mal no le sirve de nada. */}
      {(hayFiltros ? Boolean(onLimpiarFiltros) : Boolean(crear) || Boolean(accion)) && (
        <div className="mt-6 flex justify-center">
          {hayFiltros ? (
            <Button variant="outline" onClick={onLimpiarFiltros} data-testid="limpiar-filtros">
              Quitar los filtros
            </Button>
          ) : accion ? (
            accion
          ) : crear?.href ? (
            <Button asChild className="gap-2">
              <Link href={crear.href}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {crear.label}
              </Link>
            </Button>
          ) : (
            <Button onClick={crear?.onClick} className="gap-2" data-testid="crear-el-primero">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {crear?.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
