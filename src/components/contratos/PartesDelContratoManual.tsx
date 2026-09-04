'use client'

/**
 * PartesDelContratoManual — sobre qué inmueble y para quién, cuando el
 * contrato NO nace de una postulación.
 *
 * Hasta hoy «Nuevo contrato» sólo sabía armarse sobre una postulación aprobada
 * y, sin postulaciones, era un callejón sin salida. Nico (2026-09-03): «no es
 * necesario que haya postulaciones para crear un nuevo contrato… se pueden
 * asociar inmuebles, inquilinos y propietarios ya creados». Acá se eligen:
 *
 *  · el inmueble, entre los consignados de la agencia que no están arrendados
 *    (el propietario ya cuelga de la consignación, no se vuelve a preguntar);
 *  · el inquilino: uno que ya tiene arriendos con la agencia, o uno nuevo por
 *    documento — si el documento ya es de un inquilino de la agencia el back
 *    reusa su cuenta; si no, le manda la invitación al correo.
 *
 * Es el `Combobox` de cadence (el mismo de `VincularInmueble` y del PUC), no
 * un `Select`: doscientos inmuebles no se encuentran bajando una lista.
 */

import { useEffect, useMemo, useState } from 'react'
import { House, User, UserPlus } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'

import { Input } from '@/components/ui/input'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { consignacionesApi } from '@/lib/api/inmobiliaria.service'
import { useInquilinos } from '@/lib/hooks/use-inquilinos'
import type { Consignacion } from '@/lib/types/inmobiliaria'
import { etiquetaDeInmueble } from './VincularInmueble'

export type SeleccionDeInquilino =
  | { modo: 'existente'; tenantId: string }
  | { modo: 'nuevo'; nombre: string; documento: string; correo: string; telefono: string }

export interface PartesManuales {
  propertyId: string
  inquilino: SeleccionDeInquilino
}

export const PARTES_VACIAS: PartesManuales = {
  propertyId: '',
  inquilino: { modo: 'existente', tenantId: '' },
}

/**
 * Los inmuebles sobre los que se puede armar un contrato: consignación activa
 * de arriendo, con inmueble, y sin arriendo vigente. Un mandato de venta no
 * se arrienda; un inmueble arrendado ya tiene su contrato.
 */
export function inmueblesParaContrato(consignaciones: readonly Consignacion[]): Consignacion[] {
  return consignaciones
    .filter(
      (c) =>
        c.status === 'active' &&
        c.availability !== 'rented' &&
        c.listingType !== 'sale' &&
        Boolean(c.propertyId),
    )
    .sort((a, b) => a.propertyTitle.localeCompare(b.propertyTitle))
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Qué falta para poder crear. Vacío = se puede. */
export function validarPartes(partes: PartesManuales): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!partes.propertyId) errores.propertyId = 'Elegí el inmueble.'
  const q = partes.inquilino
  if (q.modo === 'existente') {
    if (!q.tenantId) errores.tenantId = 'Elegí al inquilino.'
  } else {
    if (q.nombre.trim().length < 2) errores.nombre = 'Escribí el nombre completo.'
    if (q.documento.replace(/\D/g, '').length < 4) errores.documento = 'Escribí el documento.'
    if (!CORREO.test(q.correo.trim())) errores.correo = 'Escribí un correo válido: ahí le llega la invitación.'
  }
  return errores
}

interface Props {
  valor: PartesManuales
  onCambio: (partes: PartesManuales) => void
  /** El inmueble recién elegido, para precargar el canon en los términos. */
  onInmuebleElegido?: (consignacion: Consignacion) => void
  errores?: Record<string, string>
}

export function PartesDelContratoManual({ valor, onCambio, onInmuebleElegido, errores = {} }: Props) {
  const [consignaciones, setConsignaciones] = useState<Consignacion[] | null>(null)
  const [errorInmuebles, setErrorInmuebles] = useState<string | null>(null)
  const { inquilinos, cargando: cargandoInquilinos } = useInquilinos({ buscar: '', estado: 'todos' })

  useEffect(() => {
    let vigente = true
    consignacionesApi
      .getAll({ status: 'ACTIVE' })
      .then((lista) => {
        if (vigente) setConsignaciones(lista)
      })
      .catch((e: unknown) => {
        if (!vigente) return
        setErrorInmuebles(e instanceof Error ? e.message : 'No pudimos traer los inmuebles.')
        setConsignaciones([])
      })
    return () => {
      vigente = false
    }
  }, [])

  const elegibles = useMemo(() => inmueblesParaContrato(consignaciones ?? []), [consignaciones])
  const opcionesInmueble = useMemo<ComboboxOption[]>(
    () => elegibles.map((c) => ({ value: c.propertyId, label: etiquetaDeInmueble(c) })),
    [elegibles],
  )
  const opcionesInquilino = useMemo<ComboboxOption[]>(
    () =>
      [...inquilinos]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((q) => ({
          value: q.tenantId,
          label: [q.nombre, q.email, q.telefono].filter(Boolean).join(' · '),
        })),
    [inquilinos],
  )

  const elegirInmueble = (propertyId: string | undefined) => {
    onCambio({ ...valor, propertyId: propertyId ?? '' })
    const c = elegibles.find((x) => x.propertyId === propertyId)
    if (c) onInmuebleElegido?.(c)
  }

  const cambiarModo = (modo: 'existente' | 'nuevo') => {
    if (modo === valor.inquilino.modo) return
    onCambio({
      ...valor,
      inquilino:
        modo === 'existente'
          ? { modo, tenantId: '' }
          : { modo, nombre: '', documento: '', correo: '', telefono: '' },
    })
  }

  const nuevo = valor.inquilino.modo === 'nuevo' ? valor.inquilino : null
  const cambiarNuevo = (campo: 'nombre' | 'documento' | 'correo' | 'telefono', texto: string) => {
    if (!nuevo) return
    onCambio({ ...valor, inquilino: { ...nuevo, [campo]: texto } })
  }

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-5" data-testid="partes-manuales">
      <div>
        <h2 className="text-base font-semibold text-fg">¿Sobre qué inmueble y para quién?</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          El propietario sale del inmueble consignado. El resto del contrato es igual que cualquier otro.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs font-medium text-fg">
          <House className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          Inmueble consignado
        </label>
        {consignaciones !== null && elegibles.length === 0 && !errorInmuebles ? (
          <p className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-2 text-sm text-fg-muted" data-testid="sin-inmuebles">
            No hay inmuebles consignados libres. Consigná uno desde Inmuebles y volvé.
          </p>
        ) : (
          <Combobox
            value={valor.propertyId || undefined}
            onChange={elegirInmueble}
            options={opcionesInmueble}
            placeholder={consignaciones === null ? 'Cargando inmuebles…' : 'Buscá por código, título o dirección'}
            searchPlaceholder="Escribí #código, título o dirección"
            disabled={consignaciones === null}
            invalid={Boolean(errores.propertyId)}
            data-testid="inmueble-combobox"
          />
        )}
        {errorInmuebles && <p className="text-xs text-danger">{errorInmuebles}</p>}
        {errores.propertyId && <p className="text-xs text-danger">{errores.propertyId}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-fg">
            <User className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            Inquilino
          </label>
          <SegmentedControl<'existente' | 'nuevo'>
            size="sm"
            value={valor.inquilino.modo}
            onChange={cambiarModo}
            aria-label="Inquilino existente o nuevo"
            options={[
              { value: 'existente', label: 'Ya es inquilino' },
              { value: 'nuevo', label: 'Nuevo' },
            ]}
          />
        </div>

        {valor.inquilino.modo === 'existente' ? (
          <div className="space-y-1.5">
            <Combobox
              value={valor.inquilino.tenantId || undefined}
              onChange={(id) => onCambio({ ...valor, inquilino: { modo: 'existente', tenantId: id ?? '' } })}
              options={opcionesInquilino}
              placeholder={cargandoInquilinos ? 'Cargando inquilinos…' : 'Buscá por nombre, correo o teléfono'}
              searchPlaceholder="Nombre, correo o teléfono"
              disabled={cargandoInquilinos}
              invalid={Boolean(errores.tenantId)}
              data-testid="inquilino-combobox"
            />
            {!cargandoInquilinos && inquilinos.length === 0 && (
              <p className="text-xs text-fg-muted" data-testid="sin-inquilinos">
                Todavía no hay inquilinos con arriendos acá. Cargalo como nuevo.
              </p>
            )}
            {errores.tenantId && <p className="text-xs text-danger">{errores.tenantId}</p>}
          </div>
        ) : (
          <div className="space-y-3" data-testid="inquilino-nuevo">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo label="Nombre completo" error={errores.nombre}>
                <Input
                  value={nuevo?.nombre ?? ''}
                  onChange={(e) => cambiarNuevo('nombre', e.target.value)}
                  autoComplete="off"
                  data-testid="nuevo-nombre"
                />
              </Campo>
              <Campo label="Documento" error={errores.documento}>
                <Input
                  value={nuevo?.documento ?? ''}
                  onChange={(e) => cambiarNuevo('documento', e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  data-testid="nuevo-documento"
                />
              </Campo>
              <Campo label="Correo" error={errores.correo}>
                <Input
                  type="email"
                  value={nuevo?.correo ?? ''}
                  onChange={(e) => cambiarNuevo('correo', e.target.value)}
                  autoComplete="off"
                  data-testid="nuevo-correo"
                />
              </Campo>
              <Campo label="Teléfono" hint="Opcional">
                <Input
                  value={nuevo?.telefono ?? ''}
                  onChange={(e) => cambiarNuevo('telefono', e.target.value)}
                  inputMode="tel"
                  autoComplete="off"
                  data-testid="nuevo-telefono"
                />
              </Campo>
            </div>
            <p className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-xs text-fg-muted">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Si el documento ya es de un inquilino de la inmobiliaria se usa su cuenta. Si no, le llega
              al correo una invitación para crear la suya y firmar el contrato.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function Campo({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-fg">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  )
}
