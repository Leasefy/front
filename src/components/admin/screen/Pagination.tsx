import { lastPage } from '@/lib/admin/types'

/** 0-indexed pager driven by the URL (`page` param). Shared across paginated screens. */
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number
  total: number
  pageSize: number
  onPage: (page: number) => void
}) {
  const last = lastPage(total, pageSize)
  if (total <= pageSize) return null

  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle tabular-nums">
        {from}–{to} de {total}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          ← Anterior
        </button>
        <span className="font-mono text-[11px] tabular-nums text-fg-muted px-2">
          {page + 1} / {last + 1}
        </span>
        <button className="btn" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Siguiente →
        </button>
      </div>
    </div>
  )
}
