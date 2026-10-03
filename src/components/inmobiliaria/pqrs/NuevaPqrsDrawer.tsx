'use client'

/**
 * «Nueva solicitud» — radicar una PQRS a mano desde el panel.
 *
 * Pega a `POST /inmobiliaria/pqrs`. El inmueble es opcional (una queja de un
 * tercero no tiene inmueble); el RESPONSABLE no: decisión de negocio de Nico
 * del 2026-09-15, una PQRS no puede quedar sin quien responda. Viene
 * preelegida la persona que está radicando, que es quien la tiene en la mano.
 *
 * Nico (2026-09-08): quien la presenta se ELIGE de la lista cuando la hay
 * (inquilinos o propietarios, con buscador); un tercero se escribe. El asunto
 * trae ayuda y sugerencias según el tipo. Va con el cajón de la casa.
 *
 * Las reglas puras (`validarPqrs`, etiquetas, asuntos sugeridos) viven en
 * `./pqrs-reglas` y se reexportan acá para quien las busque junto al cajón.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { Collapse, MotionIndicator, RadioCard, RadioCardGroup, SegmentedControl } from '@leasefy/cadence'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble'
import { useAgentes, useConsignaciones } from '@/lib/hooks/useInmobiliaria'
import { loQueDiceUnSelector } from '@/lib/errores/lo-que-dice-un-selector'
import { useAuth } from '@/lib/auth'
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
  if (errores.asignadoAUserId) partes.push('quién responde')
  if (errores.asunto) partes.push('el asunto')
  if (errores.descripcion) partes.push('acortar la descripción')
  if (partes.length === 0) return null
  return `Te falta ${partes.join(' y ')}.`
}

/** Los campos del formulario, en el orden en que se ven: el foco va al primero con error. */
const CAMPOS_DE_LA_PQRS: readonly (keyof PqrsFormulario)[] = [
  'tipo',
  'solicitanteTipo',
  'solicitanteNombre',
  'solicitanteContacto',
  'consignacionId',
  'asignadoAUserId',
  'asunto',
  'descripcion',
]

/** El control de cada campo, para el foco. */
const ID_DEL_CAMPO: Partial<Record<keyof PqrsFormulario, string>> = {
  solicitanteNombre: 'pqrs-nombre',
  solicitanteContacto: 'pqrs-contacto',
  asunto: 'pqrs-asunto',
  descripcion: 'pqrs-descripcion',
}

export function NuevaPqrsDrawer({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<PqrsFormulario>(PQRS_FORMULARIO_VACIO)
  const [tocado, setTocado] = useState<Record<string, boolean>>({})
  const [enviando, setEnviando] = useState(false)
  const [personaId, setPersonaId] = useState<string>('')
  /** Lo que rechazó el back, por campo (02-10-2026); cada campo borra el suyo al tocarse. */
  const [delServidor, setDelServidor] = useState<Partial<Record<keyof PqrsFormulario, string>>>({})
  const cuerpo = useRef<HTMLDivElement>(null)

  /* El error se lee: con la lectura caída, «Sin inmuebles consignados» era un
     fallo disfrazado de vacío (21-09). */
  const { consignaciones, isLoading: cargandoInmuebles, errorCrudo: errorDeInmuebles } =
    useConsignaciones()
  const { agentes } = useAgentes()
  const { user } = useAuth()

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
      setDelServidor({})
    }
  }, [open])

  const set = useCallback(<K extends keyof PqrsFormulario>(campo: K, valor: PqrsFormulario[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setDelServidor((d) => (d[campo] ? { ...d, [campo]: undefined } : d))
  }, [])
  const tocar = (campo: string) => setTocado((t) => ({ ...t, [campo]: true }))

  // El valor es el id de USUARIO, no el de miembro: es lo que guarda el back.
  const opcionesAgente = useMemo(
    () =>
      agentes
        .filter((a): a is typeof a & { userId: string } => Boolean(a.userId))
        .map((a) => ({ value: a.userId, label: a.name })),
    [agentes],
  )

  const errores = useMemo(
    () => validarPqrs(form, opcionesAgente.length > 0),
    [form, opcionesAgente.length],
  )
  const falta = loQueFalta(errores, form.solicitanteTipo)
  const valido = !falta

  const personas =
    form.solicitanteTipo === 'INQUILINO' ? inquilinos : form.solicitanteTipo === 'PROPIETARIO' ? propietarios : []
  const opcionesPersona = useMemo(() => personas.map(opcionDePersona), [personas])
  const hayLista = form.solicitanteTipo !== 'TERCERO' && opcionesPersona.length > 0
  // El buscador de la persona se pliega con su altura al pasar a «Tercero»;
  // mientras se va, conserva su rótulo.
  const tipoConLista = useUltimoPresente(hayLista ? form.solicitanteTipo : null)
  // El asunto sugerido elegido lleva su marca, que se DESLIZA a la nueva elección.
  const indicadorDelAsunto = `${useId()}-asunto`

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
  // Responsable por defecto: quien está radicando. Es la lectura honesta de
  // la decisión de Nico —«no puede quedar sin responsable»— sin obligar a
  // elegir en la lista cada vez; se cambia con un clic. Sólo al abrir y sólo
  // si no hay nadie elegido: no pisa lo que la persona ya eligió.
  useEffect(() => {
    if (!open || form.asignadoAUserId || !user?.id) return
    if (!opcionesAgente.some((o) => o.value === user.id)) return
    setForm((f) => (f.asignadoAUserId ? f : { ...f, asignadoAUserId: user.id }))
  }, [open, form.asignadoAUserId, opcionesAgente, user?.id])

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
      // 02-10-2026: lo del back va a SU campo, con el foco en el primero; al
      // aviso, por el traductor, sólo lo que no tiene dónde ir. Antes un motivo
      // de más de 160 caracteres se perdía entero.
      const reparto = repartirErroresDelServidor<keyof PqrsFormulario>(err, {
        campos: CAMPOS_DE_LA_PQRS,
        porDefecto: 'Prueba de nuevo en un momento.',
        accion: 'radicar la solicitud',
      })
      setDelServidor(reparto.porCampo)
      const primero = reparto.orden[0]
      if (primero) {
        const id = ID_DEL_CAMPO[primero]
        const control = id
          ? document.getElementById(id)
          : cuerpo.current?.querySelector<HTMLElement>(`[data-campo="${primero}"] :is(input, button)`)
        control?.focus()
      }
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo radicar la solicitud', { description: reparto.sueltos.join(' · ') })
      }
    } finally {
      setEnviando(false)
    }
  }

  /** El del servidor primero; el del cliente, cuando el campo ya se tocó. */
  const mostrarError = (campo: keyof PqrsFormulario) =>
    delServidor[campo] ?? (tocado[campo] ? errores[campo] : undefined)
  const etiquetaDelSolicitante = SOLICITANTE_LABEL[form.solicitanteTipo].toLowerCase()

  return (
    <Cajon abierto={open} onOpenChange={onOpenChange} data-testid="nueva-pqrs-cajon">
      <CajonCabecera
        titulo="Nueva solicitud"
        descripcion="Queda radicada con número y un plazo de 15 días hábiles para responder."
      />
      <form onSubmit={radicar} noValidate className="contents" data-testid="nueva-pqrs-form">
        <CajonCuerpo>
          <div className="space-y-6" ref={cuerpo}>
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
              <Collapse open={hayLista} className="space-y-1.5">
                  <Label htmlFor="pqrs-persona">
                    {tipoConLista === 'INQUILINO' ? 'Inquilino' : 'Propietario'}
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
              </Collapse>
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
                  aria-describedby={mostrarError('solicitanteNombre') ? 'pqrs-nombre-error' : undefined}
                  required
                />
                <ErrorDelCampo id="pqrs-nombre-error" mensaje={mostrarError('solicitanteNombre')} className="mt-0" />
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
                  aria-invalid={delServidor.solicitanteContacto ? true : undefined}
                  aria-describedby={delServidor.solicitanteContacto ? 'pqrs-contacto-error' : undefined}
                />
                <ErrorDelCampo id="pqrs-contacto-error" mensaje={delServidor.solicitanteContacto} className="mt-0" />
              </div>
            </fieldset>

            {/* Inmueble + responsable */}
            <div className="space-y-3">
              <div className="space-y-1.5" data-campo="consignacionId">
                <Label htmlFor="pqrs-inmueble">
                  Inmueble <span className="text-fg-muted font-normal">(opcional)</span>
                </Label>
                <Combobox
                  data-testid="pqrs-inmueble"
                  options={opcionesInmueble}
                  value={form.consignacionId || undefined}
                  onChange={(v) => set('consignacionId', v ?? '')}
                  placeholder={loQueDiceUnSelector({
                    cargando: cargandoInmuebles,
                    error: errorDeInmuebles,
                    cuantos: opcionesInmueble.length,
                    queSon: 'los inmuebles',
                    pista: 'Buscar un inmueble',
                    cuandoNoHay: 'Sin inmuebles consignados',
                  })}
                  searchPlaceholder="Código, título o dirección"
                  disabled={opcionesInmueble.length === 0}
                  contentClassName="z-[400]"
                />
                <ErrorDelCampo id="pqrs-inmueble-error" mensaje={delServidor.consignacionId} className="mt-0" />
              </div>
              <div className="space-y-1.5" data-campo="asignadoAUserId">
                <Label htmlFor="pqrs-asignado">Responsable</Label>
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
                {/* Quién responde no es un detalle administrativo: es contra
                    quién corre el reloj de los 15 días hábiles de la Ley 1755. */}
                <ErrorDelCampo
                  id="pqrs-asignado-error"
                  mensaje={delServidor.asignadoAUserId}
                  className="mt-0"
                  pista={
                    opcionesAgente.length
                      ? 'Quien responde hasta que se reasigne. El plazo de ley corre para esta persona.'
                      : 'Todavía no hay agentes en la lista: responderá quien la radique.'
                  }
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
                  aria-describedby={mostrarError('asunto') ? 'pqrs-asunto-error' : undefined}
                  required
                />
                {/* La ayuda y el error se cruzan: nunca se ven los dos ni salta el alto. */}
                <ErrorDelCampo
                  id="pqrs-asunto-error"
                  mensaje={mostrarError('asunto')}
                  pista={AYUDA_DEL_ASUNTO}
                  className="mt-0"
                />
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
                            ? 'relative isolate rounded-full border border-transparent px-3 py-1 text-xs font-medium text-primary'
                            : 'relative isolate rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg'
                        }
                      >
                        {/* La marca del elegido (mismo borde y fondo cobalto)
                            viaja desde el asunto anterior. */}
                        {elegido && (
                          <MotionIndicator
                            layoutId={indicadorDelAsunto}
                            className="-inset-px -z-10 rounded-full border border-primary bg-primary-soft"
                          />
                        )}
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
                  aria-invalid={mostrarError('descripcion') ? true : undefined}
                  aria-describedby={mostrarError('descripcion') ? 'pqrs-descripcion-error' : undefined}
                />
                <ErrorDelCampo id="pqrs-descripcion-error" mensaje={mostrarError('descripcion')} className="mt-0" />
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
