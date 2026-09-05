'use client'

/**
 * «Nueva solicitud» — radicar una PQRS a mano desde el panel.
 *
 * Antes el botón sólo avisaba que «se habilita con el motor» (Nico: «cuando le
 * doy nueva solicitud no deja»). Ahora pega a `POST /inmobiliaria/pqrs`. El
 * inmueble y el responsable son opcionales: una queja de un tercero no tiene
 * inmueble, y asignar puede esperar al triage.
 *
 * Las reglas puras (`validarPqrs`, etiquetas) viven en `./pqrs-reglas` y se
 * reexportan acá para quien las busque junto al cajón.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { RadioCard, RadioCardGroup, SegmentedControl } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble'
import { useAgentes, useConsignaciones } from '@/lib/hooks/useInmobiliaria'
import { ApiError } from '@/lib/api/client'
import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import type { CrearPqrsInput, PqrsSolicitante, PqrsTipo } from '@/lib/api/pqrs-agencia.types'
import { PQRS_SOLICITANTES, PQRS_TIPOS } from '@/lib/api/pqrs-agencia.types'
import {
  ASUNTO_MAX,
  DESCRIPCION_MAX,
  PQRS_FORMULARIO_VACIO,
  SOLICITANTE_LABEL,
  TIPO_DESCRIPCION,
  TIPO_LABEL,
  validarPqrs,
  type PqrsFormulario,
} from './pqrs-reglas'

export { validarPqrs, PQRS_FORMULARIO_VACIO, type PqrsFormulario } from './pqrs-reglas'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se radicó: la pantalla recarga la lista. */
  onCreated: () => void
}

/** Del formulario al contrato del back: sin vacíos, sin espacios de sobra. */
export function armarPayload(form: PqrsFormulario): CrearPqrsInput {
  const payload: CrearPqrsInput = {
    tipo: form.tipo,
    solicitanteTipo: form.solicitanteTipo,
    solicitanteNombre: form.solicitanteNombre.trim(),
    asunto: form.asunto.trim(),
  }
  const contacto = form.solicitanteContacto.trim()
  if (contacto) payload.solicitanteContacto = contacto
  const descripcion = form.descripcion.trim()
  if (descripcion) payload.descripcion = descripcion
  if (form.consignacionId) payload.consignacionId = form.consignacionId
  if (form.asignadoAUserId) payload.asignadoAUserId = form.asignadoAUserId
  return payload
}

export function NuevaPqrsDrawer({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<PqrsFormulario>(PQRS_FORMULARIO_VACIO)
  const [tocado, setTocado] = useState<Record<string, boolean>>({})
  const [enviando, setEnviando] = useState(false)

  const { consignaciones } = useConsignaciones()
  const { agentes } = useAgentes()

  // Cada apertura arranca limpia: lo que quedó a medias de la anterior no es
  // de esta solicitud.
  useEffect(() => {
    if (open) {
      setForm(PQRS_FORMULARIO_VACIO)
      setTocado({})
    }
  }, [open])

  const set = useCallback(<K extends keyof PqrsFormulario>(campo: K, valor: PqrsFormulario[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }))
  }, [])
  const tocar = (campo: string) => setTocado((t) => ({ ...t, [campo]: true }))

  const errores = useMemo(() => validarPqrs(form), [form])
  const valido = Object.keys(errores).length === 0

  const opcionesInmueble = useMemo(
    () => consignaciones.map((c) => ({ value: c.id, label: etiquetaDeInmueble(c) })),
    [consignaciones],
  )
  // El valor es el id de USUARIO, no el de miembro: es lo que guarda el back.
  // Un invitado sin usuario todavía no puede recibir nada.
  const opcionesAgente = useMemo(
    () =>
      agentes
        .filter((a): a is typeof a & { userId: string } => Boolean(a.userId))
        .map((a) => ({ value: a.userId, label: a.name })),
    [agentes],
  )

  async function radicar(e: React.FormEvent) {
    e.preventDefault()
    if (!valido || enviando) return
    setEnviando(true)
    try {
      const creada = await pqrsApi.crear(armarPayload(form))
      toast.success(`Solicitud radicada · ${creada.radicado}`)
      onCreated()
      onOpenChange(false)
    } catch (err) {
      // Con la sesión vencida el cliente ya está cerrando sesión: un «no se
      // pudo radicar» encima sería mentira.
      if (err instanceof ApiError && err.status === 401) return
      toast.error('No se pudo radicar la solicitud', {
        description: err instanceof ApiError && err.message.length < 160 ? err.message : undefined,
      })
    } finally {
      setEnviando(false)
    }
  }

  const mostrarError = (campo: keyof PqrsFormulario) => (tocado[campo] ? errores[campo] : undefined)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" data-lenis-prevent>
        <SheetHeader className="space-y-1 border-b border-border pb-4">
          <SheetTitle className="text-lg font-semibold text-fg">Nueva solicitud</SheetTitle>
          <SheetDescription className="text-sm text-fg-muted">
            Queda radicada con número y un plazo de 15 días hábiles para responder.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={radicar} noValidate className="mt-6 space-y-6" data-testid="nueva-pqrs-form">
          {/* Tipo */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-fg">Tipo</legend>
            <RadioCardGroup
              value={form.tipo}
              onValueChange={(v) => set('tipo', v as PqrsTipo)}
              orientation="horizontal"
              aria-label="Tipo de solicitud"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {PQRS_TIPOS.map((tipo) => (
                <RadioCard
                  key={tipo}
                  value={tipo}
                  label={TIPO_LABEL[tipo]}
                  description={TIPO_DESCRIPCION[tipo]}
                  data-testid={`tipo-${tipo}`}
                />
              ))}
            </RadioCardGroup>
          </fieldset>

          {/* Solicitante */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-fg">Quién la presenta</legend>
            <SegmentedControl<PqrsSolicitante>
              aria-label="Tipo de solicitante"
              fullWidth
              value={form.solicitanteTipo}
              onChange={(v) => set('solicitanteTipo', v)}
              options={PQRS_SOLICITANTES.map((s) => ({ value: s, label: SOLICITANTE_LABEL[s] }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="pqrs-nombre">Nombre</Label>
              <Input
                id="pqrs-nombre"
                data-testid="pqrs-nombre"
                value={form.solicitanteNombre}
                onChange={(e) => set('solicitanteNombre', e.target.value)}
                onBlur={() => tocar('solicitanteNombre')}
                placeholder="Nombre de quien presenta la solicitud"
                maxLength={200}
                autoComplete="off"
                aria-invalid={Boolean(mostrarError('solicitanteNombre'))}
                required
              />
              {mostrarError('solicitanteNombre') && (
                <p className="text-xs text-danger">{mostrarError('solicitanteNombre')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pqrs-contacto">
                Contacto <span className="text-fg-muted font-normal">(opcional)</span>
              </Label>
              <Input
                id="pqrs-contacto"
                data-testid="pqrs-contacto"
                value={form.solicitanteContacto}
                onChange={(e) => set('solicitanteContacto', e.target.value)}
                placeholder="Correo o teléfono"
                maxLength={200}
                autoComplete="off"
              />
            </div>
          </fieldset>

          {/* Inmueble + responsable */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pqrs-inmueble">
                Inmueble <span className="text-fg-muted font-normal">(opcional)</span>
              </Label>
              <Combobox
                data-testid="pqrs-inmueble"
                options={opcionesInmueble}
                value={form.consignacionId || undefined}
                onChange={(v) => set('consignacionId', v ?? '')}
                placeholder={opcionesInmueble.length ? 'Buscar un inmueble' : 'Sin inmuebles consignados'}
                searchPlaceholder="Código, título o dirección"
                disabled={opcionesInmueble.length === 0}
                contentClassName="z-[400]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pqrs-asignado">
                Asignar a <span className="text-fg-muted font-normal">(opcional)</span>
              </Label>
              <Combobox
                data-testid="pqrs-asignado"
                options={opcionesAgente}
                value={form.asignadoAUserId || undefined}
                onChange={(v) => set('asignadoAUserId', v ?? '')}
                placeholder={opcionesAgente.length ? 'Elegir un responsable' : 'Sin agentes activos'}
                searchPlaceholder="Nombre del agente"
                disabled={opcionesAgente.length === 0}
                contentClassName="z-[400]"
              />
            </div>
          </div>

          {/* Asunto + descripción */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="pqrs-asunto">Asunto</Label>
                <span className="text-xs tabular-nums text-fg-muted">
                  {form.asunto.length}/{ASUNTO_MAX}
                </span>
              </div>
              <Input
                id="pqrs-asunto"
                data-testid="pqrs-asunto"
                value={form.asunto}
                onChange={(e) => set('asunto', e.target.value)}
                onBlur={() => tocar('asunto')}
                placeholder="En una línea, de qué se trata"
                maxLength={ASUNTO_MAX}
                aria-invalid={Boolean(mostrarError('asunto'))}
                required
              />
              {mostrarError('asunto') && <p className="text-xs text-danger">{mostrarError('asunto')}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="pqrs-descripcion">
                  Descripción <span className="text-fg-muted font-normal">(opcional)</span>
                </Label>
                <span className="text-xs tabular-nums text-fg-muted">
                  {form.descripcion.length}/{DESCRIPCION_MAX}
                </span>
              </div>
              <Textarea
                id="pqrs-descripcion"
                data-testid="pqrs-descripcion"
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Qué pasó, desde cuándo, qué se pide"
                maxLength={DESCRIPCION_MAX}
                rows={5}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" hideArrow disabled={!valido || enviando} data-testid="pqrs-radicar">
              {enviando ? 'Radicando…' : 'Radicar solicitud'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
