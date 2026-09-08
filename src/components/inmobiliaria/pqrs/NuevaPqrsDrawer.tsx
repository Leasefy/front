'use client'

/**
 * «Nueva solicitud» — radicar una PQRS a mano desde el panel.
 *
 * Pega a `POST /inmobiliaria/pqrs`. El inmueble y el responsable son
 * opcionales: una queja de un tercero no tiene inmueble, y asignar puede
 * esperar al triage.
 *
 * Nico (2026-09-08): quien la presenta se ELIGE de la lista cuando la hay
 * (inquilinos o propietarios, con buscador); un tercero se escribe. El asunto
 * trae ayuda y sugerencias según el tipo. Va con el cajón de la casa.
 *
 * Las reglas puras (`validarPqrs`, etiquetas, asuntos sugeridos) viven en
 * `./pqrs-reglas` y se reexportan acá para quien las busque junto al cajón.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { RadioCard, RadioCardGroup, SegmentedControl } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble'
import { useAgentes, useConsignaciones } from '@/lib/hooks/useInmobiliaria'
import { ApiError } from '@/lib/api/client'
import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import { inquilinosApi } from '@/lib/api/inquilinos.service'
import { propietariosApi } from '@/lib/api/inmobiliaria.service'
import type { CrearPqrsInput, PqrsSolicitante, PqrsTipo } from '@/lib/api/pqrs-agencia.types'
import { PQRS_SOLICITANTES, PQRS_TIPOS } from '@/lib/api/pqrs-agencia.types'
import {
  ASUNTOS_SUGERIDOS,
  ASUNTO_MAX,
  AYUDA_DEL_ASUNTO,
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

/** Una persona de la lista: lo que se copia al formulario al elegirla. */
export interface PersonaElegible {
  id: string
  nombre: string
  contacto: string
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

/** «Mateo Pérez · mateo@x.co» — el Combobox de cadence filtra sólo por el label, así que el contacto va adentro. */
export function opcionDePersona(p: PersonaElegible): ComboboxOption {
  return { value: p.id, label: p.contacto ? `${p.nombre} · ${p.contacto}` : p.nombre }
}

/** «Te falta el nombre y el asunto.» */
export function loQueFalta(errores: Record<string, string>, solicitante: PqrsSolicitante): string | null {
  const partes: string[] = []
  if (errores.solicitanteNombre) partes.push(solicitante === 'TERCERO' ? 'el nombre' : 'quién la presenta')
  if (errores.asunto) partes.push('el asunto')
  if (errores.descripcion) partes.push('acortar la descripción')
  if (partes.length === 0) return null
  return `Te falta ${partes.join(' y ')}.`
}

export function NuevaPqrsDrawer({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<PqrsFormulario>(PQRS_FORMULARIO_VACIO)
  const [tocado, setTocado] = useState<Record<string, boolean>>({})
  const [enviando, setEnviando] = useState(false)
  const [personaId, setPersonaId] = useState<string>('')

  const { consignaciones } = useConsignaciones()
  const { agentes } = useAgentes()

  // Las listas se leen al abrir: inquilinos y propietarios de la agencia. Si
  // una viene vacía, ese tipo se escribe a mano, sin lista.
  const [inquilinos, setInquilinos] = useState<PersonaElegible[]>([])
  const [propietarios, setPropietarios] = useState<PersonaElegible[]>([])
  useEffect(() => {
    if (!open) return
    let vivo = true
    // Sin lista se escribe a mano: un fallo acá no bloquea la radicación.
    void (async () => {
      try {
        const filas = await inquilinosApi.listar()
        if (vivo) {
          setInquilinos(
            filas.map((i) => ({ id: i.tenantId, nombre: i.nombre, contacto: i.email || i.telefono || '' })),
          )
        }
      } catch {
        /* sin lista */
      }
    })()
    void (async () => {
      try {
        const filas = await propietariosApi.getAll({ limit: 200 })
        if (vivo) {
          setPropietarios(filas.map((p) => ({ id: p.id, nombre: p.name, contacto: p.email || p.phone || '' })))
        }
      } catch {
        /* sin lista */
      }
    })()
    return () => {
      vivo = false
    }
  }, [open])

  // Cada apertura arranca limpia: lo que quedó a medias de la anterior no es
  // de esta solicitud.
  useEffect(() => {
    if (open) {
      setForm(PQRS_FORMULARIO_VACIO)
      setTocado({})
      setPersonaId('')
    }
  }, [open])

  const set = useCallback(<K extends keyof PqrsFormulario>(campo: K, valor: PqrsFormulario[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }))
  }, [])
  const tocar = (campo: string) => setTocado((t) => ({ ...t, [campo]: true }))

  const errores = useMemo(() => validarPqrs(form), [form])
  const falta = loQueFalta(errores, form.solicitanteTipo)
  const valido = !falta

  const personas =
    form.solicitanteTipo === 'INQUILINO' ? inquilinos : form.solicitanteTipo === 'PROPIETARIO' ? propietarios : []
  const opcionesPersona = useMemo(() => personas.map(opcionDePersona), [personas])
  const hayLista = form.solicitanteTipo !== 'TERCERO' && opcionesPersona.length > 0

  const elegirPersona = (id: string | undefined) => {
    setPersonaId(id ?? '')
    const p = personas.find((x) => x.id === id)
    if (p) {
      set('solicitanteNombre', p.nombre)
      set('solicitanteContacto', p.contacto)
      tocar('solicitanteNombre')
    }
  }

  const cambiarSolicitante = (tipo: PqrsSolicitante) => {
    set('solicitanteTipo', tipo)
    // Lo que se eligió de una lista no sirve para el otro tipo; lo que se
    // escribió a mano se queda.
    if (personaId) {
      set('solicitanteNombre', '')
      set('solicitanteContacto', '')
    }
    setPersonaId('')
  }

  const opcionesInmueble = useMemo(
    () => consignaciones.map((c) => ({ value: c.id, label: etiquetaDeInmueble(c) })),
    [consignaciones],
  )
  // El valor es el id de USUARIO, no el de miembro: es lo que guarda el back.
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
      if (err instanceof ApiError && err.status === 401) return
      toast.error('No se pudo radicar la solicitud', {
        description: err instanceof ApiError && err.message.length < 160 ? err.message : undefined,
      })
    } finally {
      setEnviando(false)
    }
  }

  const mostrarError = (campo: keyof PqrsFormulario) => (tocado[campo] ? errores[campo] : undefined)
  const etiquetaDelSolicitante = SOLICITANTE_LABEL[form.solicitanteTipo].toLowerCase()

  return (
    <Cajon abierto={open} onOpenChange={onOpenChange} data-testid="nueva-pqrs-cajon">
      <CajonCabecera
        titulo="Nueva solicitud"
        descripcion="Queda radicada con número y un plazo de 15 días hábiles para responder."
      />
      <form onSubmit={radicar} noValidate className="contents" data-testid="nueva-pqrs-form">
        <CajonCuerpo>
          <div className="space-y-6">
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

            {/* Quién la presenta */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-fg">Quién la presenta</legend>
              <SegmentedControl<PqrsSolicitante>
                aria-label="Tipo de solicitante"
                fullWidth
                value={form.solicitanteTipo}
                onChange={cambiarSolicitante}
                options={PQRS_SOLICITANTES.map((s) => ({ value: s, label: SOLICITANTE_LABEL[s] }))}
              />
              {hayLista ? (
                <div className="space-y-1.5">
                  <Label htmlFor="pqrs-persona">
                    {form.solicitanteTipo === 'INQUILINO' ? 'Inquilino' : 'Propietario'}
                  </Label>
                  <Combobox
                    data-testid="pqrs-persona"
                    options={opcionesPersona}
                    value={personaId || undefined}
                    onChange={elegirPersona}
                    placeholder={`Busca ${etiquetaDelSolicitante === 'inquilino' ? 'al inquilino' : 'al propietario'}`}
                    searchPlaceholder="Nombre, correo o teléfono"
                    contentClassName="z-[400]"
                  />
                  <p className="text-xs text-fg-muted">
                    Al elegirlo se llenan el nombre y el contacto; puedes corregirlos.
                  </p>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="pqrs-nombre">Nombre</Label>
                <Input
                  id="pqrs-nombre"
                  data-testid="pqrs-nombre"
                  value={form.solicitanteNombre}
                  onChange={(e) => set('solicitanteNombre', e.target.value)}
                  onBlur={() => tocar('solicitanteNombre')}
                  placeholder={
                    hayLista
                      ? `O escribe el nombre de un ${etiquetaDelSolicitante} que no esté en la lista`
                      : 'Nombre de quien presenta la solicitud'
                  }
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
                {mostrarError('asunto') ? (
                  <p className="text-xs text-danger">{mostrarError('asunto')}</p>
                ) : (
                  <p className="text-xs text-fg-muted">{AYUDA_DEL_ASUNTO}</p>
                )}
                {/* Los asuntos que se repiten, según el tipo: un clic y se ajusta. */}
                <div className="flex flex-wrap gap-1.5 pt-1" data-testid="pqrs-asuntos-sugeridos">
                  {ASUNTOS_SUGERIDOS[form.tipo].map((asunto) => {
                    const elegido = form.asunto === asunto
                    return (
                      <button
                        key={asunto}
                        type="button"
                        onClick={() => {
                          set('asunto', asunto)
                          tocar('asunto')
                        }}
                        aria-pressed={elegido}
                        className={
                          elegido
                            ? 'rounded-full border border-primary bg-primary-soft px-3 py-1 text-xs font-medium text-primary'
                            : 'rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg'
                        }
                      >
                        {asunto}
                      </button>
                    )
                  })}
                </div>
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
          </div>
        </CajonCuerpo>

        <CajonPie ayuda={falta ? <span data-testid="pqrs-falta">{falta}</span> : null}>
          <Button type="button" variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" hideArrow disabled={!valido || enviando} isLoading={enviando} data-testid="pqrs-radicar">
            Radicar solicitud
          </Button>
        </CajonPie>
      </form>
    </Cajon>
  )
}
