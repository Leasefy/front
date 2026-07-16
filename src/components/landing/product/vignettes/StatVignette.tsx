import type { StatVignetteData } from '@/lib/landing/types'

/**
 * Display-figure vignette. Ports the standalone's `VG.stat` renderer
 * (`landing-standalone/index.html` ~L3708-3710, `.vg-stat`).
 */
export function StatVignette({ data }: { data: StatVignetteData }) {
  return (
    <div className="landing-vg-stat" data-testid="vg-stat">
      {/*
       * `big` is static, developer-authored copy (never user input) that may
       * carry a literal `<em>` for inline emphasis, ported verbatim from the
       * standalone (e.g. "Día <em>1</em>") — see types.ts
       * StatVignetteData.big doc comment. Safe to inject directly: this
       * string never originates from a user or the backend.
       */}
      <span
        className="landing-vg-stat__big"
        data-testid="vg-stat-big"
        dangerouslySetInnerHTML={{ __html: data.big }}
      />
      <span className="landing-vg-stat__label">{data.label}</span>
      {data.sub && <span className="landing-vg-stat__sub">{data.sub}</span>}
    </div>
  )
}
