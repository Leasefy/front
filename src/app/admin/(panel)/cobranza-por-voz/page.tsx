'use client'

/**
 * `/admin/cobranza-por-voz` — el arranque de la cobranza por voz: las inmobiliarias conectadas a Mori,
 * cuándo llamó y cuándo cobró por primera vez.
 *
 * Ronda 30 (Nico, 23-10-2026): antes era una pestaña de «Inmobiliarias nuevas»; es otra pregunta, así que
 * tiene su propia pantalla. Mismos datos y la misma llamada (`GET /admin/onboarding`, `liveAgencies`).
 */

import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtFecha } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'

/** La cobranza por voz de una inmobiliaria: cuándo llamó y cobró Mori por primera vez. */
interface ArranqueDeLaCobranza {
  tenant_id: string
  legal_name: string
  created_at: string
  first_call: string | null
  first_payment: string | null
}

interface RespuestaDelOnboarding {
  liveAgencies: ArranqueDeLaCobranza[]
}

const fecha = (iso: string | null) =>
  iso ? (
    <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtFecha(iso)}</span>
  ) : (
    <span className="text-caption text-fg-subtle">Todavía no</span>
  )

export default function CobranzaPorVozPage() {
  const router = useRouter()
  const { data, isLoading, error, refetch } = useApiQuery<RespuestaDelOnboarding>(
    (signal) => adminApi('/onboarding', { signal }),
    [],
  )

  const columnasDeLaVoz: Column<ArranqueDeLaCobranza>[] = [
    { header: 'Inmobiliaria', orden: (r) => r.legal_name, texto: (r) => r.legal_name, cell: (r) => <span className="font-medium text-fg">{r.legal_name}</span> },
    { header: 'Se conectó', orden: (r) => r.created_at, ordenPrimero: 'desc', texto: (r) => fmtFecha(r.created_at), cell: (r) => fecha(r.created_at) },
    { header: 'Primera llamada', orden: (r) => r.first_call, ordenPrimero: 'desc', texto: (r) => (r.first_call ? fmtFecha(r.first_call) : 'Todavía no'), cell: (r) => fecha(r.first_call) },
    { header: 'Primer pago', orden: (r) => r.first_payment, ordenPrimero: 'desc', texto: (r) => (r.first_payment ? fmtFecha(r.first_payment) : 'Todavía no'), cell: (r) => fecha(r.first_payment) },
    {
      header: 'Va en',
      orden: (r) => (r.first_payment ? 2 : r.first_call ? 1 : 0),
      texto: (r) => (r.first_payment ? 'Ya cobró' : r.first_call ? 'Ya llamó' : 'Conectada'),
      cell: (r) =>
        r.first_payment ? (
          <Pill tone="ok" dot>
            Ya cobró
          </Pill>
        ) : r.first_call ? (
          <Pill tone="neutral" dot>
            Ya llamó
          </Pill>
        ) : (
          <Pill tone="neutral">Conectada</Pill>
        ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Cobranza por voz"
        description="Las inmobiliarias conectadas a Mori: cuándo llamó y cuándo cobró por primera vez. Toca una para ver su ficha."
      />
      <section className="space-y-3" aria-label="Arranque de la cobranza por voz">
        <DataTable
          columns={columnasDeLaVoz}
          rows={data?.liveAgencies}
          getKey={(r) => r.tenant_id}
          isLoading={isLoading}
          error={error}
          onReintentar={refetch}
          emptyTitle="Ninguna inmobiliaria conectada a la cobranza por voz"
          aria-label="Arranque de la cobranza por voz"
          onRowClick={(r) => router.push(`/admin/tenants/${r.tenant_id}`)}
          id="voz"
          queSon={['inmobiliaria', 'inmobiliarias']}
          buscar="Buscar inmobiliaria"
          filasPorPagina={10}
          ordenInicial={{ columna: 1, sentido: 'desc' }}
          exportar="arranque-cobranza-por-voz"
        />
      </section>
    </div>
  )
}
