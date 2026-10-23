'use client'

import { createContext, useContext } from 'react'
import { SearchInput } from '@leasefy/cadence'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTenantOptions } from '@/lib/admin/use-tenant-options'
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha'

/**
 * Las piezas de la barra de filtros de las tablas del admin, con los controles
 * de Cadence: el buscador (`SearchInput`), los desplegables (`Select`) y la
 * fila que los acomoda (en el celular, uno debajo del otro).
 *
 * 🔴 21-10-2026 (Nico: «mira esos selects por ahí tirados»): cada filtro ponía
 * su rótulo ARRIBA y la fila alineaba por abajo, así que los desplegables
 * quedaban flotando en dos o tres renglones sobre el buscador. Ahora todo va en
 * UNA línea, a la misma altura: el desplegable lleva su rótulo ADENTRO
 * («Migración: Todas»), y una fecha o un texto lo lleva a la izquierda, en la
 * misma línea (skill `revisor-de-diseno`, «Filtros de una lista»).
 */

/** El rótulo del filtro, para que el control lo pinte adentro. */
const EtiquetaDelFiltro = createContext<string | null>(null)

/** La fila de filtros: va en el `barra` del `DataTable`. */
export function BarraDeFiltros({ children, className }: { children: React.ReactNode; className?: string }) {
  // Entre un filtro y el siguiente, más aire que entre un rótulo y su control (proximidad).
  return <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4', className)}>{children}</div>
}

/**
 * Un rango de fechas como UN filtro: «Fecha [desde] – [hasta]». Antes eran dos
 * filtros sueltos («Desde», «Hasta»), cada uno con su rótulo y su ancho fijo.
 */
export function FiltroDeFechas({
  desde,
  hasta,
  onDesde,
  onHasta,
  etiqueta = 'Fecha',
  idDesde = 'filtro-desde',
  idHasta = 'filtro-hasta',
}: {
  desde: string
  hasta: string
  onDesde: (valor: string) => void
  onHasta: (valor: string) => void
  etiqueta?: string
  idDesde?: string
  idHasta?: string
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label={etiqueta}>
      <span className="shrink-0 whitespace-nowrap text-caption text-fg-muted">{etiqueta}</span>
      <Label htmlFor={idDesde} className="sr-only">
        Desde
      </Label>
      <div className="w-[9.5rem]">
        <CampoDeFecha id={idDesde} value={desde} onChange={onDesde} placeholder="Desde" />
      </div>
      <span aria-hidden="true" className="text-fg-subtle">
        –
      </span>
      <Label htmlFor={idHasta} className="sr-only">
        Hasta
      </Label>
      <div className="w-[9.5rem]">
        <CampoDeFecha id={idHasta} value={hasta} onChange={onHasta} placeholder="Hasta" />
      </div>
    </div>
  )
}

/**
 * Un filtro con su rótulo. Un desplegable o un buscador lo muestran ADENTRO
 * (marcan `data-etiqueta-adentro` y el rótulo de acá queda sólo para el lector
 * de pantalla); una fecha o un texto lo muestran a la izquierda, en la línea.
 */
export function Filtro({
  etiqueta,
  htmlFor,
  children,
  className,
}: {
  etiqueta: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 [&:has([data-etiqueta-adentro])>label]:sr-only',
        className,
      )}
    >
      <Label htmlFor={htmlFor} className="shrink-0 whitespace-nowrap text-caption text-fg-muted">
        {etiqueta}
      </Label>
      <EtiquetaDelFiltro.Provider value={etiqueta}>{children}</EtiquetaDelFiltro.Provider>
    </div>
  )
}

/** El buscador de texto de una tabla. */
export function Buscador({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
  id,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  className?: string
  id?: string
  'aria-label'?: string
}) {
  const enUnFiltro = useContext(EtiquetaDelFiltro) !== null
  return (
    <SearchInput
      id={id}
      data-etiqueta-adentro={enUnFiltro && placeholder !== 'Buscar…' ? '' : undefined}
      inputSize="md"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClear={() => onChange('')}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className={cn('w-full', className)}
    />
  )
}

/** Radix no deja un ítem con valor vacío: «Todas» viaja con esta marca. */
const TODAS = '__todas__'

/**
 * Un desplegable de una opción con «Todas» arriba. `value` vacío = todas (así
 * lo guardan los filtros en la URL).
 */
export function Desplegable({
  value,
  onChange,
  opciones,
  todas = 'Todas',
  id,
  className,
  'aria-label': ariaLabel,
  'data-testid': testId,
}: {
  value: string
  onChange: (valor: string) => void
  opciones: Array<{ valor: string; nombre: string }>
  /** El texto de «sin filtro». `null` = no hay opción vacía. */
  todas?: string | null
  id?: string
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const etiqueta = useContext(EtiquetaDelFiltro)
  return (
    <Select value={value || (todas !== null ? TODAS : undefined)} onValueChange={(v) => onChange(v === TODAS ? '' : v)}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel ?? etiqueta ?? undefined}
        data-testid={testId}
        data-etiqueta-adentro={etiqueta ? '' : undefined}
        data-activo={value ? '' : undefined}
        className={cn(
          etiqueta ? 'w-full gap-1.5 sm:w-auto sm:min-w-[10rem] sm:max-w-[20rem]' : 'w-full sm:w-56',
          // Un filtro puesto se nota sin abrirlo.
          value && 'border-fg/30 font-medium text-fg',
          className,
        )}
      >
        {etiqueta ? <span className="shrink-0 text-fg-muted">{etiqueta}:</span> : null}
        <span className="min-w-0 truncate">
          <SelectValue placeholder={todas ?? 'Elegir'} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {todas !== null ? <SelectItem value={TODAS}>{todas}</SelectItem> : null}
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** El desplegable de inmobiliarias, con las de `GET /tenants`. */
export function SelectorDeInmobiliaria({
  value,
  onChange,
  id,
  className,
}: {
  value: string
  onChange: (tenantId: string) => void
  id?: string
  className?: string
}) {
  const inmobiliarias = useTenantOptions()
  return (
    <Desplegable
      id={id}
      className={className}
      value={value}
      onChange={onChange}
      todas="Todas las inmobiliarias"
      aria-label="Inmobiliaria"
      opciones={(inmobiliarias.data ?? []).map((t) => ({ valor: t.tenant_id, nombre: t.legal_name }))}
    />
  )
}
