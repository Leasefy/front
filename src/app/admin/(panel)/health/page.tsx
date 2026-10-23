'use client'

import { useEffect } from 'react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { Button } from '@/components/ui/button'
import { legible } from '@/lib/admin/textos-del-admin'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import type { PillTone } from '@/lib/admin/types'

// ─── Types (co-located, per FRONT.md §6.21) ────────────────────────────────

type CheckStatus = 'ok' | 'degraded' | 'down' | 'unconfigured'
type CheckCategory = 'database' | 'external'

/** GET /api/v1/admin/health checks[] item (ADMIN-API-CONTRACT.md — Health). */
interface Check {
  name: string
  category: CheckCategory
  status: CheckStatus
  latency_ms: number | null
  detail?: string | null
  /** Env var required to enable this check (only present when status = unconfigured). */
  required_env?: string
}

/** GET /api/v1/admin/health → { status: worst-of-13, checks }. */
interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  checks: Check[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<CheckCategory, string> = {
  database: 'Base de datos',
  external: 'Proveedores',
}

const ESTADO: Record<CheckStatus, string> = {
  ok: 'Responde',
  degraded: 'Lento o con fallas',
  down: 'Caído',
  unconfigured: 'Sin configurar',
}

const ESTADO_GENERAL: Record<HealthResponse['status'], string> = {
  ok: 'Todo responde',
  degraded: 'Con fallas',
  down: 'Hay algo caído',
}

function statusTone(s: CheckStatus): PillTone {
  switch (s) {
    case 'ok':           return 'ok'
    case 'degraded':     return 'warn'
    case 'down':         return 'bad'
    case 'unconfigured': return 'muted'
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

/**
 * /health — si cada servicio responde (glow up, 22-10-2026): LA RESPUESTA en una
 * cifra (el estado general y cuántos responden) y la lista en una tabla con
 * pestañas; sin códigos ni inglés a la vista (antes «Status», «checks»,
 * «unconfigured» y el nombre de la variable de entorno).
 */
export default function HealthPage() {
  const { data, isLoading, error, refetch } = useApiQuery<HealthResponse>(
    (signal) => adminApi('/health', { signal }),
    [],
  )

  // Se vuelve a revisar sola cada 30 s.
  useEffect(() => {
    const id = setInterval(() => refetch(), 30_000)
    return () => clearInterval(id)
  }, [refetch])

  const all = data?.checks ?? []
  const counts = {
    ok:           all.filter((c) => c.status === 'ok').length,
    degraded:     all.filter((c) => c.status === 'degraded').length,
    down:         all.filter((c) => c.status === 'down').length,
    unconfigured: all.filter((c) => c.status === 'unconfigured').length,
  }

  const columnas: Column<Check>[] = [
    {
      header: 'Servicio',
      orden: (c) => c.name,
      texto: (c) => legible(c.name),
      cell: (c) => (
        <div className="min-w-0">
          <div className="font-medium text-fg">{legible(c.name)}</div>
          <div className="text-caption text-fg-muted">{CATEGORY_LABEL[c.category] ?? legible(c.category)}</div>
        </div>
      ),
    },
    {
      header: 'Estado',
      orden: (c) => ['down', 'degraded', 'unconfigured', 'ok'].indexOf(c.status),
      texto: (c) => ESTADO[c.status] ?? legible(c.status),
      cell: (c) => (
        <Pill tone={statusTone(c.status)} dot={c.status !== 'unconfigured'}>
          {ESTADO[c.status] ?? legible(c.status)}
        </Pill>
      ),
    },
    {
      header: 'Responde en',
      align: 'right',
      orden: (c) => c.latency_ms,
      ordenPrimero: 'desc',
      texto: (c) => c.latency_ms,
      cell: (c) => (
        <span className="font-mono text-caption tabular-nums text-fg-muted">{c.latency_ms != null ? `${c.latency_ms} ms` : '—'}</span>
      ),
    },
    {
      header: 'Detalle',
      texto: (c) => c.detail ?? '',
      cell: (c) => (
        <span className="text-caption text-fg-muted">
          {c.status === 'unconfigured' ? 'Falta configurarlo en el servidor.' : c.detail ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Salud del sistema"
        description="Si cada servicio de Leasefy responde. Se vuelve a revisar sola cada 30 segundos."
        acciones={
          <Button variant="outline" size="sm" hideArrow onClick={refetch} isLoading={isLoading} className="gap-2">
            {isLoading ? null : <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
            Revisar ahora
          </Button>
        }
      />

      {isLoading && !data ? <LoadingBlock label="Revisando los servicios" /> : null}
      {!isLoading && error && !data ? <ErrorBlock error={error} onReintentar={refetch} /> : null}

      {data ? (
        <>
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <CifraHeroe
              rotulo="Estado general"
              cifra={ESTADO_GENERAL[data.status] ?? legible(data.status)}
              contexto={`${counts.ok} de ${all.length} servicios responden bien`}
              tramos={[
                { clave: 'ok', etiqueta: 'Responden', monto: counts.ok, tono: 'exito', cifra: String(counts.ok), siempre: true },
                { clave: 'degraded', etiqueta: 'Lentos o con fallas', monto: counts.degraded, tono: 'aviso', cifra: String(counts.degraded), siempre: true },
                { clave: 'down', etiqueta: 'Caídos', monto: counts.down, tono: 'critico', cifra: String(counts.down), siempre: true },
                { clave: 'unconfigured', etiqueta: 'Sin configurar', monto: counts.unconfigured, tono: 'neutro', cifra: String(counts.unconfigured) },
              ]}
              total={all.length}
              tamano="mediana"
              data-testid="salud-estado-general"
            />
          </div>

          <DataTable
            columns={columnas}
            rows={all}
            getKey={(c) => c.name}
            aria-label="Servicios de Leasefy"
            queSon={['servicio', 'servicios']}
            paginar={false}
            segmentos={[
              { valor: 'todos', nombre: 'Todos', cumple: () => true },
              { valor: 'fallas', nombre: 'Con fallas', cumple: (c) => c.status === 'down' || c.status === 'degraded', tono: 'aviso' },
              { valor: 'sin-configurar', nombre: 'Sin configurar', cumple: (c) => c.status === 'unconfigured' },
            ]}
            ordenInicial={{ columna: 1, sentido: 'asc' }}
            exportar="salud-del-sistema"
            masEnElExcel={[{ header: 'Variable que falta', texto: (c) => c.required_env ?? '' }]}
            emptyTitle="Sin servicios que revisar"
          />
        </>
      ) : null}
    </div>
  )
}
