'use client'

/**
 * RequisitosClient — qué le pide esta inmobiliaria a cada tipo de inquilino.
 *
 * ── F-05 (18-09-2026) ──────────────────────────────────────────────────────
 *
 * «Los requisitos por tipo de inquilino LOS DEFINE CADA INMOBILIARIA.»
 *
 * ── 🔴 Lo que faltaba para que eso fuera cierto (18-09-2026, de noche) ─────
 *
 * Se podía volver un requisito opcional y nada más: `crearRequisito` y
 * `borrarRequisito` existían en el back y **no tenían un solo consumidor**. O
 * sea que la inmobiliaria no definía su lista: heredaba la nuestra y le movía
 * un interruptor. Ahora se puede agregar el papel que esta inmobiliaria sí pide
 * y quitar el que no.
 *
 * Y en «Todos los perfiles» la lista venía plana, así que «Cédula» aparecía
 * cinco veces seguidas —una por perfil— y parecía un error de la pantalla.
 * Ahora va agrupada por perfil, que es como está organizada la decisión.
 *
 * ── Las dos cosas que esta pantalla deja claras ────────────────────────────
 *
 *   1. **cuando todavía es el sugerido, lo dice**. Una lista que parece propia y
 *      no lo es hace que nadie la revise, y el día que el candidato sube los
 *      papeles equivocados nadie entiende por qué.
 *   2. 🔴 **el estudio de Leasefy no se puede apagar** (F-08: «nunca se firma o
 *      postula sin el estudio»). Se muestra con candado y sin interruptor, no
 *      con un interruptor que después devuelve un 409: un control deshabilitado
 *      con su porqué al lado enseña la regla; uno que falla, enseña a
 *      desconfiar de la pantalla.
 */

import { useEffect, useMemo, useState } from 'react'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import {
  ListChecks,
  Lock,
  Plus,
  Trash,
  X,
  FileArrowUp,
  TextAa,
  Handshake,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { useLenis } from '@/components/providers/SmoothScroll'
import { toast } from '@/components/ui/toast'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Textarea,
} from '@/components/ui'
import {
  postulacionesApi,
  type RequisitoDePostulacion,
} from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'
import { cn } from '@/lib/utils'

type Clase = 'DOCUMENTO' | 'DATO' | 'ACCION'

/**
 * Qué tiene que HACER el candidato con cada requisito. «Hace algo» —lo que
 * decía antes de `ACCION`— no es una instrucción, es un encogimiento de
 * hombros: el propio estudio de Leasefy caía ahí y quedaba descrito como
 * «EMPLEADO · Hace algo».
 */
const CLASE: Record<Clase, { texto: string; icono: Icon }> = {
  DOCUMENTO: { texto: 'Sube un archivo', icono: FileArrowUp },
  DATO: { texto: 'Escribe un dato', icono: TextAa },
  ACCION: { texto: 'Hace un trámite', icono: Handshake },
}

function claseDe(clase: string) {
  return CLASE[clase as Clase] ?? { texto: clase, icono: ListChecks }
}

/** El 400/409 del back trae su motivo redactado: vale más que un genérico. */
function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m
  }
  return porDefecto
}

/**
 * 🔴 DESIGN §8: todo modal para a Lenis mientras está abierto y lo vuelve a
 * arrancar al cerrar. El contenedor que scrollea lleva `data-lenis-prevent`.
 */
function useLenisQuieto() {
  const lenis = useLenis()
  useEffect(() => {
    lenis.stop()
    return () => lenis.start()
  }, [lenis])
}

// ═══════════════════════════════════════════════════════════════════════════
// Agregar un requisito propio
// ═══════════════════════════════════════════════════════════════════════════

function DialogoDeRequisito({
  perfiles,
  perfilSugerido,
  onCerrar,
  onCreado,
}: {
  perfiles: { perfil: string; nombre: string }[]
  perfilSugerido: string | null
  onCerrar: () => void
  onCreado: () => void
}) {
  useLenisQuieto()
  const [perfil, setPerfil] = useState(
    perfilSugerido ?? perfiles[0]?.perfil ?? '',
  )
  const [etiqueta, setEtiqueta] = useState('')
  const [detalle, setDetalle] = useState('')
  const [clase, setClase] = useState<Clase>('DOCUMENTO')
  const [obligatorio, setObligatorio] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!etiqueta.trim() || !perfil) return
    setGuardando(true)
    try {
      await postulacionesApi.crearRequisito({
        perfil,
        etiqueta: etiqueta.trim(),
        detalle: detalle.trim() || undefined,
        clase,
        obligatorio,
      })
      toast.success('Requisito agregado. El candidato de ese perfil ya lo verá.')
      invalidar('postulaciones')
      onCreado()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo agregar el requisito'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={guardando ? undefined : onCerrar}
      />
      <div
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background px-6 py-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-fg">
              Agregar un requisito
            </h2>
            <p className="text-sm text-fg-muted">
              Lo va a ver quien se postule con ese perfil, al momento de aplicar.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={enviar} className="space-y-4 p-6" data-testid="form-requisito">
          <div className="space-y-1.5">
            <Label htmlFor="req-perfil">¿A qué perfil se lo pides?</Label>
            <select
              id="req-perfil"
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              data-testid="req-perfil"
            >
              {perfiles.map((p) => (
                <option key={p.perfil} value={p.perfil}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-etiqueta">¿Qué le pides?</Label>
            <Input
              id="req-etiqueta"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              maxLength={120}
              required
              placeholder="Certificado de ingresos de contador público"
              data-testid="req-etiqueta"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-detalle">Instrucción para el candidato</Label>
            <Textarea
              id="req-detalle"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Firmado, con tarjeta profesional y no mayor a 30 días."
            />
            <p className="text-xs text-fg-subtle">
              Lo que escribas acá es lo que el candidato lee. Mientras más
              preciso, menos papeles mal mandados.
            </p>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-medium text-fg">
              ¿Qué tiene que hacer?
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(CLASE) as Clase[]).map((c) => {
                const { texto, icono: Icono } = CLASE[c]
                return (
                  <label
                    key={c}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                      clase === c ? 'border-fg' : 'border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clase"
                      className="sr-only"
                      checked={clase === c}
                      onChange={() => setClase(c)}
                      data-testid={`req-clase-${c}`}
                    />
                    <Icono
                      weight="duotone"
                      className="h-4 w-4 shrink-0 text-fg-muted"
                      aria-hidden="true"
                    />
                    {texto}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <label className="flex items-start gap-2.5 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={obligatorio}
              onChange={(e) => setObligatorio(e.target.checked)}
              className="mt-0.5 h-4 w-4"
              data-testid="req-obligatorio"
            />
            <span className="text-sm">
              <span className="font-medium text-fg">Es obligatorio</span>
              <span className="block text-fg-muted">
                Sin esto no se puede terminar la postulación. Si lo dejas
                opcional, el candidato puede seguir sin mandarlo.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando || !etiqueta.trim()}
              data-testid="guardar-requisito"
            >
              {guardando ? 'Agregando…' : 'Agregar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Un requisito
// ═══════════════════════════════════════════════════════════════════════════

function FilaDeRequisito({
  r,
  puedeEditar,
  esElPreset,
  ocupado,
  onAlternar,
  onBorrar,
}: {
  r: RequisitoDePostulacion
  puedeEditar: boolean
  esElPreset: boolean
  ocupado: boolean
  onAlternar: () => void
  onBorrar: () => void
}) {
  const { texto, icono: Icono } = claseDe(r.clase)
  return (
    <li
      className="flex flex-wrap items-start justify-between gap-3 py-3"
      data-testid={`requisito-${r.id}`}
    >
      <div className="flex min-w-0 gap-3">
        <Icono
          weight="duotone"
          className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle"
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-0.5">
          <p className="flex items-center gap-2 font-medium text-fg">
            {r.etiqueta}
            {r.esElEstudio ? (
              <Lock className="h-4 w-4 text-fg-subtle" aria-label="No se puede apagar" />
            ) : null}
          </p>
          {r.detalle ? <p className="text-sm text-fg-muted">{r.detalle}</p> : null}
          <p className="text-xs text-fg-subtle">{texto}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* 🔴 F-08: el estudio no se puede volver opcional. Va como etiqueta
            fija con su porqué al lado, no como un control que después
            devuelve 409. */}
        {r.esElEstudio ? (
          <>
            <Badge variant="default">Obligatorio</Badge>
            <span className="text-xs text-fg-subtle" data-testid={`estudio-candado-${r.id}`}>
              Nadie se postula ni firma sin estudio
            </span>
          </>
        ) : puedeEditar && !esElPreset ? (
          <>
            {/* 🔴 Obligatorio/Opcional es un CONTROL, no una etiqueta (Nico,
                18-09-2026: «no hay opción de cambiarlo... y debería»). Las dos
                opciones se ven siempre: así se sabe que se puede cambiar y en
                qué se convierte, sin tener que adivinar qué hace un botón que
                dice «volver opcional». */}
            <div
              className="flex overflow-hidden rounded-full border border-border"
              role="group"
              aria-label={`¿${r.etiqueta} es obligatorio?`}
              data-testid={`alternar-${r.id}`}
            >
              {[
                { valor: true, texto: 'Obligatorio' },
                { valor: false, texto: 'Opcional' },
              ].map((o) => (
                <button
                  key={String(o.valor)}
                  type="button"
                  disabled={ocupado}
                  aria-pressed={r.obligatorio === o.valor}
                  onClick={() => {
                    if (r.obligatorio !== o.valor) onAlternar()
                  }}
                  className={cn(
                    'px-3 py-1 text-xs transition-colors disabled:opacity-50',
                    r.obligatorio === o.valor
                      ? 'bg-fg font-medium text-background'
                      : 'text-fg-muted hover:text-fg',
                  )}
                  data-testid={`poner-${o.valor ? 'obligatorio' : 'opcional'}-${r.id}`}
                >
                  {o.texto}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              hideArrow
              disabled={ocupado}
              onClick={onBorrar}
              aria-label={`Quitar ${r.etiqueta}`}
              data-testid={`borrar-${r.id}`}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </>
        ) : (
          // Sin permiso, o mientras es el preset: la etiqueta dice cómo está.
          <Badge variant={r.obligatorio ? 'default' : 'secondary'}>
            {r.obligatorio ? 'Obligatorio' : 'Opcional'}
          </Badge>
        )}
      </div>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// La pantalla
// ═══════════════════════════════════════════════════════════════════════════

export function RequisitosClient() {
  const { canAccess } = usePermissions()
  const puedeEditar = canAccess('configuracion', 'edit')

  const [perfil, setPerfil] = useState<string | null>(null)
  const datos = useCrm(
    () => postulacionesApi.requisitos(perfil ?? undefined),
    [perfil],
    ['postulaciones'],
  )
  const [sembrando, setSembrando] = useState(false)
  const [tocando, setTocando] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [porBorrar, setPorBorrar] = useState<RequisitoDePostulacion | null>(null)

  const requisitos = datos.datos?.requisitos ?? []
  const perfiles = datos.datos?.perfiles ?? []
  const esElPreset = datos.datos?.esElPreset ?? false

  /**
   * 🔴 Agrupado por perfil. Plano, «Cédula (o documento de identidad) por las
   * dos caras» aparecía una vez por perfil, seguidas, y la pantalla parecía
   * estar repitiendo filas. La decisión está organizada por perfil; la lista
   * tiene que verse igual.
   */
  const grupos = useMemo(() => {
    const porPerfil = new Map<string, RequisitoDePostulacion[]>()
    for (const r of requisitos) {
      const lista = porPerfil.get(r.perfil) ?? []
      lista.push(r)
      porPerfil.set(r.perfil, lista)
    }
    // El orden de `perfiles` es el del back; los que no estén ahí van al final.
    const conocidos = perfiles.filter((p) => porPerfil.has(p.perfil))
    const sueltos = [...porPerfil.keys()].filter(
      (p) => !perfiles.some((x) => x.perfil === p),
    )
    return [
      ...conocidos.map((p) => ({
        perfil: p.perfil,
        nombre: p.nombre,
        items: porPerfil.get(p.perfil) ?? [],
      })),
      ...sueltos.map((p) => ({
        perfil: p,
        nombre: p,
        items: porPerfil.get(p) ?? [],
      })),
    ]
  }, [requisitos, perfiles])

  const obligatorios = requisitos.filter((r) => r.obligatorio).length

  async function sembrar() {
    setSembrando(true)
    try {
      await postulacionesApi.sembrarPreset()
      toast.success('Ya es tu lista: ahora puedes editarla, agregar y quitar.')
      invalidar('postulaciones')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar la lista'))
    } finally {
      setSembrando(false)
    }
  }

  async function alternarObligatorio(id: string, obligatorio: boolean) {
    setTocando(id)
    try {
      await postulacionesApi.editarRequisito(id, { obligatorio })
      invalidar('postulaciones')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo cambiar el requisito'))
    } finally {
      setTocando(null)
    }
  }

  async function borrar(r: RequisitoDePostulacion) {
    setTocando(r.id)
    try {
      await postulacionesApi.borrarRequisito(r.id)
      toast.success(`«${r.etiqueta}» ya no se le pide a ese perfil.`)
      invalidar('postulaciones')
      setPorBorrar(null)
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo quitar el requisito'))
    } finally {
      setTocando(null)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Requisitos por tipo de inquilino
          </h1>
          <p className="text-sm text-fg-muted">
            Esto es exactamente lo que ve quien se postula a uno de tus
            inmuebles: los papeles que le pides según su perfil. Es la política
            de riesgo de esta inmobiliaria, y la defines tú.
          </p>
        </div>
        {puedeEditar && !esElPreset && perfiles.length > 0 ? (
          <Button size="sm" onClick={() => setAgregando(true)} data-testid="abrir-agregar">
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar requisito
          </Button>
        ) : null}
      </header>

      {datos.noHabilitado ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-fg-muted" data-testid="requisitos-no-habilitados">
              {motivoEnCristiano(datos.noHabilitado)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {esElPreset ? (
            <Card data-testid="aviso-preset">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="max-w-xl space-y-1">
                  <p className="text-sm font-medium text-fg">
                    Todavía estás viendo la lista sugerida
                  </p>
                  <p className="text-sm text-fg-muted">
                    Es la que usamos por defecto, no la de esta inmobiliaria.
                    Guárdala como tuya y a partir de ahí puedes agregar lo que sí
                    pides, quitar lo que no, y volver opcional lo que no es
                    indispensable.
                  </p>
                </div>
                {puedeEditar ? (
                  <Button onClick={sembrar} disabled={sembrando} data-testid="sembrar-preset">
                    {sembrando ? 'Guardando…' : 'Usar esta lista'}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            {/* 🔴 Las pestañas van PEGADAS a la tarjeta (Nico, 18-09-2026):
                flotando encima parecían un filtro de otra cosa. Pegadas, se
                lee que cambian el contenido de esta tarjeta y no de la
                pantalla entera. */}
            {perfiles.length > 0 ? (
              <div
                className="flex overflow-x-auto border-b border-border"
                role="tablist"
                data-testid="filtro-perfiles"
              >
                {[{ perfil: null as string | null, nombre: 'Todos' }, ...perfiles].map(
                  (p) => {
                    const activa = perfil === p.perfil
                    return (
                      <button
                        key={p.perfil ?? 'todos'}
                        type="button"
                        role="tab"
                        aria-selected={activa}
                        onClick={() => setPerfil(p.perfil)}
                        className={cn(
                          'shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors',
                          activa
                            ? 'border-fg font-medium text-fg'
                            : 'border-transparent text-fg-muted hover:text-fg',
                        )}
                        data-testid={p.perfil ? `perfil-${p.perfil}` : 'perfil-todos'}
                      >
                        {p.nombre}
                      </button>
                    )
                  },
                )}
              </div>
            ) : null}
            <CardHeader>
              <CardTitle className="text-base">
                {perfil
                  ? (perfiles.find((p) => p.perfil === perfil)?.nombre ?? perfil)
                  : 'Todos los perfiles'}
              </CardTitle>
              {requisitos.length > 0 ? (
                <p className="text-sm text-fg-muted" data-testid="resumen">
                  {requisitos.length}{' '}
                  {requisitos.length === 1 ? 'requisito' : 'requisitos'}, de los
                  cuales {obligatorios}{' '}
                  {obligatorios === 1 ? 'es obligatorio' : 'son obligatorios'}.
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              <EstadoDeDatos
                cargando={datos.cargando}
                error={datos.errorCrudo}
                vacio={requisitos.length === 0}
                queEs="los requisitos"
                onReintentar={datos.refetch}
                conservarContenido
                esqueleto={<EsqueletoTabla filas={6} columnas={3} />}
                cuandoVacio={
                  <EmptyState
                    icon={ListChecks}
                    title="Todavía no hay requisitos"
                    description="Empieza con la lista sugerida y edítala: es la política de riesgo de esta inmobiliaria, no una plantilla."
                  />
                }
              >
                {perfil ? (
                  <ul className="divide-y" data-testid="lista-de-requisitos">
                    {requisitos.map((r) => (
                      <FilaDeRequisito
                        key={r.id}
                        r={r}
                        puedeEditar={puedeEditar}
                        esElPreset={esElPreset}
                        ocupado={tocando === r.id}
                        onAlternar={() => void alternarObligatorio(r.id, !r.obligatorio)}
                        onBorrar={() => setPorBorrar(r)}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-6" data-testid="lista-de-requisitos">
                    {grupos.map((g) => (
                      <section key={g.perfil} data-testid={`grupo-${g.perfil}`}>
                        <h3 className="mb-1 flex items-baseline gap-2 text-sm font-medium text-fg">
                          {g.nombre}
                          <span className="text-xs font-normal text-fg-subtle">
                            {g.items.length}{' '}
                            {g.items.length === 1 ? 'requisito' : 'requisitos'}
                          </span>
                        </h3>
                        <ul className="divide-y border-t">
                          {g.items.map((r) => (
                            <FilaDeRequisito
                              key={r.id}
                              r={r}
                              puedeEditar={puedeEditar}
                              esElPreset={esElPreset}
                              ocupado={tocando === r.id}
                              onAlternar={() =>
                                void alternarObligatorio(r.id, !r.obligatorio)
                              }
                              onBorrar={() => setPorBorrar(r)}
                            />
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </EstadoDeDatos>
            </CardContent>
          </Card>
        </>
      )}

      {agregando ? (
        <DialogoDeRequisito
          perfiles={perfiles}
          perfilSugerido={perfil}
          onCerrar={() => setAgregando(false)}
          onCreado={() => {
            setAgregando(false)
            void datos.refetch()
          }}
        />
      ) : null}

      {/* 🔴 Quitar un requisito se pregunta: es la política de riesgo, y sin el
          papel el candidato entra sin que nadie lo note. Con AlertDialog propio
          y no con `confirm()`, que el guardián del proyecto prohíbe. */}
      {porBorrar ? (
        <ConfirmarBorrado
          requisito={porBorrar}
          ocupado={tocando === porBorrar.id}
          onCerrar={() => setPorBorrar(null)}
          onConfirmar={() => void borrar(porBorrar)}
        />
      ) : null}
    </div>
  )
}

function ConfirmarBorrado({
  requisito,
  ocupado,
  onCerrar,
  onConfirmar,
}: {
  requisito: RequisitoDePostulacion
  ocupado: boolean
  onCerrar: () => void
  onConfirmar: () => void
}) {
  useLenisQuieto()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={ocupado ? undefined : onCerrar}
      />
      <div
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="relative w-full max-w-md overflow-y-auto rounded-lg bg-background p-6"
        role="alertdialog"
        aria-modal="true"
        data-testid="confirmar-borrado"
      >
        <h2 className="text-base font-semibold text-fg">
          ¿Dejar de pedir «{requisito.etiqueta}»?
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          Quien se postule con ese perfil ya no va a mandarlo, y nadie lo va a
          echar de menos al revisar. Puedes volver a agregarlo cuando quieras.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCerrar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmar}
            disabled={ocupado}
            data-testid="confirmar-borrado-si"
          >
            {ocupado ? 'Quitando…' : 'Dejar de pedirlo'}
          </Button>
        </div>
      </div>
    </div>
  )
}
