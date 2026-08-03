import type { DocVignetteData } from '@/lib/landing/types'

/**
 * Checklist document vignette. Ports the standalone's `VG.doc` renderer
 * (`landing-standalone/index.html` ~L3716-3720, `.vg-doc`). A `✓` prefix on
 * every line is CSS-generated content (`.vg-doc .dl span::before`), not
 * markup, matching the standalone's rule.
 */
export function DocVignette({ data }: { data: DocVignetteData }) {
  return (
    <div className="landing-vg-doc" data-testid="vg-doc">
      <h4>{data.title}</h4>
      <div className="landing-vg-doc__lines">
        {data.lines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>
    </div>
  )
}
