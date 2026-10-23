'use client'

import { useRouter } from 'next/navigation'
import { SealCheck } from '@phosphor-icons/react'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtCOP, fmtFecha } from '@/lib/admin/format'
import { tipoDeDecision } from '@/lib/admin/textos-del-admin'
import { resumenDeLaDecision } from '@/lib/admin/resumen-de-la-decision'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { Pill } from '@/components/admin/Pill'

interface PendingRow {
  id: string
  tenant_id: string
  debtor_id: string
  decision_type: string
  // pg NUMERIC arrives as string (::text cast) — convert before math
  confidence_score: string | null
  model_used: string
  created_at: string
  debtor_name: string | null
  legal_name: string | null
  decision_payload: Record<string, unknown>
}

interface ApprovalsResponse {
  data: PendingRow[]
  facets: Array<{ decision_type: string; n: string }>
}

/** Cuánto lleva esperando: más de 3 días es urgente, más de 1 hay que mirarla. */
function tonoDeLaEspera(dias: number) {
  if (dias > 3) return 'bad' as const
  if (dias > 1) return 'warn' as const
  return 'neutral' as const
}

/** «5 h», «1 día», «3,2 días». */
function esperaEnPalabras(dias: number): string {
  if (dias < 1) return `${Math.max(1, Math.round(dias * 24))} h`
  const redondo = Math.round(dias * 10) / 10
  return `${redondo.toLocaleString('es-CO')} ${redondo === 1 ? 'día' : 'días'}`
}

/** /admin/approvals — la cola de la ley T-323/2024 (FRONT.md §6.11 · BACK.md §8.10). */
export default function ApprovalsPage() {
  const router = useRouter()
  const { get, setFilters } = useUrlFilters()
  const type = get('type')

  const { data, isLoading, error, refetch } = useApiQuery<ApprovalsResponse>(
    (signal) => adminApi('/approvals', { query: { type: type || undefined }, signal }),
    [type],
  )

  const facets = data?.facets ?? []
  const totalPending = facets.reduce((a, f) => a + parseInt(f.n, 10), 0)
  const ahora = Date.now()
  const diasDe = (r: PendingRow) => (ahora - new Date(r.created_at).getTime()) / 86_400_000
  const filas = data?.data ?? []
  const vencidas = filas.filter((r) => diasDe(r) > 3).length
  const paraMirar = filas.filter((r) => diasDe(r) > 1 && diasDe(r) <= 3).length
  const recientes = filas.length - vencidas - paraMirar

  // Ronda 26 (revisora r25): cada fila dice lo que propone con lo que YA trae la respuesta —antes «Ábrela
  // para ver lo que propone» en las 63— y la plata va en su columna, en mono. Sin «Confianza» (100 % en
  // todas: no decide nada; va al Excel).
  const resumen = (r: PendingRow) => resumenDeLaDecision(r.decision_type, r.decision_payload)
  const persona = (r: PendingRow) => r.debtor_name ?? resumen(r).persona
  const columnas: Column<PendingRow>[] = [
    {
      header: 'Decisión',
      className: 'min-w-[260px]',
      orden: (r) => tipoDeDecision(r.decision_type),
      texto: (r) => `${tipoDeDecision(r.decision_type)} · ${resumen(r).texto}`,
      cell: (r) => (
        <div className="min-w-0 max-w-md space-y-0.5">
          <span className="text-body-sm font-medium text-fg">{tipoDeDecision(r.decision_type)}</span>
          <p className="line-clamp-2 text-caption text-fg-muted">{resumen(r).texto}</p>
        </div>
      ),
    },
    {
      header: 'Deudor',
      orden: (r) => persona(r),
      texto: (r) => persona(r) ?? 'Sin nombre',
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-body-sm text-fg">{persona(r) ?? 'Sin nombre'}</div>
          <div className="text-caption text-fg-muted">{r.legal_name ?? 'Sin inmobiliaria'}</div>
        </div>
      ),
    },
    {
      header: 'Esperando',
      orden: (r) => r.created_at,
      texto: (r) => esperaEnPalabras(diasDe(r)),
      cell: (r) => (
        <Pill tone={tonoDeLaEspera(diasDe(r))} dot>
          {esperaEnPalabras(diasDe(r))}
        </Pill>
      ),
    },
    {
      header: 'Valor',
      align: 'right',
      orden: (r) => resumen(r).montoCop,
      texto: (r) => resumen(r).montoCop,
      cell: (r) => {
        const monto = resumen(r).montoCop
        return monto == null ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          <span className="whitespace-nowrap font-mono tabular-nums text-fg">{fmtCOP(monto)}</span>
        )
      },
    },
    {
      header: 'Desde',
      align: 'right',
      orden: (r) => r.created_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtFecha(r.created_at),
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtFecha(r.created_at)}</span>
      ),
    },
  ]

  // Pestañas por tipo DENTRO de la tabla (antes un desplegable), sólo con dos tipos o más: con uno solo,
  // «Todas 63 · Cobro retenido 63» repetiría la cifra. Se arman sobre lo que llegó, así que sólo cuando llegó
  // todo; si la cola pasa de 100, queda el filtro del servidor (lo que no llegó también se puede pedir).
  const llegoTodo = data != null && filas.length >= totalPending
  const segmentos: Segmento<PendingRow>[] | undefined =
    llegoTodo && !type && facets.length > 1
      ? [
          { valor: 'todas', nombre: 'Todas', cumple: () => true },
          ...[...facets]
            .sort((x, y) => parseInt(y.n, 10) - parseInt(x.n, 10))
            .map((f) => ({
              valor: f.decision_type,
              nombre: tipoDeDecision(f.decision_type),
              cumple: (r: PendingRow) => r.decision_type === f.decision_type,
            })),
        ]
      : undefined
  const montoEnJuego = filas.reduce((a, r) => a + (resumen(r).montoCop ?? 0), 0)

  const todasViejas = vencidas > 0 && vencidas === filas.length
  const contexto = [
    todasViejas
      ? 'todas llevan más de 3 días'
      : vencidas > 0
        ? `${vencidas.toLocaleString('es-CO')} ${vencidas === 1 ? 'lleva' : 'llevan'} más de 3 días`
        : 'ninguna lleva más de 3 días',
    montoEnJuego > 0 ? `${fmtCOP(montoEnJuego)} en juego` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Aprobaciones"
        description="Lo que un agente propone con efecto legal espera aquí un visto bueno antes de ejecutarse."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="La cola de aprobaciones" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Toda decisión de un agente con efecto legal (un cobro retenido por el Piloto, una carta prejurídica,
                un reclamo a la aseguradora, pasar un caso a jurídico) se queda aquí hasta que una persona la revisa:
                así lo pide la sentencia T-323 de 2024.
              </p>
              <p>
                Cada decisión se abre y se decide una por una: aprobarla, cambiarla o pasarla a un abogado. Así queda
                constancia de quién la decidió y por qué.
              </p>
              <p>Primero van las que llevan más tiempo esperando; las de más de 3 días van en rojo.</p>
            </div>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (cuántas esperan) con la barra por espera. Ronda 26: si todas llevan más
          de 3 días, sin barra ni leyenda (una sola tajada repetía la cifra), y con la plata en juego. */}
      {data && totalPending > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Esperan un visto bueno"
            cifra={totalPending.toLocaleString('es-CO')}
            contexto={contexto}
            tramos={
              todasViejas || filas.length === 0
                ? undefined
                : [
                    { clave: 'vencidas', etiqueta: 'Más de 3 días', monto: vencidas, tono: 'critico', cifra: vencidas.toLocaleString('es-CO') },
                    { clave: 'mirar', etiqueta: 'De 1 a 3 días', monto: paraMirar, tono: 'aviso', cifra: paraMirar.toLocaleString('es-CO') },
                    { clave: 'recientes', etiqueta: 'Menos de 1 día', monto: recientes, tono: 'neutro', cifra: recientes.toLocaleString('es-CO') },
                  ]
            }
            total={todasViejas ? undefined : filas.length}
            data-testid="aprobaciones-esperando"
          />
        </div>
      ) : null}

      <DataTable
        columns={columnas}
        rows={data?.data}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="No hay decisiones esperando"
        emptyHint="Cuando un agente proponga algo con efecto legal, aparece aquí para que alguien lo apruebe."
        emptyIcon={<SealCheck weight="duotone" />}
        emptyTono="exito"
        aria-label="Cola de aprobaciones"
        onRowClick={(r) => router.push(`/admin/approvals/${r.id}`)}
        queSon={['decisión', 'decisiones']}
        buscar="Deudor, inmobiliaria o detalle"
        textoExtra={(r) => `${r.legal_name ?? ''} ${r.model_used}`}
        segmentos={segmentos}
        cifraDelCelular="Esperando"
        filtrosEnLaUrl={['type']}
        ordenInicial={{ columna: 2, sentido: 'asc' }}
        exportar="aprobaciones-pendientes"
        masEnElExcel={[
          { header: 'Inmobiliaria', texto: (r) => r.legal_name },
          {
            header: 'Confianza (%)',
            texto: (r) => (r.confidence_score != null ? Math.round(Number(r.confidence_score) * 100) : null),
          },
          { header: 'Modelo', texto: (r) => r.model_used },
        ]}
        barra={
          // Sólo cuando la cola pasa de lo que llega (100) o ya hay un tipo puesto: el filtro del servidor.
          !llegoTodo || type ? (
            <BarraDeFiltros>
              <Filtro etiqueta="Tipo de decisión">
                <Desplegable
                  value={type}
                  onChange={(v) => setFilters({ type: v, page: undefined })}
                  todas={`Todas (${totalPending.toLocaleString('es-CO')})`}
                  aria-label="Tipo de decisión"
                  opciones={facets.map((f) => ({ valor: f.decision_type, nombre: `${tipoDeDecision(f.decision_type)} (${f.n})` }))}
                />
              </Filtro>
            </BarraDeFiltros>
          ) : undefined
        }
      />
      {data && data.data.length >= 100 ? (
        <p className="text-caption text-fg-subtle">Se muestran las 100 más viejas; el resto aparece a medida que se decidan.</p>
      ) : null}
    </div>
  )
}
