'use client'

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
      cell: (r) => <span className="font-medium text-fg">{r.full_name}</span>,
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

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Deudores"
        description="Busca un deudor por nombre, cédula o teléfono en todas las inmobiliarias. Son datos personales: cada búsqueda queda registrada con tu correo antes de mostrar resultados."
      />

      {/* Se busca al enviar, no con cada tecla: cada búsqueda queda registrada. */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4" onSubmit={handleSubmit}>
        <label className="min-w-[240px] flex-1" htmlFor="buscar-deudor">
          <span className="mb-1.5 block text-body-sm font-medium text-fg">Nombre, cédula o teléfono</span>
          <Input
            id="buscar-deudor"
            type="search"
            className="w-full"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ej.: 1234567 o 300 123 4567"
            autoComplete="off"
          />
        </label>
        <Button hideArrow type="submit">
          Buscar
        </Button>
        {committedQ && (
          <Button variant="outline" hideArrow type="button" onClick={handleClear}>
            Limpiar
          </Button>
        )}
      </form>

      {!committedQ ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-fg-muted">
          Escribe un nombre, una cédula o un teléfono. Hasta que busques no se muestra ni se registra nada.
        </p>
      ) : (
        <>
          {debtors.data && (
            <p className="text-caption text-fg-muted">
              {debtors.data.data.length === 1 ? '1 resultado' : `${debtors.data.data.length} resultados`}
              {debtors.data.data.length === 50 && ' (se muestran los primeros 50: afina la búsqueda)'}
            </p>
          )}
          <DataTable
            columns={columns}
            rows={debtors.data?.data}
            getKey={(r) => r.id}
            isLoading={debtors.isLoading}
            error={debtors.error}
            emptyTitle={`Nada con «${committedQ}»`}
            emptyHint="Revisa la cédula o intenta con otro nombre."
            aria-label="Deudores encontrados"
            queSon={['deudor', 'deudores']}
            filasPorPagina={10}
          />
        </>
      )}
    </div>
  )
}
