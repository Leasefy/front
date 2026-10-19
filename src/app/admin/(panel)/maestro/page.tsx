'use client'

/**
 * /admin/maestro — el maestro de Leasefy (Fase 3 y 4 de «Naira lo sabe todo»; Nico, 17 y 19-10-2026: «nos da insights a
 * nosotros y orquesta las Nairas»; «Ustedes aprueban cada una»; «En /admin → Maestro»; «La aplica sola»).
 *
 * Cuatro pestañas:
 *   - Mejoras: lo que propuso el maestro para una categoría (lección para Ori, modo de un agente, ajuste de una regla de
 *     Naira), con su porqué y dónde lo vio. «Aprobar» lo reparte EN ESE MOMENTO: la Naira de cada inmobiliaria de la
 *     categoría lo aplica sola; abajo queda qué pasó en cada una. Pide confirmar antes.
 *   - Insights: lo que encontró cada noche (sólo para Leasefy), con el costo de la noche.
 *   - Inmobiliarias: en qué categoría está cada una hoy, y los cortes de tamaño (editables).
 *   - Diarios: lo que cada Naira le dejó al maestro, día por día.
 * Lee y escribe en el micro de agentes (`agentAdminApi`, la misma puerta de Leasefy con segundo factor).
 */

import { useState } from 'react'
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@leasefy/cadence'

import {
  decidirMejoraDelMaestro,
  getDiarioDelMaestro,
  getDiariosDelMaestro,
  getMaestro,
  guardarAjustesDelMaestro,
  type MejoraDelMaestro,
  type NocheDelMaestro,
  type ResultadoDelReparto,
} from '@/lib/admin/agent-api'
import { fmtDateTime } from '@/lib/admin/format'
import { conNombres, queProponeLaMejora } from '@/lib/admin/maestro'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'

type Pestana = 'mejoras' | 'insights' | 'inmobiliarias' | 'diarios'

const ESTADO_DE_LA_MEJORA: Record<MejoraDelMaestro['estado'], { texto: string; tono: 'info' | 'ok' | 'bad' | 'warn' }> = {
  por_decidir: { texto: 'Por decidir', tono: 'info' },
  aprobada: { texto: 'Aprobada, sin repartir', tono: 'warn' },
  aplicada: { texto: 'Aplicada', tono: 'ok' },
  rechazada: { texto: 'Rechazada', tono: 'bad' },
}
const RESULTADO: Record<ResultadoDelReparto, string> = {
  aplicado: 'aplicada',
  ya_estaba: 'ya la tenía',
  falta_la_delegacion: 'en Automático, falta que alguien de la inmobiliaria lo confirme con su segundo factor',
  agente_sin_modo: 'ese agente no tiene modo',
  no_se_pudo: 'no se pudo',
}
const ESTADO_DE_LA_NOCHE: Record<NocheDelMaestro['estado'], string> = {
  listo: 'Listo',
  fallo_del_modelo: 'El modelo falló',
  muy_caro: 'No pensó: pasaba el tope de la noche',
  sin_diarios: 'No había diarios',
}
const TAMANO: Record<string, string> = { pequena: 'Pequeña', mediana: 'Mediana', grande: 'Grande' }

const usd = (n: number) => `US$${n.toFixed(n < 1 ? 3 : 2).replace('.', ',')}`
const conMayuscula = (s: string) => s.charAt(0).toLocaleUpperCase('es') + s.slice(1)

function Mejora({ m, onDecidida }: { m: MejoraDelMaestro; onDecidida: (mensaje: string) => void }) {
  const [confirmando, setConfirmando] = useState<'aprobar' | 'rechazar' | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ tono: 'ok' | 'bad'; texto: string } | null>(null)
  const estado = ESTADO_DE_LA_MEJORA[m.estado]
  const decidir = async (d: 'aprobar' | 'rechazar') => {
    setOcupado(true)
    setAviso(null)
    try {
      const r = await decidirMejoraDelMaestro(m.id, d)
      setConfirmando(null)
      // El mensaje lo muestra la página: la lista se vuelve a leer y esta tarjeta cambia de lugar.
      onDecidida(
        d === 'rechazar'
          ? (r.mensaje ?? 'Listo: rechazada.')
          : `Listo: llegó a ${r.inmobiliarias ?? 0} inmobiliaria${r.inmobiliarias === 1 ? '' : 's'}.`,
      )
    } catch (e) {
      setAviso({ tono: 'bad', texto: mensajeDelAdmin(e, { accion: d === 'aprobar' ? 'aprobar la mejora' : 'rechazar la mejora' }) })
    } finally {
      setOcupado(false)
    }
  }
  return (
    <article className="card p-4 space-y-3" data-maestro-mejora={m.estado}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="font-medium text-fg">{queProponeLaMejora(m.contenido)}</p>
          <p className="text-sm text-fg-muted">
            Para: {m.categoria.nombre} · llegaría a {m.alcance} inmobiliaria{m.alcance === 1 ? '' : 's'} · {fmtDateTime(m.creadaEn)}
          </p>
        </div>
        <Pill tone={estado.tono}>{estado.texto}</Pill>
      </div>
      <p className="text-sm text-fg">{m.porque}</p>
      <p className="text-xs text-fg-muted">Lo vio en: {m.evidencia.map((e) => e.nombre).join(', ')}</p>
      {m.decision ? (
        <p className="text-xs text-fg-muted">
          {m.decision.tipo === 'aprobada' ? 'Aprobó' : 'Rechazó'} {m.decision.quien} · {fmtDateTime(m.decision.en)}
        </p>
      ) : null}
      {m.aplicacion ? (
        <ul className="text-sm space-y-1" data-maestro-reparto="">
          {m.aplicacion.porInmobiliaria.map((x) => (
            <li key={x.tenantId} className="flex justify-between gap-3">
              <span className="text-fg">{x.nombre}</span>
              <span className={x.resultado === 'aplicado' || x.resultado === 'ya_estaba' ? 'text-ok' : 'text-warn'}>{RESULTADO[x.resultado] ?? x.resultado}</span>
            </li>
          ))}
          {m.aplicacion.porInmobiliaria.length === 0 ? <li className="text-fg-muted">Ninguna inmobiliaria estaba en esa categoría al aprobarla.</li> : null}
        </ul>
      ) : null}
      {m.estado === 'por_decidir' || m.estado === 'aprobada' ? (
        confirmando ? (
          <div className="card p-3 space-y-2" role="alertdialog" aria-label="Confirmar la decisión">
            <p className="text-sm text-fg">
              {confirmando === 'aprobar'
                ? `La Naira de cada inmobiliaria de «${m.categoria.nombre}» la aplica sola, ahora mismo. Queda en la Actividad del Piloto de cada una.`
                : 'No se reparte y el maestro no la vuelve a proponer.'}
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary" disabled={ocupado} onClick={() => void decidir(confirmando)}>
                {ocupado ? 'Un momento…' : confirmando === 'aprobar' ? 'Sí, aprobar y repartir' : 'Sí, rechazar'}
              </button>
              <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setConfirmando('aprobar')}>
              {m.estado === 'aprobada' ? 'Volver a repartir' : 'Aprobar'}
            </button>
            {m.estado === 'por_decidir' ? (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmando('rechazar')}>
                Rechazar
              </button>
            ) : null}
          </div>
        )
      ) : null}
      {aviso ? (
        <p role="status" className={aviso.tono === 'ok' ? 'text-sm text-ok' : 'text-sm text-bad'}>
          {aviso.texto}
        </p>
      ) : null}
    </article>
  )
}

function Ajustes({ inicial, onGuardado }: { inicial: { tamanoPequenaHasta: number; tamanoMedianaHasta: number }; onGuardado: () => void }) {
  const [p, setP] = useState(String(inicial.tamanoPequenaHasta))
  const [m, setM] = useState(String(inicial.tamanoMedianaHasta))
  const [aviso, setAviso] = useState<{ tono: 'ok' | 'bad'; texto: string } | null>(null)
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const a = { tamanoPequenaHasta: Number(p), tamanoMedianaHasta: Number(m) }
    if (!Number.isInteger(a.tamanoPequenaHasta) || !Number.isInteger(a.tamanoMedianaHasta) || a.tamanoPequenaHasta < 1 || a.tamanoMedianaHasta <= a.tamanoPequenaHasta) {
      setAviso({ tono: 'bad', texto: 'Van números enteros: pequeña desde 1 y mediana mayor que pequeña.' })
      return
    }
    try {
      const r = await guardarAjustesDelMaestro(a)
      setAviso({ tono: 'ok', texto: r.mensaje })
      onGuardado()
    } catch (err) {
      setAviso({ tono: 'bad', texto: mensajeDelAdmin(err, { accion: 'guardar los cortes' }) })
    }
  }
  return (
    <form onSubmit={(e) => void guardar(e)} className="card p-4 space-y-3" aria-label="Cortes de tamaño">
      <p className="text-sm text-fg">Cortes de tamaño (contratos activos)</p>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="space-y-1">
          <span className="block text-fg-muted">Pequeña hasta</span>
          <input className="input w-28" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-fg-muted">Mediana hasta</span>
          <input className="input w-28" inputMode="numeric" value={m} onChange={(e) => setM(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </div>
      {aviso ? (
        <p role="status" className={aviso.tono === 'ok' ? 'text-sm text-ok' : 'text-sm text-bad'}>
          {aviso.texto}
        </p>
      ) : null}
    </form>
  )
}

function Diarios() {
  const { data, isLoading, error } = useApiQuery((signal) => getDiariosDelMaestro({ signal }), [])
  const [abierto, setAbierto] = useState<{ tenantId: string; dia: string } | null>(null)
  const diario = useApiQuery((signal) => (abierto ? getDiarioDelMaestro(abierto.tenantId, abierto.dia, signal) : Promise.resolve(null)), [abierto?.tenantId, abierto?.dia], abierto !== null)
  if (isLoading) return <LoadingBlock />
  if (error) return <ErrorBlock error={error} />
  if (!data || data.diarios.length === 0) return <EmptyBlock title="Todavía no hay diarios" hint="Cada Naira deja el suyo a las 00:20 con lo del día anterior." />
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-subtle">
              <th className="p-3 font-normal">día</th>
              <th className="p-3 font-normal">inmobiliaria</th>
              <th className="p-3 font-normal text-right">tamaño</th>
            </tr>
          </thead>
          <tbody>
            {data.diarios.map((d) => (
              <tr key={`${d.tenantId}-${d.dia}`} className="border-t border-border cursor-pointer hover:bg-surface-muted" onClick={() => setAbierto({ tenantId: d.tenantId, dia: d.dia })}>
                <td className="p-3 tabular-nums whitespace-nowrap">{d.dia}</td>
                <td className="p-3">{d.nombre}</td>
                <td className="p-3 text-right tabular-nums text-fg-muted">{Math.round(d.bytes / 1024)} KB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Sheet open={abierto !== null} onOpenChange={(o) => (o ? null : setAbierto(null))}>
        <SheetContent>
          <SheetHeader title="Diario de Naira" description={diario.data ? `${diario.data.nombre} · ${diario.data.dia}` : undefined} />
          <SheetBody>
            {diario.isLoading ? <LoadingBlock /> : diario.error ? <ErrorBlock error={diario.error} /> : (
              <pre className="text-xs whitespace-pre-wrap break-words text-fg">{diario.data ? JSON.stringify(diario.data.contenido, null, 2) : ''}</pre>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default function MaestroPage() {
  const [pestana, setPestana] = useState<Pestana>('mejoras')
  const [vuelta, setVuelta] = useState(0)
  const [avisoGeneral, setAvisoGeneral] = useState<string | null>(null)
  const { data, isLoading, error } = useApiQuery((signal) => getMaestro(signal), [vuelta])
  const recargar = () => setVuelta((v) => v + 1)
  const decidida = (mensaje: string) => {
    setAvisoGeneral(mensaje)
    recargar()
  }
  const porDecidir = data?.propuestas.filter((p) => p.estado === 'por_decidir' || p.estado === 'aprobada') ?? []
  const decididas = data?.propuestas.filter((p) => p.estado === 'aplicada' || p.estado === 'rechazada') ?? []
  const ultima = data?.corridas[0]
  const costoMes = (data?.corridas ?? []).reduce((s, c) => s + c.costoUsd, 0)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="maestro"
        title="Maestro de Leasefy"
        description="Cada noche lee los diarios de todas las Nairas, encuentra qué mejorar y lo propone por categoría. Lo que apruebes, la Naira de cada inmobiliaria de esa categoría lo aplica sola."
      />
      {avisoGeneral ? (
        <p role="status" className="card p-3 mb-4 text-sm text-ok">
          {avisoGeneral}
        </p>
      ) : null}
      {isLoading && !data ? <LoadingBlock /> : error ? <ErrorBlock error={error} /> : data ? (
        <div className="space-y-6">
          {!data.prendido ? (
            <div className="card p-3 text-sm text-fg-muted" role="note">
              El maestro está apagado en este servidor (NAIRA_MAESTRO_ENABLED): no hay diarios nuevos ni noches nuevas.
            </div>
          ) : null}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="por decidir" value={porDecidir.length} tone={porDecidir.length > 0 ? 'warn' : 'default'} />
            <KpiCard label="aplicadas" value={decididas.filter((p) => p.estado === 'aplicada').length} tone="ok" />
            <KpiCard label="última noche" value={ultima ? ultima.dia : '—'} hint={ultima ? ESTADO_DE_LA_NOCHE[ultima.estado] : 'todavía no ha pensado'} />
            <KpiCard label="costo de las noches" value={usd(costoMes)} hint={`${data.corridas.length} noche${data.corridas.length === 1 ? '' : 's'}`} />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist">
            {(
              [
                ['mejoras', `Mejoras (${porDecidir.length})`],
                ['insights', 'Insights'],
                ['inmobiliarias', 'Inmobiliarias'],
                ['diarios', 'Diarios'],
              ] as const
            ).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={pestana === k} className={pestana === k ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setPestana(k)}>
                {t}
              </button>
            ))}
          </div>

          {pestana === 'mejoras' ? (
            <section className="space-y-3" aria-label="Mejoras">
              {porDecidir.length === 0 && decididas.length === 0 ? (
                <EmptyBlock title="El maestro no ha propuesto nada" hint="Propone algo para una categoría cuando lo ve en al menos 3 inmobiliarias de ella." />
              ) : null}
              {porDecidir.map((m) => (
                <Mejora key={m.id} m={m} onDecidida={decidida} />
              ))}
              {decididas.length > 0 ? <p className="section-label pt-2">decididas</p> : null}
              {decididas.map((m) => (
                <Mejora key={m.id} m={m} onDecidida={decidida} />
              ))}
            </section>
          ) : null}

          {pestana === 'insights' ? (
            <section className="space-y-4" aria-label="Insights">
              {data.corridas.length === 0 ? <EmptyBlock title="El maestro todavía no ha pensado" hint="Piensa a la 1:30 a. m. con los diarios de los últimos 30 días." /> : null}
              {data.corridas.map((c) => (
                <article key={c.id} className="space-y-3" data-maestro-noche={c.estado}>
                  <p className="text-sm text-fg-muted">
                    <span className="text-fg font-medium">{c.dia}</span> · {ESTADO_DE_LA_NOCHE[c.estado]} · {c.inmobiliarias} inmobiliaria{c.inmobiliarias === 1 ? '' : 's'} · {c.diarios} diario{c.diarios === 1 ? '' : 's'} · {usd(c.costoUsd)}
                  </p>
                  {c.insights.map((i, n) => (
                    <div key={n} className="card p-4 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-fg">{conNombres(i.titulo, c.alias)}</p>
                        <Pill tone="info">{conMayuscula(i.tipo === 'operacion' ? 'operación' : i.tipo)}</Pill>
                      </div>
                      <p className="text-sm text-fg">{conNombres(i.detalle, c.alias)}</p>
                      {i.inmobiliarias.length > 0 ? <p className="text-xs text-fg-muted">{i.inmobiliarias.map((x) => x.nombre).join(', ')}</p> : null}
                    </div>
                  ))}
                  {c.descubiertas.map((d) => (
                    <div key={d.id} className="card p-4 space-y-1">
                      <p className="text-sm text-fg">
                        Categoría descubierta: <span className="font-medium">{d.nombre}</span>
                      </p>
                      <p className="text-sm text-fg-muted">{d.descripcion}</p>
                      <p className="text-xs text-fg-muted">{d.inmobiliarias.map((x) => x.nombre).join(', ')}</p>
                    </div>
                  ))}
                </article>
              ))}
            </section>
          ) : null}

          {pestana === 'inmobiliarias' ? (
            <section className="space-y-4" aria-label="Inmobiliarias">
              <Ajustes inicial={data.ajustes} onGuardado={recargar} />
              {data.inmobiliarias.length === 0 ? (
                <EmptyBlock title="Sin categorías todavía" hint="Salen de la primera noche del maestro." />
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-fg-subtle">
                        <th className="p-3 font-normal">inmobiliaria</th>
                        <th className="p-3 font-normal">tamaño</th>
                        <th className="p-3 font-normal">ciudad</th>
                        <th className="p-3 font-normal">negocio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.inmobiliarias.map((i) => (
                        <tr key={i.id} className="border-t border-border">
                          <td className="p-3">{i.nombre}</td>
                          <td className="p-3">{i.tamano ? TAMANO[i.tamano] : '—'}</td>
                          <td className="p-3">{i.ciudad ? conMayuscula(i.ciudad) : '—'}</td>
                          <td className="p-3">{i.negocio ? i.negocio.split('+').join(', ') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {pestana === 'diarios' ? <Diarios /> : null}
        </div>
      ) : null}
    </div>
  )
}
