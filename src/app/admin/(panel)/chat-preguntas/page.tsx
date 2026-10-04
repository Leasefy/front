'use client'

/**
 * /admin/chat-preguntas — qué le preguntan al chat las inmobiliarias.
 *
 * Decisión de Nico (04-10-2026 00:27), TAL CUAL: Leasefy ve las preguntas
 * completas que le hacen al chat, con su inmobiliaria, SIN el correo de quién
 * preguntó (y con los números largos — cédulas, cuentas, teléfonos —
 * enmascarados), + sugerencias de cómo optimizar el chat según lo que se vaya
 * encontrando.
 *
 * 🔴 NO está en el menú del admin (`src/components/admin/Nav.tsx`) hasta que
 * Nico / legal aprueben la cláusula de la política (§13 y §16; propuesta en
 * `memory/archivos/noche/clausula-preguntas-del-chat.md`). Se entra por URL.
 *
 * Los datos salen del micro de agentes (`GET /api/admin/ai-hub/chat/preguntas`,
 * misma puerta que `/admin/chat-feedback`: ADMIN_EMAILS + segundo factor). El
 * micro ya manda el texto enmascarado y nunca manda el correo.
 *
 * Patrón: `/admin/chat-feedback` (PageHeader + facetas + tarjetas) — resumen
 * arriba, sugerencias, tabla con filtros y el detalle del turno en un cajón.
 */

import { useState } from 'react'
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@leasefy/cadence'
import {
  getChatPreguntas,
  type SugerenciaDelChat,
  type TurnoDelChat,
} from '@/lib/admin/agent-api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pagination } from '@/components/admin/screen/Pagination'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'

const POR_PAGINA = 50

/** Las fuentes del turno como las lee una persona. */
const FUENTE_LEGIBLE: Record<string, string> = {
  busqueda: 'búsqueda en la plataforma',
  busqueda_no_disponible: 'búsqueda (no disponible)',
  cartera_erp: 'cartera del ERP',
  datos_de_negocio: 'cifras del negocio',
  grafo_deudor: 'historial del deudor',
  memoria: 'memoria del chat',
  lecciones: 'lecciones',
  cerebro: 'lo aprendido de la inmobiliaria',
}

export function fuenteLegible(f: string): string {
  if (FUENTE_LEGIBLE[f]) return FUENTE_LEGIBLE[f]
  if (f.startsWith('grafo_inmobiliaria')) return 'relaciones de la inmobiliaria'
  if (f.startsWith('especialista:')) return `especialista de ${f.slice('especialista:'.length).replace(/[_-]/g, ' ')}`
  return f.replace(/[_-]/g, ' ')
}

const especialistaLegible = (e: string) => `especialista de ${e.replace(/[_-]/g, ' ')}`

/** «US$0,0123». */
export function usd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const dec = n > 0 && n < 0.01 ? 4 : 2
  return `US$${n.toFixed(dec).replace('.', ',')}`
}

/** «3,2 s». */
function segundos(ms: number | null): string {
  if (ms == null) return '—'
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

/** El día de Bogotá (UTC−5) de un instante, `YYYY-MM-DD`. */
function diaDeBogota(iso: string): string {
  return new Date(new Date(iso).getTime() - 5 * 3_600_000).toISOString().slice(0, 10)
}

/** «15 de octubre de 2026». */
function fechaLarga(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function EstadoDelTurno({ t }: { t: TurnoDelChat }) {
  return (
    <div className="flex flex-wrap gap-1">
      {t.falla ? (
        <Pill tone="bad">{t.falla.motivo === 'sin_creditos' ? 'se cortó: sin créditos' : 'se cortó'}</Pill>
      ) : t.respuesta === null ? (
        <Pill tone="muted">respuesta sin guardar</Pill>
      ) : t.sinRespuesta ? (
        <Pill tone="warn">sin respuesta</Pill>
      ) : (
        <Pill tone="ok">respondió</Pill>
      )}
      {t.reformulada && <Pill tone="warn">reformulada</Pill>}
      {t.corregida && <Pill tone="warn">corregida</Pill>}
      {t.abandonada && <Pill tone="muted">abandono</Pill>}
      {t.pulgar === 'abajo' && <Pill tone="bad">pulgar abajo</Pill>}
      {t.pulgar === 'arriba' && <Pill tone="ok">pulgar arriba</Pill>}
      {t.cifraContradicha && <Pill tone="bad">cifra contradicha</Pill>}
    </div>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{etiqueta}</div>
      <div className="text-sm text-fg mt-0.5">{children}</div>
    </div>
  )
}

/** El detalle de un turno, en el cajón. */
function DetalleDelTurno({ t, onClose }: { t: TurnoDelChat | null; onClose: () => void }) {
  return (
    <Sheet open={t !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <SheetContent side="right" size="md" aria-describedby={undefined} data-testid="detalle-del-turno">
        {/* El cajón vive en un portal, fuera de `.admin-scope`: sin esta clase
            las píldoras y los tokens del backoffice no se aplican adentro. */}
        {t && (
          <div className="admin-scope !min-h-0 !bg-transparent flex flex-col min-h-0 flex-1">
            <SheetHeader title="Detalle de la pregunta" description={`${t.inmobiliaria ?? `Inmobiliaria ${t.agencyId.slice(0, 8)}`} · ${fmtDateTime(t.fecha)}`} />
            <SheetBody className="space-y-4">
              <Dato etiqueta="pregunta">
                <p className="whitespace-pre-wrap">{t.pregunta || '—'}</p>
              </Dato>
              <Dato etiqueta="respuesta del chat">
                {t.respuesta ? (
                  <pre className="text-xs text-fg-muted whitespace-pre-wrap leading-snug max-h-72 overflow-y-auto font-sans">{t.respuesta}</pre>
                ) : (
                  <span className="text-fg-muted">{t.falla ? 'El turno se cortó antes de responder.' : 'Sin respuesta guardada.'}</span>
                )}
              </Dato>
              <Dato etiqueta="cómo terminó">
                <EstadoDelTurno t={t} />
              </Dato>
              {t.comentario && <Dato etiqueta="lo que esperaba (con el pulgar)">{t.comentario}</Dato>}
              {t.metricasContradichas.length > 0 && (
                <Dato etiqueta="cifras que el ERP contradijo">{t.metricasContradichas.join(' · ')}</Dato>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Dato etiqueta="temas">{t.temas.join(' · ') || '—'}</Dato>
                <Dato etiqueta="rol de quien preguntó">{t.rol ?? '—'}</Dato>
                <Dato etiqueta="tardó">{segundos(t.ms)}</Dato>
                <Dato etiqueta="costo">{usd(t.costoUsd)}</Dato>
                <Dato etiqueta="tokens (entrada / salida)">
                  {t.tokensEntrada == null && t.tokensSalida == null
                    ? '—'
                    : `${(t.tokensEntrada ?? 0).toLocaleString('es-CO')} / ${(t.tokensSalida ?? 0).toLocaleString('es-CO')}`}
                </Dato>
                <Dato etiqueta="modelo">{t.modelo ?? '—'}</Dato>
                <Dato etiqueta="pidió una acción">{t.pideAccion ? (t.propusoAccion ? 'sí, y la propuso' : 'sí, y no la propuso') : 'no'}</Dato>
                <Dato etiqueta="camino">{t.camino ?? '—'}</Dato>
              </div>
              <Dato etiqueta="quién trabajó">
                {t.especialistas.length + t.fuentes.length === 0 ? (
                  '—'
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {t.especialistas.map((e) => (
                      <Pill key={`e-${e}`} tone="info">{especialistaLegible(e)}</Pill>
                    ))}
                    {t.fuentes
                      .filter((f) => !f.startsWith('especialista:'))
                      .map((f) => (
                        <Pill key={`f-${f}`}>{fuenteLegible(f)}</Pill>
                      ))}
                  </div>
                )}
              </Dato>
              <p className="text-xs text-fg-subtle">
                Sin el correo de quién preguntó. Los números largos (documentos, cuentas, teléfonos) van ocultos.
              </p>
            </SheetBody>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function TarjetaDeSugerencia({ s, onAbrir }: { s: SugerenciaDelChat; onAbrir: (t: TurnoDelChat) => void }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <div className={`card border-l-4 ${s.severidad === 'alta' ? 'border-l-bad' : 'border-l-warn'} p-4`} data-testid="sugerencia">
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <Pill tone={s.severidad === 'alta' ? 'bad' : 'warn'}>{s.severidad === 'alta' ? 'prioridad alta' : 'para revisar'}</Pill>
        <span className="font-medium text-fg">{s.hallazgo}</span>
      </div>
      <div className="text-sm text-fg-muted leading-snug mb-2">→ {s.accion}</div>
      {s.ejemplos.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
            className="text-xs text-fg-subtle hover:text-fg underline underline-offset-2"
          >
            {abierta ? 'ocultar los ejemplos' : `ver ${s.ejemplos.length === 1 ? 'el ejemplo' : `los ${s.ejemplos.length} ejemplos`}`}
          </button>
          {abierta && (
            <ul className="mt-2 space-y-1">
              {s.ejemplos.map((e) => (
                <li key={e.turnoId}>
                  <button
                    type="button"
                    onClick={() => onAbrir(e)}
                    className="text-left text-sm text-fg hover:underline underline-offset-2"
                  >
                    «{e.pregunta}»{' '}
                    <span className="font-mono text-[10px] text-fg-subtle">
                      {e.inmobiliaria ?? e.agencyId.slice(0, 8)} · {fmtDateTime(e.fecha)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default function ChatPreguntasPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const agencia = get('agencia')
  const desde = get('desde')
  const hasta = get('hasta')
  const tema = get('tema')
  const q = get('q')
  const sinRespuesta = get('sinRespuesta') === '1'
  const pulgarAbajo = get('pulgarAbajo') === '1'

  const [texto, setTexto] = useState(q)
  const [abierto, setAbierto] = useState<TurnoDelChat | null>(null)

  const { data, isLoading, error } = useApiQuery(
    (signal) =>
      getChatPreguntas({
        ...(agencia ? { agencyId: agencia } : {}),
        ...(desde ? { desde } : {}),
        ...(hasta ? { hasta } : {}),
        ...(tema ? { tema } : {}),
        ...(q ? { q } : {}),
        sinRespuesta,
        pulgarAbajo,
        pagina: page + 1,
        limite: POR_PAGINA,
        signal,
      }),
    [agencia, desde, hasta, tema, q, sinRespuesta, pulgarAbajo, page],
  )

  const totales = data?.totales
  const columnas: Column<TurnoDelChat>[] = [
    { header: 'fecha', cell: (t) => <span className="tabular-nums whitespace-nowrap text-fg-muted">{fmtDateTime(t.fecha)}</span> },
    { header: 'inmobiliaria', cell: (t) => <span title={t.agencyId}>{t.inmobiliaria ?? t.agencyId.slice(0, 8)}</span> },
    { header: 'pregunta', cell: (t) => <span className="line-clamp-2 text-fg">{t.pregunta || '—'}</span>, className: 'min-w-[16rem]' },
    { header: 'cómo terminó', cell: (t) => <EstadoDelTurno t={t} /> },
    { header: 'tardó', cell: (t) => <span className="tabular-nums">{segundos(t.ms)}</span>, align: 'right' },
    { header: 'costo', cell: (t) => <span className="tabular-nums">{usd(t.costoUsd)}</span>, align: 'right' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="chat"
        title="Preguntas al chat"
        description="Lo que le preguntan al chat las inmobiliarias, sin el correo de quién preguntó y con los números largos ocultos, y lo que conviene mejorar."
      />

      <div className="card p-3 mb-6 text-sm text-fg-muted" role="note">
        Esta pantalla no está en el menú: se abre cuando se apruebe la cláusula de la política de privacidad
        que lo permite. Mientras tanto sólo la ve el equipo de Leasefy, por este enlace.
      </div>

      {/* Filtros (viven en la URL). */}
      <div className="flex flex-wrap items-end gap-3 mb-6" data-testid="filtros">
        <label className="text-xs text-fg-subtle flex flex-col gap-1">
          inmobiliaria
          <select
            className="input"
            value={agencia}
            onChange={(e) => setFilters({ agencia: e.target.value || undefined }, { resetPage: true })}
            aria-label="inmobiliaria"
          >
            <option value="">todas</option>
            {(data?.inmobiliarias ?? []).map((i) => (
              <option key={i.agencyId} value={i.agencyId}>
                {(i.nombre ?? i.agencyId.slice(0, 8)) + ` (${i.preguntas})`}
              </option>
            ))}
            {agencia && !(data?.inmobiliarias ?? []).some((i) => i.agencyId === agencia) && (
              <option value={agencia}>{agencia.slice(0, 8)}</option>
            )}
          </select>
        </label>
        <label className="text-xs text-fg-subtle flex flex-col gap-1">
          desde
          <input
            type="date"
            className="input"
            value={desde}
            aria-label="desde"
            onChange={(e) => setFilters({ desde: e.target.value || undefined }, { resetPage: true })}
          />
        </label>
        <label className="text-xs text-fg-subtle flex flex-col gap-1">
          hasta
          <input
            type="date"
            className="input"
            value={hasta}
            aria-label="hasta"
            onChange={(e) => setFilters({ hasta: e.target.value || undefined }, { resetPage: true })}
          />
        </label>
        <label className="text-xs text-fg-subtle flex flex-col gap-1">
          tema
          <select
            className="input"
            value={tema}
            aria-label="tema"
            onChange={(e) => setFilters({ tema: e.target.value || undefined }, { resetPage: true })}
          >
            <option value="">todos</option>
            {(data?.temas ?? []).map((t) => (
              <option key={t.tema} value={t.tema}>
                {`${t.nombre} (${t.preguntas})`}
              </option>
            ))}
          </select>
        </label>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setFilters({ q: texto.trim() || undefined }, { resetPage: true })
          }}
        >
          <label className="text-xs text-fg-subtle flex flex-col gap-1">
            texto
            <input
              type="search"
              className="input"
              value={texto}
              placeholder="palabras de la pregunta"
              aria-label="buscar en las preguntas"
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          <button type="submit" className="btn">Buscar</button>
        </form>
        <button
          type="button"
          onClick={() => setFilters({ sinRespuesta: sinRespuesta ? undefined : '1' }, { resetPage: true })}
          className={`pill ${sinRespuesta ? 'pill-info' : ''}`}
          aria-pressed={sinRespuesta}
        >
          sólo sin respuesta
        </button>
        <button
          type="button"
          onClick={() => setFilters({ pulgarAbajo: pulgarAbajo ? undefined : '1' }, { resetPage: true })}
          className={`pill ${pulgarAbajo ? 'pill-info' : ''}`}
          aria-pressed={pulgarAbajo}
        >
          sólo pulgar abajo
        </button>
        {(agencia || desde || hasta || tema || q || sinRespuesta || pulgarAbajo) && (
          <button
            type="button"
            className="text-xs text-fg-subtle hover:text-fg underline underline-offset-2"
            onClick={() => {
              setTexto('')
              setFilters(
                { agencia: undefined, desde: undefined, hasta: undefined, tema: undefined, q: undefined, sinRespuesta: undefined, pulgarAbajo: undefined },
                { resetPage: true },
              )
            }}
          >
            quitar filtros
          </button>
        )}
      </div>

      {isLoading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : !data || data.totales.preguntas === 0 ? (
        <EmptyBlock
          title="Sin preguntas en estas fechas"
          hint="Nadie le ha preguntado nada al chat en este rango, o el chat todavía no guarda sus preguntas en esta instalación."
        />
      ) : (
        <>
          {/* Resumen de la ventana. */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            del {fechaLarga(diaDeBogota(data.ventana.desde))} al{' '}
            {/* Con «hasta», el micro corta a la medianoche del día siguiente; sin él, es ahora. */}
            {fechaLarga(hasta || diaDeBogota(data.ventana.hasta))}
            {data.ventana.truncado ? ' · las 5.000 más recientes' : ''}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
            <KpiCard label="preguntas" value={totales!.preguntas} hint={`${totales!.inmobiliarias} ${totales!.inmobiliarias === 1 ? 'inmobiliaria' : 'inmobiliarias'}`} />
            <KpiCard
              label="sin respuesta"
              value={totales!.porcentajeSinRespuesta == null ? '—' : `${String(totales!.porcentajeSinRespuesta).replace('.', ',')} %`}
              hint={`${totales!.sinRespuesta} de ${totales!.preguntas}`}
              tone={(totales!.porcentajeSinRespuesta ?? 0) >= 25 ? 'bad' : 'default'}
            />
            <KpiCard label="reformuladas" value={totales!.reformulaciones} />
            <KpiCard label="abandonos" value={totales!.abandonos} />
            <KpiCard label="se cortaron" value={totales!.fallas} tone={totales!.fallas > 0 ? 'warn' : 'default'} />
            <KpiCard
              label="costo"
              value={totales!.turnosConCosto === 0 ? '—' : usd(totales!.costoUsd)}
              hint={totales!.turnosConCosto === 0 ? 'todavía sin costo anotado' : `${totales!.turnosConCosto} turnos con costo`}
            />
          </div>

          {/* Sugerencias. */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">qué mejorar del chat</div>
          {data.sugerencias.length === 0 ? (
            <p className="text-sm text-fg-subtle mb-8">
              Nada que sugerir con estas preguntas: ningún tema pasa los umbrales (se necesitan al menos 5 preguntas de un tema).
            </p>
          ) : (
            <div className="space-y-2 mb-8">
              {data.sugerencias.map((s) => (
                <TarjetaDeSugerencia key={s.id} s={s} onAbrir={setAbierto} />
              ))}
            </div>
          )}

          {/* Temas, especialistas y fuentes. */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="card p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">temas más preguntados</div>
              <div className="flex flex-wrap gap-1">
                {data.temas.slice(0, 12).map((t) => (
                  <button
                    key={t.tema}
                    type="button"
                    className={`pill ${tema === t.tema ? 'pill-info' : ''}`}
                    onClick={() => setFilters({ tema: tema === t.tema ? undefined : t.tema }, { resetPage: true })}
                  >
                    {t.nombre} · {t.preguntas}
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">especialistas que más trabajan</div>
              {data.especialistas.length === 0 ? (
                <span className="text-sm text-fg-subtle">ningún especialista en estas preguntas</span>
              ) : (
                <ul className="text-sm space-y-0.5">
                  {data.especialistas.map((e) => (
                    <li key={e.nombre} className="flex justify-between gap-2">
                      <span>{especialistaLegible(e.nombre)}</span>
                      <span className="tabular-nums text-fg-muted">{e.veces}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">de dónde sacó la respuesta</div>
              {data.fuentes.length === 0 ? (
                <span className="text-sm text-fg-subtle">sin fuentes anotadas</span>
              ) : (
                <ul className="text-sm space-y-0.5">
                  {data.fuentes.map((f) => (
                    <li key={f.nombre} className="flex justify-between gap-2">
                      <span>{fuenteLegible(f.nombre)}</span>
                      <span className="tabular-nums text-fg-muted">{f.veces}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Por semana e inmobiliaria. */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">por semana e inmobiliaria</div>
          <div className="mb-8">
            <DataTable
              rows={data.resumen}
              getKey={(s) => `${s.semana}-${s.agencyId}`}
              columns={[
                { header: 'semana del', cell: (s) => <span className="whitespace-nowrap">{fechaLarga(s.semana)}</span> },
                { header: 'inmobiliaria', cell: (s) => s.inmobiliaria ?? s.agencyId.slice(0, 8) },
                { header: 'preguntas', cell: (s) => <span className="tabular-nums">{s.preguntas}</span>, align: 'right' },
                {
                  header: 'sin respuesta',
                  cell: (s) => (
                    <span className="tabular-nums">
                      {s.porcentajeSinRespuesta == null ? '—' : `${String(s.porcentajeSinRespuesta).replace('.', ',')} %`}
                    </span>
                  ),
                  align: 'right',
                },
                { header: 'reformuladas', cell: (s) => <span className="tabular-nums">{s.reformulaciones}</span>, align: 'right' },
                { header: 'abandonos', cell: (s) => <span className="tabular-nums">{s.abandonos}</span>, align: 'right' },
                { header: 'se cortaron', cell: (s) => <span className="tabular-nums">{s.fallas}</span>, align: 'right' },
                { header: 'temas', cell: (s) => <span className="text-fg-muted">{s.temas.map((t) => t.nombre).join(' · ') || '—'}</span> },
              ]}
              emptyTitle="Sin semanas"
            />
          </div>

          {/* Las preguntas. */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            preguntas · más recientes primero · {data.total} {data.total === 1 ? 'pregunta' : 'preguntas'}
          </div>
          <DataTable
            rows={data.filas}
            getKey={(t) => t.turnoId}
            columns={columnas}
            onRowClick={setAbierto}
            isLoading={isLoading}
            emptyTitle="Ninguna pregunta con estos filtros"
            emptyHint="Quita algún filtro para ver más."
          />
          <Pagination page={page} total={data.total} pageSize={POR_PAGINA} onPage={setPage} />
        </>
      )}

      <DetalleDelTurno t={abierto} onClose={() => setAbierto(null)} />
    </div>
  )
}
