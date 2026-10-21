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
 * 🔴 En el menú del admin (`src/components/admin/Nav.tsx`) desde el
 * 04-10-2026: Nico aprobó la cláusula tal cual y salió la política v4.0 (§13 y
 * §16, `memory/archivos/noche/clausula-preguntas-del-chat.md`).
 *
 * Los datos salen del micro de agentes (`GET /api/admin/ai-hub/chat/preguntas`,
 * misma puerta que `/admin/chat-feedback`: ADMIN_EMAILS + segundo factor). El
 * micro ya manda el texto enmascarado y nunca manda el correo.
 *
 * Patrón: `/admin/chat-feedback` (PageHeader + facetas + tarjetas) — resumen
 * arriba, sugerencias, tabla con filtros y el detalle del turno en un cajón.
 */

import { useState } from 'react'
import { Alert, Card, Chip, MonoLabel, Sheet, SheetBody, SheetContent, SheetHeader } from '@leasefy/cadence'
import {
  getChatPreguntas,
  type SugerenciaDelChat,
  type TurnoDelChat,
} from '@/lib/admin/agent-api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtCOP, fmtDateTime, USD_TO_COP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'
import { BarraDeFiltros, Buscador, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha'

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

function fuenteLegible(f: string): string {
  if (FUENTE_LEGIBLE[f]) return FUENTE_LEGIBLE[f]
  if (f.startsWith('grafo_inmobiliaria')) return 'relaciones de la inmobiliaria'
  if (f.startsWith('especialista:')) return `especialista de ${f.slice('especialista:'.length).replace(/[_-]/g, ' ')}`
  return f.replace(/[_-]/g, ' ')
}

const especialistaLegible = (e: string) => `especialista de ${e.replace(/[_-]/g, ' ')}`

/**
 * El costo del turno en pesos (el modelo cobra en dólares; Nico: «ninguna
 * pantalla con dólares»), a la tasa fija del admin. Menos de un peso se dice así.
 */
function costo(dolares: number | null | undefined): string {
  if (dolares == null || !Number.isFinite(dolares)) return '—'
  const cop = Math.round(dolares * USD_TO_COP)
  return cop > 0 && cop < 1 ? 'Menos de $ 1' : fmtCOP(cop)
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

/** Lo mismo que dicen las pastillas de «Cómo terminó», en texto (para el Excel). */
function comoTermino(t: TurnoDelChat): string {
  const fin = t.falla
    ? t.falla.motivo === 'sin_creditos'
      ? 'Se cortó: sin créditos'
      : 'Se cortó'
    : t.respuesta === null
      ? 'Respuesta sin guardar'
      : t.sinRespuesta
        ? 'Sin respuesta'
        : 'Respondió'
  return [
    fin,
    t.reformulada ? 'reformulada' : null,
    t.corregida ? 'corregida' : null,
    t.abandonada ? 'abandono' : null,
    t.pulgar === 'abajo' ? 'pulgar abajo' : t.pulgar === 'arriba' ? 'pulgar arriba' : null,
    t.cifraContradicha ? 'cifra contradicha' : null,
  ]
    .filter(Boolean)
    .join(' · ')
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
      <MonoLabel className="block">{etiqueta}</MonoLabel>
      <div className="text-body-sm text-fg mt-0.5">{children}</div>
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
                  <pre className="text-caption text-fg-muted whitespace-pre-wrap leading-snug max-h-72 overflow-y-auto font-sans">{t.respuesta}</pre>
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
                <Dato etiqueta="costo">{costo(t.costoUsd)}</Dato>
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
              <p className="text-caption text-fg-subtle">
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
    <Card className="space-y-2 p-5" data-testid="sugerencia">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={s.severidad === 'alta' ? 'bad' : 'warn'} dot>{s.severidad === 'alta' ? 'Prioridad alta' : 'Para revisar'}</Pill>
        <span className="font-medium text-fg">{s.hallazgo}</span>
      </div>
      <p className="text-body-sm leading-snug text-fg-muted">→ {s.accion}</p>
      {s.ejemplos.length > 0 && (
        <>
          <Button
            type="button"
            variant="link"
            size="sm"
            hideArrow
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
          >
            {abierta ? 'Ocultar los ejemplos' : `Ver ${s.ejemplos.length === 1 ? 'el ejemplo' : `los ${s.ejemplos.length} ejemplos`}`}
          </Button>
          {abierta && (
            <ul className="mt-2 space-y-1">
              {s.ejemplos.map((e) => (
                <li key={e.turnoId}>
                  <button
                    type="button"
                    onClick={() => onAbrir(e)}
                    className="rounded-sm text-left text-body-sm text-fg underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    «{e.pregunta}»{' '}
                    <span className="font-mono text-caption text-fg-subtle">
                      {e.inmobiliaria ?? e.agencyId.slice(0, 8)} · {fmtDateTime(e.fecha)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
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

  const { data, isLoading, error, refetch } = useApiQuery(
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
    { header: 'Fecha', texto: (t) => fmtDateTime(t.fecha), cell: (t) => <span className="tabular-nums whitespace-nowrap text-fg-muted">{fmtDateTime(t.fecha)}</span> },
    { header: 'Inmobiliaria', texto: (t) => t.inmobiliaria ?? t.agencyId, cell: (t) => <span title={t.agencyId}>{t.inmobiliaria ?? t.agencyId.slice(0, 8)}</span> },
    { header: 'Pregunta', texto: (t) => t.pregunta, cell: (t) => <span className="line-clamp-2 text-fg">{t.pregunta || '—'}</span>, className: 'min-w-[16rem]' },
    { header: 'Cómo terminó', texto: (t) => comoTermino(t), cell: (t) => <EstadoDelTurno t={t} /> },
    { header: 'Tardó', texto: (t) => segundos(t.ms), cell: (t) => <span className="tabular-nums">{segundos(t.ms)}</span>, align: 'right' },
    { header: 'Costo', texto: (t) => costo(t.costoUsd), cell: (t) => <span className="tabular-nums">{costo(t.costoUsd)}</span>, align: 'right' },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Preguntas del chat"
        description="Lo que le preguntan al chat las inmobiliarias, sin el correo de quién preguntó y con los números largos ocultos, y lo que conviene mejorar."
      />

      <Alert variant="info" role="note">
        Sólo la ve el equipo de producto de Leasefy, como dice la §16 de la política de tratamiento
        (versión 4.0). Las preguntas se guardan 12 meses.
      </Alert>

      {/* Filtros (viven en la URL). */}
      <Card className="p-4" data-testid="filtros">
        <BarraDeFiltros>
          <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria">
            <Desplegable
              id="filtro-inmobiliaria"
              aria-label="inmobiliaria"
              value={agencia}
              onChange={(v) => setFilters({ agencia: v || undefined }, { resetPage: true })}
              todas="Todas las inmobiliarias"
              opciones={[
                ...(data?.inmobiliarias ?? []).map((i) => ({
                  valor: i.agencyId,
                  nombre: `${i.nombre ?? i.agencyId.slice(0, 8)} (${i.preguntas})`,
                })),
                ...(agencia && !(data?.inmobiliarias ?? []).some((i) => i.agencyId === agencia)
                  ? [{ valor: agencia, nombre: agencia.slice(0, 8) }]
                  : []),
              ]}
            />
          </Filtro>
          <Filtro etiqueta="Desde" htmlFor="filtro-desde" className="sm:w-44">
            <CampoDeFecha id="filtro-desde" value={desde} onChange={(v) => setFilters({ desde: v || undefined }, { resetPage: true })} />
          </Filtro>
          <Filtro etiqueta="Hasta" htmlFor="filtro-hasta" className="sm:w-44">
            <CampoDeFecha id="filtro-hasta" value={hasta} onChange={(v) => setFilters({ hasta: v || undefined }, { resetPage: true })} />
          </Filtro>
          <Filtro etiqueta="Tema" htmlFor="filtro-tema">
            <Desplegable
              id="filtro-tema"
              aria-label="tema"
              value={tema}
              onChange={(v) => setFilters({ tema: v || undefined }, { resetPage: true })}
              todas="Todos los temas"
              opciones={(data?.temas ?? []).map((t) => ({ valor: t.tema, nombre: `${t.nombre} (${t.preguntas})` }))}
            />
          </Filtro>
          <form
            className="flex items-end gap-2 sm:min-w-64 sm:flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              setFilters({ q: texto.trim() || undefined }, { resetPage: true })
            }}
          >
            <Filtro etiqueta="Texto" htmlFor="filtro-texto" className="flex-1">
              <Buscador id="filtro-texto" value={texto} onChange={setTexto} placeholder="Palabras de la pregunta" aria-label="buscar en las preguntas" />
            </Filtro>
            <Button variant="outline" hideArrow type="submit">
              Buscar
            </Button>
          </form>
        </BarraDeFiltros>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip
            selected={sinRespuesta}
            onClick={() => setFilters({ sinRespuesta: sinRespuesta ? undefined : '1' }, { resetPage: true })}
          >
            Sólo sin respuesta
          </Chip>
          <Chip
            selected={pulgarAbajo}
            onClick={() => setFilters({ pulgarAbajo: pulgarAbajo ? undefined : '1' }, { resetPage: true })}
          >
            Sólo pulgar abajo
          </Chip>
          {(agencia || desde || hasta || tema || q || sinRespuesta || pulgarAbajo) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => {
                setTexto('')
                setFilters(
                  { agencia: undefined, desde: undefined, hasta: undefined, tema: undefined, q: undefined, sinRespuesta: undefined, pulgarAbajo: undefined },
                  { resetPage: true },
                )
              }}
            >
              Quitar los filtros
            </Button>
          )}
        </div>
      </Card>

      {isLoading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} onReintentar={refetch} />
      ) : !data || data.totales.preguntas === 0 ? (
        <EmptyBlock
          title="No hay preguntas en estas fechas"
          hint="Nadie le ha preguntado nada al chat en este rango, o el chat todavía no guarda sus preguntas en esta instalación."
        />
      ) : (
        <>
          {/* Resumen de la ventana. */}
          <MonoLabel className="block">
            Del {fechaLarga(diaDeBogota(data.ventana.desde))} al{' '}
            {/* Con «hasta», el micro corta a la medianoche del día siguiente; sin él, es ahora. */}
            {fechaLarga(hasta || diaDeBogota(data.ventana.hasta))}
            {data.ventana.truncado ? ' · las 5.000 más recientes' : ''}
          </MonoLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <KpiCard label="Preguntas" value={totales!.preguntas} hint={`${totales!.inmobiliarias} ${totales!.inmobiliarias === 1 ? 'inmobiliaria' : 'inmobiliarias'}`} />
            <KpiCard
              label="Sin respuesta"
              value={totales!.porcentajeSinRespuesta == null ? '—' : `${String(totales!.porcentajeSinRespuesta).replace('.', ',')} %`}
              hint={`${totales!.sinRespuesta} de ${totales!.preguntas}`}
              tone={(totales!.porcentajeSinRespuesta ?? 0) >= 25 ? 'bad' : 'default'}
            />
            <KpiCard label="Reformuladas" value={totales!.reformulaciones} />
            <KpiCard label="Abandonos" value={totales!.abandonos} />
            <KpiCard label="Se cortaron" value={totales!.fallas} tone={totales!.fallas > 0 ? 'warn' : 'default'} />
            <KpiCard
              label="Costo"
              value={totales!.turnosConCosto === 0 ? '—' : costo(totales!.costoUsd)}
              hint={totales!.turnosConCosto === 0 ? 'Todavía sin costo anotado' : `${totales!.turnosConCosto} turnos con costo`}
            />
          </div>

          {/* Sugerencias. */}
          <h2 className="text-subtitle font-semibold text-fg">Qué mejorar del chat</h2>
          {data.sugerencias.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">
              Nada que sugerir con estas preguntas: ningún tema pasa los umbrales (se necesitan al menos 5 preguntas de un tema).
            </p>
          ) : (
            <div className="space-y-2">
              {data.sugerencias.map((s) => (
                <TarjetaDeSugerencia key={s.id} s={s} onAbrir={setAbierto} />
              ))}
            </div>
          )}

          {/* Temas, especialistas y fuentes. */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <MonoLabel className="mb-2 block">Temas más preguntados</MonoLabel>
              <div className="flex flex-wrap gap-1">
                {data.temas.slice(0, 12).map((t) => (
                  <Chip
                    key={t.tema}
                    size="sm"
                    selected={tema === t.tema}
                    onClick={() => setFilters({ tema: tema === t.tema ? undefined : t.tema }, { resetPage: true })}
                  >
                    {t.nombre} · <span className="font-mono tabular-nums">{t.preguntas}</span>
                  </Chip>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <MonoLabel className="mb-2 block">Especialistas que más trabajan</MonoLabel>
              {data.especialistas.length === 0 ? (
                <span className="text-body-sm text-fg-subtle">Ningún especialista en estas preguntas</span>
              ) : (
                <ul className="text-body-sm space-y-0.5">
                  {data.especialistas.map((e) => (
                    <li key={e.nombre} className="flex justify-between gap-2">
                      <span>{especialistaLegible(e.nombre)}</span>
                      <span className="tabular-nums text-fg-muted">{e.veces}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <MonoLabel className="block mb-2">de dónde sacó la respuesta</MonoLabel>
              {data.fuentes.length === 0 ? (
                <span className="text-body-sm text-fg-subtle">sin fuentes anotadas</span>
              ) : (
                <ul className="text-body-sm space-y-0.5">
                  {data.fuentes.map((f) => (
                    <li key={f.nombre} className="flex justify-between gap-2">
                      <span>{fuenteLegible(f.nombre)}</span>
                      <span className="tabular-nums text-fg-muted">{f.veces}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Por semana e inmobiliaria. */}
          <MonoLabel className="block mb-3">por semana e inmobiliaria</MonoLabel>
          <div className="mb-8">
            <DataTable
              rows={data.resumen}
              getKey={(s) => `${s.semana}-${s.agencyId}`}
              columns={[
                { header: 'Semana del', orden: (s) => s.semana, ordenPrimero: 'desc', texto: (s) => fechaLarga(s.semana), cell: (s) => <span className="whitespace-nowrap">{fechaLarga(s.semana)}</span> },
                { header: 'Inmobiliaria', orden: (s) => s.inmobiliaria, texto: (s) => s.inmobiliaria ?? s.agencyId, cell: (s) => s.inmobiliaria ?? s.agencyId.slice(0, 8) },
                { header: 'Preguntas', orden: (s) => s.preguntas, ordenPrimero: 'desc', texto: (s) => s.preguntas, cell: (s) => <span className="tabular-nums">{s.preguntas}</span>, align: 'right' },
                {
                  header: 'Sin respuesta',
                  orden: (s) => s.porcentajeSinRespuesta,
                  ordenPrimero: 'desc',
                  texto: (s) => s.porcentajeSinRespuesta,
                  cell: (s) => (
                    <span className="tabular-nums">
                      {s.porcentajeSinRespuesta == null ? '—' : `${String(s.porcentajeSinRespuesta).replace('.', ',')} %`}
                    </span>
                  ),
                  align: 'right',
                },
                { header: 'Reformuladas', orden: (s) => s.reformulaciones, ordenPrimero: 'desc', texto: (s) => s.reformulaciones, cell: (s) => <span className="tabular-nums">{s.reformulaciones}</span>, align: 'right' },
                { header: 'Abandonos', orden: (s) => s.abandonos, ordenPrimero: 'desc', texto: (s) => s.abandonos, cell: (s) => <span className="tabular-nums">{s.abandonos}</span>, align: 'right' },
                { header: 'Se cortaron', orden: (s) => s.fallas, ordenPrimero: 'desc', texto: (s) => s.fallas, cell: (s) => <span className="tabular-nums">{s.fallas}</span>, align: 'right' },
                { header: 'Temas', texto: (s) => s.temas.map((t) => t.nombre).join(' · '), cell: (s) => <span className="text-fg-muted">{s.temas.map((t) => t.nombre).join(' · ') || '—'}</span> },
              ]}
              emptyTitle="Sin semanas"
              id="semanas"
              aria-label="Preguntas por semana e inmobiliaria"
              queSon={['semana', 'semanas']}
              filasPorPagina={10}
              exportar="chat-por-semana"
            />
          </div>

          {/* Las preguntas. */}
          <MonoLabel className="block mb-3">
            preguntas · más recientes primero · {data.total} {data.total === 1 ? 'pregunta' : 'preguntas'}
          </MonoLabel>
          <DataTable
            rows={data.filas}
            getKey={(t) => t.turnoId}
            columns={columnas}
            onRowClick={setAbierto}
            isLoading={isLoading}
            emptyTitle="Ninguna pregunta con estos filtros"
            emptyHint="Quita algún filtro para ver más."
            aria-label="Preguntas del chat"
            filaMarcada={(t) => t.turnoId === abierto?.turnoId}
            paginacion={{ page, total: data.total, pageSize: POR_PAGINA, onPage: setPage }}
            queSon={['pregunta', 'preguntas']}
            exportar="preguntas-del-chat"
            traerTodoParaElExcel={async () => {
              const todas: TurnoDelChat[] = []
              for (let pagina = 1; pagina <= 100; pagina++) {
                const r = await getChatPreguntas({
                  ...(agencia ? { agencyId: agencia } : {}),
                  ...(desde ? { desde } : {}),
                  ...(hasta ? { hasta } : {}),
                  ...(tema ? { tema } : {}),
                  ...(q ? { q } : {}),
                  sinRespuesta,
                  pulgarAbajo,
                  pagina,
                  limite: POR_PAGINA,
                })
                todas.push(...r.filas)
                if (r.filas.length === 0 || todas.length >= r.total || todas.length >= 5000) break
              }
              return todas
            }}
          />
        </>
      )}

      <DetalleDelTurno t={abierto} onClose={() => setAbierto(null)} />
    </div>
  )
}
