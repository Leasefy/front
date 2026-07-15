'use client'

import { useState, useCallback } from 'react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'

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
      cell: (r) => <span className="font-medium text-fg">{r.full_name}</span>,
    },
    {
      header: 'Cédula',
      cell: (r) => (
        <span className="font-mono text-xs text-fg-muted">{r.document_number ?? '—'}</span>
      ),
    },
    {
      header: 'Teléfono',
      cell: (r) => (
        <span className="font-mono text-xs text-fg-muted">{r.phone_primary ?? '—'}</span>
      ),
    },
    {
      header: 'Email',
      cell: (r) => <span className="text-xs text-fg-muted">{r.email ?? '—'}</span>,
    },
    {
      header: 'Agencia',
      cell: (r) => <span className="text-xs">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Llamadas',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-xs">{r.calls_count}</span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <PageHeader
        label="21 · debtors"
        title="Búsqueda de deudores"
        description="Datos sensibles. Cada búsqueda queda registrada en audit_log (action='debtor.search') antes de devolver resultados. Sin búsqueda, sin filas."
      />

      {/* PII audit notice */}
      <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
        <span className="inline-block w-2 h-2 bg-warn" />
        PII — acceso auditado · audit_log.action=&apos;debtor.search&apos;
      </div>

      {/* Search form — submit-triggered to avoid audit log spam on keystrokes */}
      <form className="card p-4 mb-6 flex gap-3 items-end" onSubmit={handleSubmit}>
        <label className="flex-1">
          <span className="block mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            nombre · cédula · teléfono
          </span>
          <input
            type="search"
            className="input w-full"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="ej: 1234567 o +57300…"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Buscar →
        </button>
        {committedQ && (
          <button type="button" className="btn" onClick={handleClear}>
            × limpiar
          </button>
        )}
      </form>

      {/* Idle state — no search yet */}
      {!committedQ ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-fg-muted">
            Ingresá un término para encontrar deudores.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mt-2">
            sin búsqueda · sin filas · sin auditoría
          </p>
        </div>
      ) : (
        <>
          {debtors.data && (
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
              resultados · {debtors.data.data.length}
              {debtors.data.data.length === 50 && ' (cap 50)'}
            </div>
          )}
          <DataTable
            columns={columns}
            rows={debtors.data?.data}
            getKey={(r) => r.id}
            isLoading={debtors.isLoading}
            error={debtors.error}
            emptyTitle={`Sin resultados para "${committedQ}"`}
            emptyHint="Revisá la cédula o intentá con otro nombre."
          />
        </>
      )}
    </div>
  )
}
