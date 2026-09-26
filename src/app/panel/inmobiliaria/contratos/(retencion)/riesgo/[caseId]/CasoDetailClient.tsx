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
 */
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { DesgloseDelPuntaje, PuntajeDeVinci, QUE_ES_CADA_DECISION, QUIEN, fechaYHora } from '@/components/retencion/vinci'
import type { CasoDeVinci, OfertaDeVinci, Poblacion, TipoDeOferta } from '@/lib/types/retencion'

const OFERTAS_POR_POBLACION: Record<Poblacion, Array<{ tipo: TipoDeOferta; nombre: string }>> = {
  inquilino: [
    { tipo: 'llamada_del_asesor', nombre: 'Llamada del asesor' },
    { tipo: 'visita_del_asesor', nombre: 'Visita del asesor' },
    { tipo: 'resolver_pendiente', nombre: 'Resolver primero lo pendiente' },
    { tipo: 'congelar_incremento', nombre: 'Congelar el incremento' },
    { tipo: 'bajar_incremento', nombre: 'Bajar el incremento' },
  ],
  propietario: [
    { tipo: 'llamada_del_asesor', nombre: 'Llamada del asesor' },
    { tipo: 'visita_del_asesor', nombre: 'Visita del asesor' },
    { tipo: 'resolver_pendiente', nombre: 'Resolver primero lo pendiente' },
    { tipo: 'descuento_comision', nombre: 'Descuento en la comisión' },
  ],
}

const ESTADO_DE_LA_OFERTA: Record<OfertaDeVinci['estado'], string> = {
  por_aprobar: 'Por aprobar (administrador)',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

function detalleEnPalabras(o: OfertaDeVinci): string {
  const d = o.detalle
  const partes: string[] = []
  if (typeof d.descuentoPct === 'number') partes.push(`${d.descuentoPct} % de la comisión`)
  if (typeof d.meses === 'number') partes.push(`${d.meses} meses`)
  if (typeof d.incrementoPct === 'number') partes.push(`incremento de ${d.incrementoPct} %`)
  if (d.aceptadaPorElPropietario) partes.push('el propietario aceptó')
  return partes.join(' · ')
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
      toast.error('No se pudo', { description: e instanceof Error ? e.message : undefined })
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
    <section aria-label="Ofertas" className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-fg">Ofertas</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Llamada, visita y resolver lo pendiente no piden aprobación. Lo que cuesta plata lo aprueba el administrador; el
        incremento, además, lo acepta el propietario. Vinci no ofrece nada que no esté aprobado.
      </p>

      {caso.ofertasSugeridas.length > 0 ? (
        <div className="mt-4">
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

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,16rem)_repeat(2,minmax(0,8rem))_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="vinci-oferta-tipo">Oferta</Label>
          <select
            id="vinci-oferta-tipo"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDeOferta)}
          >
            {OFERTAS_POR_POBLACION[caso.poblacion].map((o) => (
              <option key={o.tipo} value={o.tipo}>
                {o.nombre}
              </option>
            ))}
          </select>
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
        <Button type="button" hideArrow isLoading={ocupado === 'registrar'} onClick={() => void registrar()}>
          {isAdmin ? 'Registrar y aprobar' : 'Registrar'}
        </Button>
      </div>
      {incremento ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={aceptada} onChange={(e) => setAceptada(e.target.checked)} />
          El propietario ya aceptó (es su canon)
        </label>
      ) : null}

      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="las ofertas" onReintentar={() => void refetch()}>
        {data && data.length > 0 ? (
          <ul className="mt-5 divide-y divide-border-faint rounded-lg border border-border" data-testid="vinci-ofertas">
            {data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">
                    {o.nombre} {detalleEnPalabras(o) ? <span className="font-normal text-fg-muted">· {detalleEnPalabras(o)}</span> : null}
                  </p>
                  <p className="text-caption text-fg-muted">
                    {ESTADO_DE_LA_OFERTA[o.estado]}
                    {o.resueltaPor ? ` · ${o.resueltaPor}` : ''}
                    {o.mismaPersona ? ' · la propuso y la aprobó la misma persona (P-4)' : ''}
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
            ))}
          </ul>
        ) : null}
      </EstadoDeDatos>
    </section>
  )
}

function Plan({ caso }: { caso: CasoDeVinci }) {
  const { agency } = useAuth()
  const { data, error, isLoading, refetch } = usePlanDelCaso(caso.plan?.id ?? null)
  const [resultado, setResultado] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (!caso.plan) {
    return (
      <section aria-label="Plan" className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-fg">Plan</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Todavía no hay plan: Vinci lo arma en Copiloto y Automático; en Manual lo propone en «Por aprobar».
        </p>
      </section>
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
      toast.error('No se pudo', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setOcupado(null)
    }
  }
  return (
    <section aria-label="Plan" className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-fg">Plan</h2>
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="el plan" onReintentar={() => void refetch()}>
        {data ? (
          <div className="mt-2 space-y-4">
            <p className="text-sm text-fg">
              {data.plan.objective} <Badge variant="secondary">{data.plan.status}</Badge>
            </p>
            {data.plan.actualResult ? <p className="text-sm text-fg-muted">Resultado: {data.plan.actualResult}</p> : null}
            <ul className="divide-y divide-border-faint rounded-lg border border-border">
              {data.tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className={`text-sm ${t.status === 'completada' ? 'text-fg-muted line-through' : 'text-fg'}`}>{t.title}</p>
                    {t.description ? <p className="text-caption text-fg-muted">{t.description}</p> : null}
                    <p className="text-caption text-fg-muted">
                      {t.dueDate ? `Para el ${t.dueDate}` : 'Sin fecha'} · {t.responsibleRole.replace(/_/g, ' ')}
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
            {data.plan.status === 'activo' ? (
              <div className="space-y-2">
                <Label htmlFor="vinci-resultado">Cómo terminó (para cerrarlo a mano)</Label>
                <Textarea id="vinci-resultado" rows={2} value={resultado} onChange={(e) => setResultado(e.target.value)} />
                <div className="flex gap-2">
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
    </section>
  )
}

function Historial({ caseId }: { caseId: string }) {
  const { data, error, isLoading, refetch } = useDecisionesDeVinci({ caseId, limit: 50 })
  return (
    <section aria-label="Lo que Vinci hizo" className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-fg">Lo que Vinci hizo</h2>
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="lo que Vinci hizo" onReintentar={() => void refetch()}>
        {data && data.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {data.map((d) => (
              <li key={d.id} className="text-sm text-fg">
                <span className="font-mono text-caption tabular-nums text-fg-muted">{fechaYHora(d.createdAt)}</span> ·{' '}
                {QUE_ES_CADA_DECISION[d.decisionType] ?? d.decisionType}
                {typeof d.payload?.texto === 'string' ? <span className="block text-fg-muted">«{d.payload.texto}»</span> : null}
                {d.decisionType === 'mensaje_no_salio' && typeof d.payload?.mensaje === 'string' ? (
                  <span className="block text-fg-muted">{d.payload.mensaje}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">Todavía nada con este caso.</p>
        )}
      </EstadoDeDatos>
    </section>
  )
}

export default function CasoDetailClient({ caseId }: { caseId: string }) {
  const { data, isLoading, error, refetch } = useRiesgoDeVinci()
  const caso = data?.casos.find((c) => c.caseId === caseId) ?? null

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Link href="/panel/inmobiliaria/contratos/riesgo" className="text-sm font-medium text-primary hover:underline">
        Volver a los casos
      </Link>
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="el caso" onReintentar={() => void refetch()} principal>
        {data && !caso ? (
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-fg">Hoy este caso no tiene señales de irse (o ya no está vigente). Vinci no lo muestra con datos viejos.</p>
          </div>
        ) : null}
        {caso ? (
          <>
            <header className="space-y-2">
              <h1 className="text-xl font-semibold text-fg">{caso.nombre ?? 'Sin nombre registrado'}</h1>
              <p className="text-sm text-fg-muted">
                {QUIEN[caso.poblacion]} ·{' '}
                {caso.contratos
                  .map((c) => `contrato ${c.numero}${c.inmueble ? ` (${c.inmueble})` : ''}${c.fechaDeFin ? `, termina ${c.fechaDeFin}` : ''}`)
                  .join(' · ')}
              </p>
              <p className="text-sm text-fg">
                Canon en juego: <span className="font-mono tabular-nums">{formatCurrency(caso.canonEnJuegoCop)}</span>
                <span className="text-sm text-fg-muted">/mes</span>
                {!caso.tieneTelefono && !caso.tieneCorreo ? <span className="text-fg-muted"> · sin teléfono ni correo en el ERP</span> : null}
              </p>
            </header>
            <section aria-label="Por qué" className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-fg">Por qué</h2>
                <PuntajeDeVinci puntaje={caso.puntaje} enRiesgo={caso.enRiesgo} />
              </div>
              <p className="mt-1 text-sm text-fg-muted">Cada señal del ERP y lo que sumó. En riesgo desde {caso.umbral}/100.</p>
              <div className="mt-4">
                <DesgloseDelPuntaje senales={caso.senales} puntaje={caso.puntaje} suma={caso.suma} />
              </div>
            </section>
            <Ofertas caso={caso} />
            <Plan caso={caso} />
            <Historial caseId={caso.caseId} />
          </>
        ) : null}
      </EstadoDeDatos>
    </div>
  )
}
