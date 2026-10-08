'use client'

/**
 * Un caso de Vinci: el puntaje y qué señal sumó cuánto, las ofertas (y quién
 * las aprueba), el plan con sus tareas y lo que Vinci hizo con el caso.
 *
 * Decisiones de Nico (26-09-2026): llamada o visita del asesor y resolver lo
 * pendiente no piden aprobación; congelar o bajar el incremento (lo decide el
 * propietario) y el descuento en la comisión (con tope) los aprueba el
 * administrador —si él mismo lo propone, queda aprobado en el mismo paso
 * (P-4)—. Vinci nunca ofrece lo que no está aprobado.
 *
 * 29-09-2026 · glow-up, con la ficha del contrato como molde: el nombre es el
 * título con su chip de estado, debajo quién es y de qué contrato; la franja
 * de tres números (puntaje, canon en juego, fin del contrato); y dos columnas
 * desde `lg` — lo que se decide (por qué, ofertas, plan) a la izquierda y lo
 * que Vinci ya hizo a la derecha. El puntaje se dice UNA vez (en la franja):
 * antes salía en la cabecera de «Por qué» y otra vez al pie del desglose.
 */
import { useState } from 'react'
import { Stat } from '@leasefy/cadence'
import { ClockCounterClockwise, Gift, HeartStraight, ListChecks, Scales } from '@phosphor-icons/react'
import { toast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SinDatos } from '@/components/estado/SinDatos'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/format'
import { actualizarTarea, cerrarPlan, proponerOferta, resolverOferta } from '@/lib/api/retencion'
import {
  useDecisionesDeVinci,
  useOfertasDelCaso,
  usePlanDelCaso,
  useRiesgoDeVinci,
} from '@/lib/hooks/retencion/use-vinci'
import {
  DesgloseDelPuntaje,
  NOMBRE_DE_LA_OFERTA,
  POR_QUE_EN_COBRANZA,
  QUE_ES_CADA_DECISION,
  QUIEN,
  detalleEnPalabras,
  fechaCorta,
  fechaYHora,
} from '@/components/retencion/vinci'
import { CabeceraDeVinci, FranjaDeVinci, TarjetaDeVinci } from '@/components/retencion/piezas'
import type { CasoDeVinci, OfertaDeVinci, Poblacion, TipoDeOferta } from '@/lib/types/retencion'
import { RETENCION_RIESGO } from '@/lib/nav/rutas-de-retencion'
import { RetencionApagada } from '@/components/inmobiliaria/retencion/RetencionApagada'
import { esRetencionApagada } from '@/lib/api/retencion'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

const OFERTAS_POR_POBLACION: Record<Poblacion, TipoDeOferta[]> = {
  inquilino: ['llamada_del_asesor', 'visita_del_asesor', 'resolver_pendiente', 'congelar_incremento', 'bajar_incremento'],
  propietario: ['llamada_del_asesor', 'visita_del_asesor', 'resolver_pendiente', 'descuento_comision'],
}

const ESTADO_DE_LA_OFERTA: Record<OfertaDeVinci['estado'], { label: string; variant: 'warning' | 'success' | 'secondary' }> = {
  por_aprobar: { label: 'Por aprobar', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'secondary' },
}

/** El chip del plan, al lado del título «Plan» (sin repetir la palabra). */
const CHIP_DEL_PLAN: Record<string, { label: string; variant: 'default' | 'success' | 'secondary' | 'destructive' }> = {
  activo: { label: 'Activo', variant: 'default' },
  logrado: { label: 'Se quedó', variant: 'success' },
  perdido: { label: 'Se fue', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'secondary' },
}

function Ofertas({ caso }: { caso: CasoDeVinci }) {
  const { agency } = useAuth()
  const { isAdmin } = usePermissionsContext()
  const { data, error, isLoading, refetch } = useOfertasDelCaso(caso.caseId)
  const [tipo, setTipo] = useState<TipoDeOferta>(caso.ofertasSugeridas[0]?.tipo ?? 'llamada_del_asesor')
  const [pct, setPct] = useState('')
  const [meses, setMeses] = useState('')
  const [aceptada, setAceptada] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const incremento = tipo === 'congelar_incremento' || tipo === 'bajar_incremento'

  const correr = async (clave: string, f: () => Promise<unknown>, ok: string) => {
    if (!agency?.id) return
    setOcupado(clave)
    try {
      await f()
      toast.success(ok)
      await refetch()
    } catch (e) {
      toast.error('No se pudo', { description: mensajeParaLaPersona(e) })
    } finally {
      setOcupado(null)
    }
  }

  const registrar = () =>
    correr(
      'registrar',
      () =>
        proponerOferta(agency!.id, caso.caseId, {
          tipo,
          detalle: {
            ...(tipo === 'descuento_comision' && pct ? { descuentoPct: Number(pct) } : {}),
            ...(tipo === 'descuento_comision' && meses ? { meses: Number(meses) } : {}),
            ...(tipo === 'bajar_incremento' && pct ? { incrementoPct: Number(pct) } : {}),
            ...(incremento && aceptada ? { aceptadaPorElPropietario: true } : {}),
          },
        }),
      'Oferta registrada.',
    )

  return (
    <TarjetaDeVinci
      id="vinci-ofertas"
      icono={Gift}
      titulo="Ofertas"
      descripcion="Llamada, visita y resolver lo pendiente no piden aprobación. Lo que cuesta plata lo aprueba el administrador; el incremento, además, lo acepta el propietario. Vinci no ofrece nada que no esté aprobado."
    >
      <div className="space-y-5">
        {caso.ofertasSugeridas.length > 0 ? (
          <div>
            <p className="text-label uppercase text-fg-muted">Vinci sugiere</p>
            <ul className="mt-2 space-y-2">
              {caso.ofertasSugeridas.map((o) => (
                <li key={o.tipo} className="text-sm text-fg">
                  <span className="font-medium">{o.nombre}</span> — {o.porque}
                  {o.quienAprueba ? <span className="text-fg-muted"> ({o.quienAprueba})</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Nico (26-09): al que pasó a cobranza no se le ofrece nada (el micro también lo niega). */}
        {caso.enCobranza ? (
          <p className="text-sm text-fg-muted" data-testid="vinci-oferta-en-cobranza">
            {POR_QUE_EN_COBRANZA}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-[minmax(14rem,1fr)_repeat(2,minmax(0,8rem))_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="vinci-oferta-tipo">Registrar una oferta</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDeOferta)}>
                  <SelectTrigger id="vinci-oferta-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFERTAS_POR_POBLACION[caso.poblacion].map((t) => (
                      <SelectItem key={t} value={t}>
                        {NOMBRE_DE_LA_OFERTA[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tipo === 'descuento_comision' || tipo === 'bajar_incremento' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="vinci-oferta-pct">{tipo === 'descuento_comision' ? '% de la comisión' : 'Incremento %'}</Label>
                  <Input id="vinci-oferta-pct" type="number" min={0} max={100} className="font-mono" value={pct} onChange={(e) => setPct(e.target.value)} />
                </div>
              ) : null}
              {tipo === 'descuento_comision' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="vinci-oferta-meses">Meses</Label>
                  <Input id="vinci-oferta-meses" type="number" min={1} max={36} className="font-mono" value={meses} onChange={(e) => setMeses(e.target.value)} />
                </div>
              ) : null}
              <Button type="button" variant="secondary" hideArrow isLoading={ocupado === 'registrar'} onClick={() => void registrar()}>
                {isAdmin ? 'Registrar y aprobar' : 'Registrar'}
              </Button>
            </div>
            {incremento ? (
              <div className="flex items-center gap-2">
                <Checkbox id="vinci-oferta-aceptada" checked={aceptada} onCheckedChange={(v) => setAceptada(v === true)} />
                <label htmlFor="vinci-oferta-aceptada" className="cursor-pointer text-sm text-fg">
                  El propietario ya aceptó (es su canon)
                </label>
              </div>
            ) : null}
          </div>
        )}

        <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="las ofertas" onReintentar={() => refetch()}>
          {data && data.length > 0 ? (
            <div>
              <p className="text-label uppercase text-fg-muted">Registradas</p>
              <ul className="mt-2 divide-y divide-border-faint border-y border-border-faint" data-testid="vinci-ofertas">
                {data.map((o) => {
                  const estado = ESTADO_DE_LA_OFERTA[o.estado]
                  const detalle = detalleEnPalabras(o.detalle)
                  return (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                          {o.nombre}
                          <Badge variant={estado.variant}>{estado.label}</Badge>
                        </p>
                        <p className="mt-0.5 text-caption text-fg-muted">
                          {[
                            detalle || null,
                            o.estado === 'por_aprobar' ? 'la aprueba el administrador' : null,
                            o.resueltaPor,
                            o.mismaPersona ? 'la propuso y la aprobó la misma persona (P-4)' : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      {o.estado === 'por_aprobar' ? (
                        isAdmin ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              hideArrow
                              isLoading={ocupado === `a:${o.id}`}
                              onClick={() =>
                                void correr(
                                  `a:${o.id}`,
                                  () => resolverOferta(agency!.id, o.id, 'aprobar', o.tipo.endsWith('incremento') ? { aceptadaPorElPropietario: aceptada } : {}),
                                  'Oferta aprobada: Vinci ya la puede ofrecer.',
                                )
                              }
                            >
                              Aprobar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              hideArrow
                              isLoading={ocupado === `r:${o.id}`}
                              onClick={() => void correr(`r:${o.id}`, () => resolverOferta(agency!.id, o.id, 'rechazar'), 'Oferta rechazada.')}
                            >
                              Rechazar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-caption text-fg-muted">Sólo el administrador la aprueba.</span>
                        )
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </EstadoDeDatos>
      </div>
    </TarjetaDeVinci>
  )
}

function Plan({ caso }: { caso: CasoDeVinci }) {
  const { agency } = useAuth()
  const { data, error, isLoading, refetch } = usePlanDelCaso(caso.plan?.id ?? null)
  const [resultado, setResultado] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (!caso.plan) {
    return (
      <TarjetaDeVinci id="vinci-plan" icono={ListChecks} titulo="Plan" cuerpo={false}>
        <SinDatos
          queSon="planes"
          icono={ListChecks}
          titulo="Todavía no hay plan"
          descripcion={
            caso.enCobranza
              ? 'Lo lleva cobranza: Vinci no le arma plan de retención.'
              : 'Vinci lo arma en Copiloto y Automático; en Manual lo propone en «Por aprobar».'
          }
          className="py-10"
        />
      </TarjetaDeVinci>
    )
  }
  const correr = async (clave: string, f: () => Promise<unknown>, ok: string) => {
    if (!agency?.id) return
    setOcupado(clave)
    try {
      await f()
      toast.success(ok)
      await refetch()
    } catch (e) {
      toast.error('No se pudo', { description: mensajeParaLaPersona(e) })
    } finally {
      setOcupado(null)
    }
  }
  const estado = data?.plan.status
  return (
    <TarjetaDeVinci
      id="vinci-plan"
      icono={ListChecks}
      titulo={
        <span className="flex flex-wrap items-center gap-2">
          Plan
          {estado ? <Badge variant={CHIP_DEL_PLAN[estado]?.variant ?? 'secondary'}>{CHIP_DEL_PLAN[estado]?.label ?? estado}</Badge> : null}
        </span>
      }
      descripcion={data ? data.plan.objective : undefined}
    >
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="el plan" onReintentar={() => refetch()}>
        {data ? (
          <div className="space-y-5">
            {data.plan.actualResult ? <p className="text-sm text-fg-muted">Resultado: {data.plan.actualResult}</p> : null}
            {data.tasks.length > 0 ? (
              <ul className="divide-y divide-border-faint border-y border-border-faint">
                {data.tasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className={`text-sm ${t.status === 'completada' ? 'text-fg-muted line-through' : 'text-fg'}`}>{t.title}</p>
                      {t.description ? <p className="text-caption text-fg-muted">{t.description}</p> : null}
                      <p className="text-caption text-fg-muted">
                        {t.dueDate ? `Para el ${fechaCorta(t.dueDate) ?? t.dueDate}` : 'Sin fecha'} · {t.responsibleRole.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {t.status !== 'completada' && t.status !== 'cancelada' && data.plan.status === 'activo' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        hideArrow
                        isLoading={ocupado === t.id}
                        onClick={() => void correr(t.id, () => actualizarTarea(agency!.id, data.plan.id, t.id, { status: 'completada' }), 'Tarea hecha.')}
                      >
                        Hecha
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-muted">El plan no tiene tareas.</p>
            )}
            {data.plan.status === 'activo' ? (
              <div className="space-y-2">
                <Label htmlFor="vinci-resultado">Cómo terminó (para cerrarlo a mano)</Label>
                <Textarea id="vinci-resultado" rows={2} value={resultado} onChange={(e) => setResultado(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    hideArrow
                    disabled={!resultado.trim()}
                    isLoading={ocupado === 'logrado'}
                    onClick={() => void correr('logrado', () => cerrarPlan(agency!.id, data.plan.id, { status: 'logrado', actualResult: resultado.trim() }), 'Cerrado: se quedó.')}
                  >
                    Se quedó
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    hideArrow
                    disabled={!resultado.trim()}
                    isLoading={ocupado === 'perdido'}
                    onClick={() => void correr('perdido', () => cerrarPlan(agency!.id, data.plan.id, { status: 'perdido', actualResult: resultado.trim() }), 'Cerrado: se fue.')}
                  >
                    Se fue
                  </Button>
                </div>
                <p className="text-caption text-fg-muted">Vinci también lo cierra solo cuando el ERP lo muestra (renovó, se fue o se quedó).</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </EstadoDeDatos>
    </TarjetaDeVinci>
  )
}

function Historial({ caseId }: { caseId: string }) {
  const { data: cola, error, isLoading, refetch } = useDecisionesDeVinci({ caseId, limit: 50 })
  const data = cola?.decisiones
  return (
    <TarjetaDeVinci id="vinci-historial" icono={ClockCounterClockwise} titulo="Lo que Vinci hizo" cuerpo={false}>
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="lo que Vinci hizo" onReintentar={() => refetch()}>
        {data && data.length > 0 ? (
          <ol className="divide-y divide-border-faint">
            {data.map((d) => (
              <li key={d.id} className="px-5 py-3 text-sm text-fg">
                {/* Sin mono ni `tabular-nums`: la fecha lleva coma y el ancho fijo la separaba («sept ,  5:10»). */}
                <p className="text-caption text-fg-muted">{fechaYHora(d.createdAt)}</p>
                <p className="mt-0.5">{QUE_ES_CADA_DECISION[d.decisionType] ?? d.decisionType}</p>
                {typeof d.payload?.texto === 'string' ? <p className="mt-1 text-fg-muted">«{d.payload.texto}»</p> : null}
                {d.decisionType === 'mensaje_no_salio' && typeof d.payload?.mensaje === 'string' ? (
                  <p className="mt-1 text-fg-muted">{d.payload.mensaje}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <SinDatos
            queSon="acciones"
            icono={ClockCounterClockwise}
            titulo="Todavía nada con este caso"
            descripcion="Lo que Vinci proponga, prepare o mande por este caso queda acá, con la hora."
            className="py-10"
          />
        )}
      </EstadoDeDatos>
    </TarjetaDeVinci>
  )
}

/** El fin más cercano entre los contratos del caso (un propietario puede tener varios). */
function finMasCercano(caso: CasoDeVinci) {
  const conFecha = caso.contratos.filter((c) => c.fechaDeFin)
  if (conFecha.length === 0) return null
  return conFecha.reduce((a, b) => ((a.fechaDeFin ?? '') <= (b.fechaDeFin ?? '') ? a : b))
}

function enCuanto(dias: number | null): string | undefined {
  if (dias === null) return undefined
  if (dias === 0) return 'Hoy'
  if (dias > 0) return `En ${dias} ${dias === 1 ? 'día' : 'días'}`
  return `Venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`
}

export default function CasoDetailClient({ caseId }: { caseId: string }) {
  const { data, isLoading, error, refetch } = useRiesgoDeVinci()
  const caso = data?.casos.find((c) => c.caseId === caseId) ?? null
  const fin = caso ? finMasCercano(caso) : null

  // 🔴 IA-C-01 (QA 04-10): apagada no hay caso; se dice, con la salida a la lista.
  if (esRetencionApagada(error)) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 p-6 lg:p-8">
        <VolverALaLista href={RETENCION_RIESGO} label="Volver a los casos" />
        <RetencionApagada />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="el caso" onReintentar={() => refetch()} principal>
        {data && !caso ? (
          <>
            <VolverALaLista href={RETENCION_RIESGO} label="Volver a los casos" />
            <div className="rounded-lg border border-border bg-card">
              <SinDatos
                queSon="casos"
                icono={HeartStraight}
                titulo="Este caso ya no está en la lista"
                descripcion="Hoy no tiene señales de irse (o ya no está vigente). Vinci no lo muestra con datos viejos."
              />
            </div>
          </>
        ) : null}
        {caso ? (
          <div className="space-y-6">
            <CabeceraDeVinci
              antes={<VolverALaLista href={RETENCION_RIESGO} label="Volver a los casos" className="mb-3" />}
              titulo={
                <span className="flex flex-wrap items-center gap-3">
                  {caso.nombre ?? 'Sin nombre registrado'}
                  {caso.enCobranza ? (
                    <Badge variant="warning" title={POR_QUE_EN_COBRANZA}>
                      En cobranza
                    </Badge>
                  ) : caso.enRiesgo ? (
                    <Badge variant="destructive">En riesgo</Badge>
                  ) : (
                    <Badge variant="secondary">Bajo el umbral</Badge>
                  )}
                </span>
              }
              descripcion={
                <>
                  {QUIEN[caso.poblacion]}
                  {caso.contratos.length > 0
                    ? ` · ${caso.contratos.map((c) => `contrato ${c.numero}${c.inmueble ? ` (${c.inmueble})` : ''}`).join(' · ')}`
                    : ''}
                  {!caso.tieneTelefono && !caso.tieneCorreo ? ' · sin teléfono ni correo en el ERP' : ''}
                </>
              }
            />

            <section aria-label="El caso en números" className="overflow-hidden rounded-lg border border-border bg-card">
              <FranjaDeVinci columnas={3} data-testid="vinci-caso-numeros">
                <Stat compact label="Puntaje" value={`${caso.puntaje}/100`} delta={`En riesgo desde ${caso.umbral}`} />
                <Stat compact label="Canon en juego" value={formatCurrency(caso.canonEnJuegoCop)} delta="Al mes" />
                <Stat
                  compact
                  label={caso.contratos.length > 1 ? 'Próximo fin' : 'Fin del contrato'}
                  value={fin ? (fechaCorta(fin.fechaDeFin) ?? '—') : '—'}
                  delta={fin ? enCuanto(fin.diasParaVencer) : 'Sin fecha de fin'}
                />
              </FranjaDeVinci>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <TarjetaDeVinci id="vinci-por-que" icono={Scales} titulo="Por qué" descripcion="Cada señal del ERP y lo que sumó al puntaje.">
                  <DesgloseDelPuntaje senales={caso.senales} puntaje={caso.puntaje} suma={caso.suma} sinTotal />
                </TarjetaDeVinci>
                <Ofertas caso={caso} />
                <Plan caso={caso} />
              </div>
              <div className="min-w-0">
                <Historial caseId={caso.caseId} />
              </div>
            </div>
          </div>
        ) : null}
      </EstadoDeDatos>
    </div>
  )
}
