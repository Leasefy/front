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

import { useEffect, useMemo, useRef, useState } from 'react'
import { House, User, UserPlus } from '@phosphor-icons/react'
import { SegmentedControl, Presence } from '@leasefy/cadence'

import { Input } from '@/components/ui/input'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { consignacionesApi } from '@/lib/api/inmobiliaria.service'
import { useInquilinos } from '@/lib/hooks/use-inquilinos'
import { cuentaDelPortal } from '@/lib/api/inquilinos.service'
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
  if (!partes.propertyId) errores.propertyId = 'Elige el inmueble.'
  const q = partes.inquilino
  if (q.modo === 'existente') {
    if (!q.tenantId) errores.tenantId = 'Elige al inquilino.'
  } else {
    if (q.nombre.trim().length < 2) errores.nombre = 'Escribe el nombre completo.'
    if (q.documento.replace(/\D/g, '').length < 4) errores.documento = 'Escribe el documento.'
    if (!CORREO.test(q.correo.trim())) errores.correo = 'Escribe un correo válido: ahí le llega la invitación.'
  }
  return errores
}

interface Props {
  valor: PartesManuales
  /** `automatico`: lo cambió la pantalla (la persona pedida), no la persona: no cuenta como «tocado». */
  onCambio: (partes: PartesManuales, opciones?: { automatico?: boolean }) => void
  /** El inmueble recién elegido, para precargar el canon en los términos. */
  onInmuebleElegido?: (consignacion: Consignacion) => void
  errores?: Record<string, string>
  /**
   * La persona con la que se llegó (`?inquilino=` desde Inquilinos, QA-INQ
   * I-29). Con cuenta del portal queda elegida en «Ya es inquilino»; sin
   * cuenta (el contrato pide una cuenta para «Ya es inquilino»), pasa a
   * «Nuevo» con sus datos escritos. Si no está en la lista, no se elige nada.
   */
  inquilinoPedido?: string | null
  /**
   * El nombre del inquilino elegido de la lista (`null` sin elegir), para el
   * resumen de «Crear contrato» (QA-CONT C-22). Avisa también cuando la
   * persona llegó ya elegida (`?inquilino=`), no sólo al tocar el selector.
   */
  onNombreDelInquilino?: (nombre: string | null) => void
}

export function PartesDelContratoManual({ valor, onCambio, onInmuebleElegido, errores = {}, inquilinoPedido = null, onNombreDelInquilino }: Props) {
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
        setErrorInmuebles(
          mensajeParaLaPersona(e, {
            porDefecto: 'No pudimos traer los inmuebles.',
            accion: 'traer los inmuebles',
          }),
        )
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
  /*
   * QA-CONT CR-14: «Ya es inquilino» sólo ofrece a quien tiene cuenta del
   * portal. El back exige su id (`@IsUUID`) y una cuenta de inquilino: las
   * personas que en Inquilinos son una identidad (`doc:`/`correo:`) rebotaban
   * con 404 al crear. A ellas se las carga en «Nuevo» con su documento, y el
   * back usa su ficha si el documento ya es de la inmobiliaria.
   */
  const opcionesInquilino = useMemo<ComboboxOption[]>(
    () =>
      [...inquilinos]
        .filter((q) => cuentaDelPortal(q) !== null)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((q) => ({
          value: q.tenantId,
          label: [q.nombre, q.email, q.telefono].filter(Boolean).join(' · '),
        })),
    [inquilinos],
  )

  /* Se resuelve UNA vez, cuando llega la lista: después manda la persona. */
  const pedidoResuelto = useRef(false)
  useEffect(() => {
    if (!inquilinoPedido || pedidoResuelto.current || cargandoInquilinos) return
    pedidoResuelto.current = true
    const persona = inquilinos.find((q) => q.tenantId === inquilinoPedido)
    if (!persona) {
      if (valor.inquilino.modo === 'existente' && valor.inquilino.tenantId === inquilinoPedido) {
        onCambio({ ...valor, inquilino: { modo: 'existente', tenantId: '' } }, { automatico: true })
      }
      return
    }
    if (cuentaDelPortal(persona) === null) {
      onCambio({
        ...valor,
        inquilino: {
          modo: 'nuevo',
          nombre: persona.nombre,
          documento: persona.documento ?? '',
          correo: persona.email ?? '',
          telefono: persona.telefono ?? '',
        },
      }, { automatico: true })
    }
    // `valor`/`onCambio` cambian con cada render del padre; esto corre una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquilinoPedido, cargandoInquilinos, inquilinos])

  const nombreElegido =
    valor.inquilino.modo === 'existente'
      ? (inquilinos.find((q) => q.tenantId === (valor.inquilino as { tenantId: string }).tenantId)?.nombre ?? null)
      : null
  useEffect(() => {
    onNombreDelInquilino?.(nombreElegido)
    // Sólo cuando cambia el nombre: `onNombreDelInquilino` es un setState del padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombreElegido])

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
        <label className="flex items-center gap-2 text-caption font-medium text-fg">
          <House className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          Inmueble consignado
        </label>
        {consignaciones !== null && elegibles.length === 0 && !errorInmuebles ? (
          <p className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-2 text-sm text-fg-muted" data-testid="sin-inmuebles">
            No hay inmuebles consignados libres. Consigna uno desde Inmuebles y vuelve.
          </p>
        ) : (
          <Combobox
            value={valor.propertyId || undefined}
            onChange={elegirInmueble}
            options={opcionesInmueble}
            placeholder={consignaciones === null ? 'Cargando inmuebles…' : 'Busca por código, título o dirección'}
            searchPlaceholder="Escribe #código, título o dirección"
            disabled={consignaciones === null}
            invalid={Boolean(errores.propertyId)}
            data-testid="inmueble-combobox"
          />
        )}
        <Presence show={Boolean(errorInmuebles)} initial={false} distance="xs" as="p" role="alert" className="text-caption text-danger" data-testid="error-de-los-inmuebles">
          {errorInmuebles}
        </Presence>
        <ErrorDelCampo id="inmueble-del-contrato-error" mensaje={errores.propertyId} className="mt-0" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-caption font-medium text-fg">
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
              placeholder={cargandoInquilinos ? 'Cargando inquilinos…' : 'Busca por nombre, correo o teléfono'}
              searchPlaceholder="Nombre, correo o teléfono"
              disabled={cargandoInquilinos}
              invalid={Boolean(errores.tenantId)}
              data-testid="inquilino-combobox"
            />
            {!cargandoInquilinos && inquilinos.length === 0 && (
              <p className="text-caption text-fg-muted" data-testid="sin-inquilinos">
                Todavía no hay inquilinos con arriendos acá. Cárgalo como nuevo.
              </p>
            )}
            <ErrorDelCampo id="inquilino-del-contrato-error" mensaje={errores.tenantId} className="mt-0" />
          </div>
        ) : (
          <div className="space-y-3" data-testid="inquilino-nuevo">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo id="nuevo-nombre" label="Nombre completo" error={errores.nombre}>
                <Input
                  id="nuevo-nombre"
                  aria-invalid={errores.nombre ? true : undefined}
                  aria-describedby="nuevo-nombre-error"
                  value={nuevo?.nombre ?? ''}
                  onChange={(e) => cambiarNuevo('nombre', e.target.value)}
                  autoComplete="off"
                  data-testid="nuevo-nombre"
                />
              </Campo>
              <Campo id="nuevo-documento" label="Documento" error={errores.documento}>
                <Input
                  id="nuevo-documento"
                  aria-invalid={errores.documento ? true : undefined}
                  aria-describedby="nuevo-documento-error"
                  value={nuevo?.documento ?? ''}
                  onChange={(e) => cambiarNuevo('documento', e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  data-testid="nuevo-documento"
                />
              </Campo>
              <Campo id="nuevo-correo" label="Correo" error={errores.correo}>
                <Input
                  id="nuevo-correo"
                  aria-invalid={errores.correo ? true : undefined}
                  aria-describedby="nuevo-correo-error"
                  type="email"
                  value={nuevo?.correo ?? ''}
                  onChange={(e) => cambiarNuevo('correo', e.target.value)}
                  autoComplete="off"
                  data-testid="nuevo-correo"
                />
              </Campo>
              <Campo id="nuevo-telefono" label="Teléfono" hint="Opcional" error={errores.telefono}>
                <Input
                  id="nuevo-telefono"
                  aria-invalid={errores.telefono ? true : undefined}
                  aria-describedby="nuevo-telefono-error"
                  value={nuevo?.telefono ?? ''}
                  onChange={(e) => cambiarNuevo('telefono', e.target.value)}
                  inputMode="tel"
                  autoComplete="off"
                  data-testid="nuevo-telefono"
                />
              </Campo>
            </div>
            <p className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-caption text-fg-muted">
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
  id,
  label,
  error,
  hint,
  children,
}: {
  /** El id del control: el error va en `${id}-error`, el que nombra su `aria-describedby`. */
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-caption font-medium text-fg" htmlFor={id}>
        {label}
      </label>
      {children}
      {/* El error entra suave y, si hay ayuda, se cruza con ella. */}
      <ErrorDelCampo id={`${id}-error`} mensaje={error} pista={hint} className="mt-0" />
    </div>
  )
}
