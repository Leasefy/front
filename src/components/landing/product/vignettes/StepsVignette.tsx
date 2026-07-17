import type { StepsVignetteData } from '@/lib/landing/types'

/**
 * Vertical timeline vignette. Ports the standalone's `VG.steps` renderer
 * (`landing-standalone/index.html` ~L3703-3707, `.vg-steps .st`).
 */
export function StepsVignette({ data }: { data: StepsVignetteData }) {
  return (
    <div className="landing-vg-steps" data-testid="vg-steps">
      {data.steps.map((step, i) => (
        <div
          className={
            step.status ? `landing-vg-steps__item landing-vg-steps__item--${step.status}` : 'landing-vg-steps__item'
          }
          key={i}
        >
          <span className="landing-vg-steps__dot" aria-hidden="true" />
          <div>
            <b className="landing-vg-steps__title">{step.title}</b>
            {step.meta && <span className="landing-vg-steps__meta">{step.meta}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
