import type { LedgerVignetteData } from '@/lib/landing/types'

/**
 * 3-column ledger table vignette. Ports the standalone's `VG.ledger`
 * renderer (`landing-standalone/index.html` ~L3711-3715, `.vg-ledger .lgr`).
 */
export function LedgerVignette({ data }: { data: LedgerVignetteData }) {
  return (
    <div className="landing-vg-ledger" data-testid="vg-ledger">
      <div className="landing-vg-ledger__row landing-vg-ledger__row--head">
        {data.columns.map((col, i) => (
          <span key={i}>{col}</span>
        ))}
      </div>
      {data.rows.map((row, i) => (
        <div className="landing-vg-ledger__row" key={i}>
          <b>{row.cells[0]}</b>
          <span>{row.cells[1]}</span>
          <span className={row.tone ? `landing-vg-ledger__cell--${row.tone}` : undefined}>{row.cells[2]}</span>
        </div>
      ))}
    </div>
  )
}
