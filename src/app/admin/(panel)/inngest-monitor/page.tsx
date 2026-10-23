'use client'

/**
 * /admin/inngest-monitor — las tareas programadas y los flujos por eventos.
 *
 * El back no le pregunta a Inngest: deduce si cada tarea corre por lo último
 * que dejó escrito en Postgres (`last_run`) y cuenta las corridas de 24 h de
 * cada flujo en `agent_execution_metrics` (ADMIN-API-CONTRACT.md).
 *
 * 20-10-2026 (Nico: «que las tablas tengan paginación, filtros y todo lo que
 * tienen las tablas de la plataforma»): las dos listas van en `DataTable`
 * (pestañas por estado, buscar, ordenar, Excel) y todo en español (antes:
 * «ok · stale · down · sin signal», «side-effect»).
 */

import { Clock, FlowArrow } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeLaFicha } from '@/components/pantalla/PestanasDeLaFicha'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { flujoDeLosAgentes, tareaProgramada } from '@/lib/admin/textos-del-admin'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

/** `last_run` null = la tarea no ha dejado ningún rastro en la base. */
interface CronRow {
  cron: string
  last_run: string | null
}

/** Corridas de 24 h por flujo. */
interface WorkflowRow {
  workflow_id: string
  run_count: number | string
}

/** GET /api/v1/admin/inngest-monitor */
interface InngestMonitorResponse {
  crons: CronRow[]
  workflowRuns: WorkflowRow[]
}

type EstadoDeLaTarea = 'al-dia' | 'atrasada' | 'detenida' | 'sin-rastro'

interface Tarea extends CronRow {
  estado: EstadoDeLaTarea
  horas: number | null
}

/** Horas desde un instante; `null` sin rastro. */
function horasDesde(iso: string | null, ahora = Date.now()): number | null {
  if (!iso) return null
  const ms = ahora - new Date(iso).getTime()
  return Number.isFinite(ms) ? ms / 3_600_000 : null
}

/** Menos de 26 h: al día · hasta 72 h: atrasada · más: detenida · sin rastro. */
function estadoDeLaTarea(horas: number | null): EstadoDeLaTarea {
  if (horas == null) return 'sin-rastro'
  if (horas < 26) return 'al-dia'
  if (horas <= 72) return 'atrasada'
  return 'detenida'
}

const NOMBRE: Record<EstadoDeLaTarea, string> = {
  'al-dia': 'Al día',
  atrasada: 'Atrasada',
  detenida: 'Detenida',
  'sin-rastro': 'Sin rastro',
}

const TONO: Record<EstadoDeLaTarea, PillTone> = {
  'al-dia': 'ok',
  atrasada: 'warn',
  detenida: 'bad',
  'sin-rastro': 'muted',
}

/** «hace 3 h», «hace 2 días». */
function haceCuanto(horas: number): string {
  if (horas < 1) return 'hace menos de 1 h'
  if (horas < 48) return `hace ${Math.round(horas)} h`
  return `hace ${Math.round(horas / 24)} días`
}

const SEGMENTOS_DE_TAREAS: Segmento<Tarea>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  ...(['al-dia', 'atrasada', 'detenida', 'sin-rastro'] as const).map((e) => ({
    valor: e,
    nombre: NOMBRE[e],
    cumple: (t: Tarea) => t.estado === e,
  })),
]

const corridas = (w: WorkflowRow) => Number(w.run_count) || 0

const SEGMENTOS_DE_FLUJOS: Segmento<WorkflowRow>[] = [
  { valor: 'todos', nombre: 'Todos', cumple: () => true },
  { valor: 'con', nombre: 'Corrieron', cumple: (w) => corridas(w) > 0 },
  { valor: 'sin', nombre: 'Sin corridas', cumple: (w) => corridas(w) === 0 },
]

const COLUMNAS_DE_TAREAS: Column<Tarea>[] = [
  {
    header: 'Tarea',
    cell: (t) => <span className="font-medium text-fg">{tareaProgramada(t.cron)}</span>,
    orden: (t) => t.cron,
    texto: (t) => tareaProgramada(t.cron),
  },
  {
    header: 'Último rastro en la base',
    cell: (t) =>
      t.last_run ? (
        // Ronda 26 (revisora r25): a 390 «(hace 6 días)» se cortaba en la tarjeta; ahora va en su propia línea.
        <span className="block font-mono text-caption text-fg-muted">
          <span className="whitespace-nowrap">{fmtDateTime(t.last_run)}</span>
          {t.horas != null ? <span className="block whitespace-nowrap text-fg-subtle">{haceCuanto(t.horas)}</span> : null}
        </span>
      ) : (
        <span className="text-fg-subtle">Nunca</span>
      ),
    orden: (t) => t.last_run ?? '',
    texto: (t) => (t.last_run ? fmtDateTime(t.last_run) : ''),
  },
  {
    header: 'Estado',
    cell: (t) => <Pill tone={TONO[t.estado]}>{NOMBRE[t.estado]}</Pill>,
    orden: (t) => ['detenida', 'atrasada', 'sin-rastro', 'al-dia'].indexOf(t.estado),
    texto: (t) => NOMBRE[t.estado],
  },
]

const COLUMNAS_DE_FLUJOS: Column<WorkflowRow>[] = [
  {
    header: 'Flujo',
    cell: (w) => <span className="font-medium text-fg">{flujoDeLosAgentes(w.workflow_id)}</span>,
    orden: (w) => w.workflow_id,
    texto: (w) => flujoDeLosAgentes(w.workflow_id),
  },
  {
    header: 'Corridas en 24 h',
    align: 'right',
    cell: (w) => (
      <span className={`font-mono text-caption tabular-nums ${corridas(w) > 0 ? 'text-success' : 'text-fg-subtle'}`}>
        {corridas(w)}
      </span>
    ),
    orden: corridas,
    ordenPrimero: 'desc',
    texto: corridas,
  },
]

export default function InngestMonitorPage() {
  const { data, isLoading, error, refetch } = useApiQuery<InngestMonitorResponse>(
    (signal) => adminApi('/inngest-monitor', { signal }),
    [],
  )

  const tareas: Tarea[] | undefined = data?.crons.map((c) => {
    const horas = horasDesde(c.last_run)
    return { ...c, horas, estado: estadoDeLaTarea(horas) }
  })
  const ningunaDejoRastro = Boolean(tareas?.length) && tareas!.every((t) => t.last_run == null)

  const cuenta = (e: EstadoDeLaTarea) => (tareas ?? []).filter((t) => t.estado === e).length

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Tareas programadas"
        description="Si cada tarea programada corre y cuántas veces corrió cada flujo en 24 h."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo se sabe" titulo="Las tareas programadas" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Se deduce de lo que cada tarea deja escrito en la base, no de Inngest.</p>
              <p>Al día: dejó rastro hace menos de 26 h. Atrasada: entre 26 y 72 h. Detenida: más de 72 h. Horas de Colombia.</p>
              <p>Para ver el último error, la cola y los reintentos de cada tarea hay que conectar la API de Inngest Cloud con su llave.</p>
            </div>
          </ParaEntenderMas>
        }
      />

      {ningunaDejoRastro ? (
        <Alert variant="warning">
          Ninguna tarea ha dejado rastro en la base. Revisa que Inngest esté corriendo y que sus llaves estén puestas en el back.
        </Alert>
      ) : null}

      {/* Glow up 22-10: LA RESPUESTA (cuántas tareas están al día) en una cifra con la barra por estado; las dos
          tablas en pestañas con su conteo. */}
      {tareas && tareas.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Tareas al día"
            cifra={`${cuenta('al-dia')} de ${tareas.length}`}
            // Ronda 26 (revisora r25): el contexto dice algo nuevo (antes repetía el conteo de la leyenda y de la
            // pestaña, con «1 detenidas»).
            contexto={
              cuenta('detenida') > 0
                ? `la más quieta dejó rastro ${haceCuanto(Math.max(...(tareas ?? []).filter((t) => t.estado === 'detenida').map((t) => t.horas ?? 0)))}`
                : 'ninguna detenida'
            }
            tramos={[
              { clave: 'al-dia', etiqueta: NOMBRE['al-dia'], monto: cuenta('al-dia'), tono: 'exito', cifra: String(cuenta('al-dia')) },
              { clave: 'atrasada', etiqueta: NOMBRE.atrasada, monto: cuenta('atrasada'), tono: 'aviso', cifra: String(cuenta('atrasada')) },
              { clave: 'detenida', etiqueta: NOMBRE.detenida, monto: cuenta('detenida'), tono: 'critico', cifra: String(cuenta('detenida')) },
              { clave: 'sin-rastro', etiqueta: NOMBRE['sin-rastro'], monto: cuenta('sin-rastro'), tono: 'neutro', cifra: String(cuenta('sin-rastro')) },
            ]}
            total={tareas.length}
            data-testid="tareas-al-dia"
          />
        </div>
      ) : null}

      <PestanasDeLaFicha
        etiqueta="Tareas y flujos"
        pestanas={[
          {
            id: 'tareas',
            etiqueta: 'Tareas programadas',
            cuenta: tareas?.length ?? null,
            contenido: (
        <DataTable
          id="tareas"
          columns={COLUMNAS_DE_TAREAS}
          rows={tareas}
          getKey={(t) => t.cron}
          isLoading={isLoading}
          error={error}
          onReintentar={refetch}
          emptyTitle="Sin tareas registradas"
          emptyIcon={<Clock weight="duotone" />}
          aria-label="Tareas programadas"
          queSon={['tarea', 'tareas']}
          buscar="Buscar una tarea"
          segmentos={SEGMENTOS_DE_TAREAS}
          ordenInicial={{ columna: 2, sentido: 'asc' }}
          exportar="tareas-programadas"
        />
            ),
          },
          {
            id: 'flujos',
            etiqueta: 'Flujos por eventos',
            cuenta: data?.workflowRuns.length ?? null,
            contenido: (
              <div className="space-y-3">
                <p className="text-body-sm text-fg-muted">Corren cuando pasa algo (un pago, una llamada, un mensaje), no a una hora fija.</p>
        <DataTable
          id="flujos"
          columns={COLUMNAS_DE_FLUJOS}
          rows={data?.workflowRuns}
          getKey={(w) => w.workflow_id}
          isLoading={isLoading}
          error={error}
          onReintentar={refetch}
          emptyTitle="Sin flujos registrados"
          emptyIcon={<FlowArrow weight="duotone" />}
          aria-label="Flujos por eventos"
          queSon={['flujo', 'flujos']}
          buscar="Buscar un flujo"
          segmentos={SEGMENTOS_DE_FLUJOS}
          ordenInicial={{ columna: 1, sentido: 'desc' }}
          exportar="flujos-por-eventos"
        />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
