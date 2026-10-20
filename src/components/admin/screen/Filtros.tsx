'use client'

import { SearchInput } from '@leasefy/cadence'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTenantOptions } from '@/lib/admin/use-tenant-options'

/**
 * Las piezas de la barra de filtros de las tablas del admin, con los controles
 * de Cadence: el buscador (`SearchInput`), los desplegables (`Select`) y la
 * fila que los acomoda (en el celular, uno debajo del otro).
 */

/** La fila de filtros: va en el `barra` del `DataTable`. */
export function BarraDeFiltros({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end', className)}>{children}</div>
}

/** Un filtro con su rótulo arriba. */
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
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-caption text-fg-muted">
        {etiqueta}
      </Label>
      {children}
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
  return (
    <SearchInput
      id={id}
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
  return (
    <Select value={value || (todas !== null ? TODAS : undefined)} onValueChange={(v) => onChange(v === TODAS ? '' : v)}>
      <SelectTrigger id={id} aria-label={ariaLabel} data-testid={testId} className={cn('w-full sm:w-56', className)}>
        <SelectValue placeholder={todas ?? 'Elegir'} />
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
