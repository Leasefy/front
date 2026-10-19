'use client'

/**
 * PanelesDelLaboratorio — los paneles de abajo del Laboratorio del maestro (Nico, 19-10-2026, el «Paper Lab»). Cada uno
 * lee la noche real: la bitácora, el avance de cada uno de los seis del maestro, el campo de diferencias del ensayo de la
 * propuesta elegida (lo que pasó contra lo que habría pasado), la mesa con su porqué y la objeción del revisor, el
 * veredicto por inmobiliaria, el índice propuestas × inmobiliarias, el reparto y «¿sirvió?», y los insights.
 */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type { LaboratorioResponse, PasoDelMaestro, PropuestaDelLaboratorio, RolDelMaestro, VeredictoDelEnsayo } from '@/lib/admin/agent-api'
import { conNombres } from '@/lib/admin/maestro'
import { horaDeBogota, maximoDe, ROLES, VEREDICTO } from '@/lib/admin/laboratorio'

const ROJO = '#e84855'

export function Panel({ titulo, children, className = '', nota }: { titulo: string; children: React.ReactNode; className?: string; nota?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`flex min-h-[220px] flex-col border border-white/10 bg-white/[0.025] p-3 ${className}`}
      aria-label={titulo}
    >
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/80">{titulo}</h3>
        {nota ? <span className="font-mono text-[10px] text-white/40">{nota}</span> : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </motion.section>
  )
}

/** La bitácora: los pasos que van saliendo, el último resaltado; se baja sola. */
export function PanelBitacora({ pasos, alias }: { pasos: readonly PasoDelMaestro[]; alias: Readonly<Record<string, string>> }) {
  const caja = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = caja.current
    if (el) el.scrollTop = el.scrollHeight
  }, [pasos.length])
  return (
    <Panel titulo="Bitácora de la noche" nota={`${pasos.length} pasos`} className="lg:col-span-2">
      <div ref={caja} className="h-[220px] overflow-y-auto pr-1 font-mono text-[11px] leading-[1.55]" aria-live="polite" data-maestro-bitacora="">
        {pasos.length === 0 ? <p className="text-white/40">Todavía no hay pasos.</p> : null}
        <AnimatePresence initial={false}>
          {pasos.map((p, i) => (
            <motion.p
              key={p.orden}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className={`grid grid-cols-[64px_84px_1fr] gap-2 ${i === pasos.length - 1 ? 'text-white' : 'text-white/55'}`}
            >
              <span className="tabular-nums text-white/35">{horaDeBogota(p.en)}</span>
              <span className={p.paso === 'tumba' || p.paso === 'propone_deshacer' || p.detalle.veredicto === 'empeora' ? 'text-[#e84855]' : 'text-white/70'}>{p.rol}</span>
              <span className="min-w-0 break-words">{conNombres(p.texto, alias)}</span>
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  )
}

/** Los seis del maestro: cuánto lleva cada uno y qué hizo por último. */
export function PanelAgentes({ avance, activo }: { avance: Record<RolDelMaestro, { hechos: number; total: number; ultimo: PasoDelMaestro | null }>; activo: RolDelMaestro | null }) {
  return (
    <Panel titulo="Los 6 del maestro / despacho">
      <ul className="space-y-2.5 font-mono text-[11px]">
        {ROLES.map((r) => {
          const a = avance[r.rol]
          const parte = a.total === 0 ? 0 : a.hechos / a.total
          return (
            <li key={r.rol} data-maestro-rol={r.rol} data-activo={activo === r.rol ? '' : undefined}>
              <div className="flex items-center justify-between gap-2">
                <span className={activo === r.rol ? 'text-white' : 'text-white/60'}>
                  {activo === r.rol ? '▸ ' : ''}
                  {r.nombre}
                </span>
                <span className="tabular-nums text-white/40">
                  {a.hechos}/{a.total}
                </span>
              </div>
              <div className="mt-1 h-[6px] w-full bg-white/[0.06]">
                <motion.div className="h-full bg-white/70" initial={false} animate={{ scaleX: parte }} style={{ originX: 0 }} transition={{ duration: 0.3 }} />
              </div>
              <p className="mt-0.5 truncate text-[10px] text-white/35">{a.ultimo ? a.ultimo.texto : r.hace}</p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function Grilla({ valores, maximo, roja = false, etiqueta }: { valores: ReadonlyArray<ReadonlyArray<number>>; maximo: number; roja?: boolean; etiqueta: string }) {
  const filas = valores.length
  const columnas = valores[0]?.length ?? 0
  return (
    <figure className="min-w-0">
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${Math.max(1, columnas)}, minmax(0, 1fr))` }} role="img" aria-label={etiqueta}>
        {valores.flatMap((fila, i) =>
          fila.map((v, j) => {
            const fuerza = maximo === 0 ? 0 : v / maximo
            return (
              <span
                key={`${i}-${j}`}
                className="block aspect-square"
                style={{ background: v === 0 ? 'rgba(255,255,255,0.05)' : roja ? `rgba(232,72,85,${0.25 + 0.75 * fuerza})` : `rgba(255,255,255,${0.15 + 0.85 * fuerza})` }}
                title={`${v}`}
              />
            )
          }),
        )}
      </div>
      <figcaption className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
        {etiqueta} · {filas}×{columnas}
      </figcaption>
    </figure>
  )
}

/** El campo de diferencias: lo que pasó contra lo que habría pasado con la mejora, inmobiliaria × día. */
export function PanelEnsayo({ propuesta }: { propuesta: PropuestaDelLaboratorio | null }) {
  const e = propuesta?.ensayo ?? null
  return (
    <Panel titulo="Ensayo / campo de diferencias" nota={e ? `${e.filas.length} inmob. × ${e.dias.length} días` : undefined} className="lg:col-span-2">
      {!e ? (
        <p className="font-mono text-[11px] text-white/40">{propuesta ? 'Esta propuesta no tiene ensayo (un «deshacer» sale de la medición).' : 'Elige una propuesta.'}</p>
      ) : (
        <div className="space-y-3">
          {e.grillas.slice(0, 2).map((g) => {
            const maximo = maximoDe([g.referencia, g.conLaMejora])
            const diferencia = g.conLaMejora ? g.referencia.map((fila, i) => fila.map((v, j) => Math.abs((g.conLaMejora?.[i]?.[j] ?? 0) - v))) : null
            return (
              <div key={g.medida} className="space-y-1">
                <p className="font-mono text-[10px] text-white/60">{g.medida}</p>
                <div className={`grid gap-2 ${g.conLaMejora ? 'grid-cols-3' : 'grid-cols-1'}`}>
                  <Grilla valores={g.referencia} maximo={maximo} etiqueta="lo que pasó" />
                  {g.conLaMejora ? <Grilla valores={g.conLaMejora} maximo={maximo} etiqueta="con la mejora" /> : null}
                  {diferencia ? <Grilla valores={diferencia} maximo={maximoDe([diferencia])} roja etiqueta="diferencia" /> : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

const NOMBRE_DEL_MOTIVO: Record<string, string> = { ensayo_empeora: 'el ensayo dice que empeora', revisor_la_tumba: 'el revisor la tumbó' }

/** La mesa: qué propone, para quién, por qué, el ensayo y lo que dijo el revisor. */
export function PanelMesa({ propuesta, onVerMejoras }: { propuesta: PropuestaDelLaboratorio | null; onVerMejoras: () => void }) {
  if (!propuesta) {
    return (
      <Panel titulo="Mesa del maestro">
        <p className="font-mono text-[11px] text-white/40">Esta noche no dejó propuestas.</p>
      </Panel>
    )
  }
  const r = propuesta.revision
  return <Mesa propuesta={propuesta} r={r} onVerMejoras={onVerMejoras} />
}

/** Un texto largo (la objeción del revisor) recortado a unas líneas, con «ver más». */
function Recortable({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <span className="block">
      {/* Sin `block` cuando está recortado: line-clamp necesita su propio display. */}
      <span className={abierto ? 'block' : 'line-clamp-4'}>{children}</span>
      <button type="button" className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50 hover:text-white" onClick={() => setAbierto((x) => !x)}>
        {abierto ? 'ver menos' : 'ver más'}
      </button>
    </span>
  )
}

function Mesa({ propuesta, r, onVerMejoras }: { propuesta: PropuestaDelLaboratorio; r: PropuestaDelLaboratorio['revision']; onVerMejoras: () => void }) {
  return (
    <Panel titulo="Mesa del maestro" nota={propuesta.categoria}>
      <div className="space-y-2 text-[12px] leading-relaxed text-white/80">
        <p className="text-white">{propuesta.que}</p>
        <p className={`inline-block border px-1.5 font-mono text-[10px] uppercase tracking-[0.12em] ${propuesta.veredicto === 'por_revisar' ? 'border-[#e84855] text-[#e84855]' : 'border-white/40 text-white/80'}`}>
          {propuesta.veredicto === 'por_revisar' ? `por revisar · ${propuesta.motivos.map((m) => NOMBRE_DEL_MOTIVO[m] ?? m).join(' y ')}` : 'pasa: se puede aprobar'}
        </p>
        <div className="text-white/65">
          <Recortable>{propuesta.porque}</Recortable>
        </div>
        {propuesta.ensayo ? (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Ensayo · {VEREDICTO[propuesta.ensayo.veredicto].texto}: </span>
            <Recortable>{propuesta.ensayo.resumen}</Recortable>
          </div>
        ) : null}
        {r ? (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Revisor: </span>
            <Recortable>{'noCorrio' in r ? `no la revisó (${r.noCorrio}).` : `${r.aguanta ? 'aguanta' : 'la tumba'} (confianza ${r.confianza}). ${r.objecion}`}</Recortable>
          </div>
        ) : null}
        <button type="button" className="btn btn-on-dark h-8 px-3" onClick={onVerMejoras}>
          {propuesta.estado === 'por_decidir' ? 'Decidir en Mejoras' : 'Ver en Mejoras'}
        </button>
      </div>
    </Panel>
  )
}

const TONO: Record<'ok' | 'bad' | 'neutro' | 'vacio', string> = { ok: 'bg-white/80', bad: 'bg-[#e84855]', neutro: 'bg-white/35', vacio: 'bg-white/[0.08]' }

/** El veredicto del ensayo en cada inmobiliaria a la que llegaría. */
export function PanelValidacion({ propuesta, alias }: { propuesta: PropuestaDelLaboratorio | null; alias: Readonly<Record<string, string>> }) {
  const lista = propuesta?.ensayo?.porInmobiliaria ?? []
  return (
    <Panel titulo="Validación / por inmobiliaria" nota={lista.length ? `${lista.filter((x) => x.veredicto === 'empeora').length} empeoran` : undefined}>
      {lista.length === 0 ? (
        <p className="font-mono text-[11px] text-white/40">Sin veredictos por inmobiliaria.</p>
      ) : (
        <ul className="max-h-[220px] space-y-1 overflow-y-auto font-mono text-[11px]">
          {lista.map((x) => {
            const cifras = Object.entries(x.cifras).filter(([, v]) => typeof v === 'number')
            return (
              <li key={x.alias} className="grid grid-cols-[1fr_auto] items-center gap-2">
                <span className="truncate text-white/75">
                  {x.alias} · {alias[x.alias] ?? ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 ${TONO[VEREDICTO[x.veredicto].tono]}`} aria-hidden="true" />
                  <span className={x.veredicto === 'empeora' ? 'text-[#e84855]' : 'text-white/55'}>{VEREDICTO[x.veredicto].texto}</span>
                </span>
                {cifras.length > 0 ? <span className="col-span-2 -mt-0.5 truncate text-[10px] text-white/35">{cifras.map(([k, v]) => `${k.replaceAll('_', ' ')} ${v}`).join(' · ')}</span> : null}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** El índice: cada propuesta contra cada inmobiliaria, con el veredicto de su ensayo. */
export function PanelIndice({ propuestas, inmobiliarias, elegida, onElegir }: { propuestas: readonly PropuestaDelLaboratorio[]; inmobiliarias: LaboratorioResponse['inmobiliarias']; elegida: string | null; onElegir: (id: string) => void }) {
  const pasan = propuestas.filter((p) => p.veredicto === 'pasa').length
  return (
    <Panel titulo="Índice / propuestas × inmobiliarias" nota={`${propuestas.length} propuestas · ${pasan} pasan · ${propuestas.length - pasan} por revisar`} className="lg:col-span-2">
      {propuestas.length === 0 ? (
        <p className="font-mono text-[11px] text-white/40">Esta noche no dejó propuestas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="font-mono text-[10px]">
            <thead>
              <tr>
                <th className="pr-2 text-left font-normal text-white/40">propuesta</th>
                {inmobiliarias.map((i) => (
                  <th key={i.alias} className="w-4 px-px font-normal text-white/40" title={i.nombre}>
                    {i.alias.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propuestas.map((p, n) => {
                const por = new Map((p.ensayo?.porInmobiliaria ?? []).map((x) => [x.alias, x.veredicto] as const))
                return (
                  <tr key={p.id} className={`cursor-pointer ${elegida === p.id ? 'text-white' : 'text-white/55 hover:text-white/85'}`} onClick={() => onElegir(p.id)} data-maestro-indice={p.id}>
                    <td className="max-w-[260px] truncate py-0.5 pr-2">
                      <span className={p.veredicto === 'por_revisar' ? 'text-[#e84855]' : ''}>P{n + 1}</span> {p.que}
                    </td>
                    {inmobiliarias.map((i) => {
                      const v: VeredictoDelEnsayo | undefined = por.get(i.alias)
                      return (
                        <td key={i.alias} className="px-px py-0.5">
                          <span className={`block h-3 w-3 ${v ? TONO[VEREDICTO[v].tono] : 'bg-transparent'}`} title={v ? `${i.nombre}: ${VEREDICTO[v].texto}` : `${i.nombre}: no le llega`} />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/** El reparto de lo aprobado y «¿sirvió?» con su curva (la parte que salió mal por día, antes y después). */
export function PanelSirvio({ mediciones }: { mediciones: LaboratorioResponse['mediciones'] }) {
  return (
    <Panel titulo="¿Sirvió? / lo aplicado" nota={mediciones.length ? `${mediciones.length} medidas` : undefined}>
      {mediciones.length === 0 ? (
        <p className="font-mono text-[11px] leading-relaxed text-white/40">
          Todavía no hay mejoras aplicadas con 14 días. Cuando las haya, el medidor compara antes y después en cada inmobiliaria y, si empeoró, propone deshacerla.
        </p>
      ) : (
        <ul className="max-h-[220px] space-y-3 overflow-y-auto">
          {mediciones.map((m) => {
            const vals = m.serie.valores
            const max = Math.max(0.01, ...vals.map((v) => v ?? 0))
            const mitad = Math.floor(vals.length / 2)
            const puntos = vals.map((v, i) => (v === null ? null : `${(i / Math.max(1, vals.length - 1)) * 100},${30 - (v / max) * 28}`)).filter(Boolean)
            return (
              <li key={m.propuestaId} className="font-mono text-[11px]">
                <p className="truncate text-white/80">{m.que ?? m.propuestaId}</p>
                <svg viewBox="0 0 100 32" className="mt-1 h-8 w-full" preserveAspectRatio="none" aria-label={m.resumen}>
                  <line x1={(mitad / Math.max(1, vals.length - 1)) * 100} x2={(mitad / Math.max(1, vals.length - 1)) * 100} y1="0" y2="32" stroke="rgba(255,255,255,0.25)" strokeDasharray="2 2" />
                  <polyline points={puntos.join(' ')} fill="none" stroke={m.veredicto === 'empeoro' ? ROJO : 'rgba(255,255,255,0.8)'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                </svg>
                <p className={m.veredicto === 'empeoro' ? 'text-[#e84855]' : 'text-white/50'}>{m.resumen}</p>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** Lo que el maestro encontró para Leasefy (los insights, tal como salieron en la bitácora). */
export function PanelInsights({ pasos, alias }: { pasos: readonly PasoDelMaestro[]; alias: Readonly<Record<string, string>> }) {
  const insights = pasos.filter((p) => p.paso === 'insight')
  return (
    <Panel titulo="Insights para Leasefy" nota={insights.length ? `${insights.length}` : undefined} className="lg:col-span-2">
      {insights.length === 0 ? (
        <p className="font-mono text-[11px] text-white/40">Sin insights todavía en esta noche.</p>
      ) : (
        <ol className="max-h-[220px] space-y-1.5 overflow-y-auto text-[12px] text-white/80">
          {insights.map((p, i) => (
            <li key={p.orden} className="grid grid-cols-[22px_1fr] gap-1">
              <span className="font-mono text-[10px] text-white/40">{String(i + 1).padStart(2, '0')}</span>
              <span>{conNombres(p.texto, alias)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
