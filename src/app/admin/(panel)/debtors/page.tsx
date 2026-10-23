'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ---------- Types ----------

interface DebtorRow {
  id: string
  full_name: string
  document_number: string | null
  phone_primary: string | null
  email: string | null
  legal_name: string | null
  calls_count: string // numeric as text from COUNT(*)::text
}

/**
 * Response for GET /debtors?q= (BACK.md §8.5).
 * Empty q short-circuits to { data: [] }. Non-paginated — capped at LIMIT 50.
 */
interface DebtorsResponse {
  data: DebtorRow[]
}

// ---------- Page ----------

/**
 * /debtors — cross-tenant PII search (BACK.md §8.5 · FRONT.md §6.28).
 *
 * Search is submit-triggered (NOT live) to avoid an audit-log row on each keystroke.
 * The backend writes agent.audit_log (action='debtor.search') BEFORE returning data.
 * Empty q → idle state, no fetch, no audit row.
 */
export default function DebtorsPage() {
  const router = useRouter()
  const { get, setFilters } = useUrlFilters()

  // URL is the source of truth for the committed search term.
  const committedQ = get('q')

  // Local input state — only pushed to URL on form submit.
  const [inputValue, setInputValue] = useState(committedQ)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setFilters({ q: inputValue.trim() })
    },
    [inputValue, setFilters],
  )

  const handleClear = useCallback(() => {
    setInputValue('')
    setFilters({ q: '' })
  }, [setFilters])

  // enabled=false when committed q is empty → no fetch, no audit row.
  const debtors = useApiQuery<DebtorsResponse>(
    (signal) => adminApi('/debtors', { query: { q: committedQ }, signal }),
    [committedQ],
    committedQ.length > 0,
  )

  const columns: Column<DebtorRow>[] = [
    {
      header: 'Nombre',
      orden: (r) => r.full_name,
      cell: (r) => <span className="text-body-sm font-medium text-fg">{r.full_name}</span>,
    },
    {
      header: 'Cédula',
      orden: (r) => r.document_number,
      cell: (r) => (
        <span className="font-mono text-caption text-fg-muted">{r.document_number ?? '—'}</span>
      ),
    },
    {
      header: 'Teléfono',
      cell: (r) => (
        <span className="font-mono text-caption text-fg-muted">{r.phone_primary ?? '—'}</span>
      ),
    },
    {
      header: 'Correo',
      orden: (r) => r.email,
      cell: (r) => <span className="text-caption text-fg-muted">{r.email ?? '—'}</span>,
    },
    {
      header: 'Inmobiliaria',
      orden: (r) => r.legal_name,
      cell: (r) => <span className="text-caption">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Llamadas',
      align: 'right',
      orden: (r) => Number(r.calls_count) || 0,
      ordenPrimero: 'desc',
      cell: (r) => (
        <span className="tabular-nums font-mono text-caption">{r.calls_count}</span>
      ),
    },
  ]

  // Ronda 26 (revisora r25): el buscador va DENTRO de la tabla (antes en otra tarjeta, con un rótulo que el
  // vacío repetía) y la fila se abre: lleva a sus llamadas. Se sigue buscando al enviar, no con cada tecla:
  // cada búsqueda queda registrada.
  const buscador = (
    <form className="flex w-full flex-wrap items-center gap-2" onSubmit={handleSubmit} role="search">
      <Input
        id="buscar-deudor"
        type="search"
        className="min-w-[220px] flex-1"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Nombre, cédula o teléfono"
        aria-label="Buscar un deudor por nombre, cédula o teléfono"
        autoComplete="off"
      />
      <Button size="sm" hideArrow type="submit" isLoading={debtors.isLoading && Boolean(committedQ)}>
        Buscar
      </Button>
      {committedQ ? (
        <Button size="sm" variant="outline" hideArrow type="button" onClick={handleClear}>
          Limpiar
        </Button>
      ) : null}
    </form>
  )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Deudores"
        description="Busca un deudor en todas las inmobiliarias; cada búsqueda queda registrada."
      />

      {debtors.data && debtors.data.data.length === 50 ? (
        <p className="text-caption text-fg-muted">Se muestran los primeros 50: afina la búsqueda.</p>
      ) : null}
      <DataTable
        columns={columns}
        rows={committedQ ? debtors.data?.data : []}
        getKey={(r) => r.id}
        isLoading={Boolean(committedQ) && debtors.isLoading}
        error={committedQ ? debtors.error : null}
        onReintentar={debtors.refetch}
        emptyTitle={committedQ ? `Nada con «${committedQ}»` : 'Escribe arriba a quién buscas'}
        emptyHint={
          committedQ
            ? 'Revisa la cédula o intenta con otro nombre.'
            : 'Son datos personales: hasta que busques no se muestra ni se registra nada.'
        }
        emptyIcon={<MagnifyingGlass weight="duotone" />}
        aria-label="Deudores encontrados"
        onRowClick={(r) => router.push(`/admin/calls?q=${encodeURIComponent(r.full_name)}`)}
        queSon={['deudor', 'deudores']}
        barra={buscador}
        filasPorPagina={10}
      />
    </div>
  )
}
