import type { RowsVignetteData } from '@/lib/landing/types'

/**
 * Label→value rows vignette. Ports the standalone's `VG.rows` renderer
 * (`landing-standalone/index.html` ~L3690-3694, `.srow` cards).
 */
export function RowsVignette({ data }: { data: RowsVignetteData }) {
  return (
    <div className="landing-vg-rows" data-testid="vg-rows">
      {data.rows.map((row, i) => (
        <div className="landing-vg-rows__row" key={`${row.label}-${i}`}>
          <span>{row.label}</span>
          <b
            className={
              row.tone
                ? `landing-vg-rows__value landing-vg-rows__value--${row.tone}`
                : 'landing-vg-rows__value'
            }
          >
            {row.value}
          </b>
        </div>
      ))}
    </div>
  )
}
