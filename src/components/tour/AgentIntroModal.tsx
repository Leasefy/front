'use client'

/**
 * AgentIntroModal — per-agent presentation card, rendered with the cadence
 * §Novedades `<FeatureAnnouncement>` (grainy aurora hero + glass Leasefy pill +
 * intro copy + "Empezar" CTA). Brand-photo hero was retired in favour of the
 * cadence aurora (Nico's call).
 *
 * The FIRST time the user enters an agent's workspace
 * (/panel/inmobiliaria/ai/<agente>/…) a centered announcement presents that
 * agent: what it does and how to work with it. Dismissal persists per agent in
 * localStorage (any close — backdrop, Escape or the CTA — marks it as seen).
 *
 * A11y: role=dialog + aria-label, Escape dismisses, focus lands on the dialog
 * on open and is restored on close.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FeatureAnnouncement } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'

export interface AgentIntroConfig {
  /** Agent id — also the localStorage suffix + i18n block name. */
  id: string
  /** Route prefix under which this agent's workspace lives. */
  pathPrefix: string
  titleKey: string
  descriptionKey: string
  image: string
}

// One DISTINCT brand image per agent (tour uses 02/09/15; free: 10-14, 16).
export const AGENT_INTROS: AgentIntroConfig[] = [
  {
    id: 'cobranza',
    pathPrefix: '/panel/inmobiliaria/ai/cobranza',
    titleKey: 'inmobiliaria.ai.intro.cobranza.title',
    descriptionKey: 'inmobiliaria.ai.intro.cobranza.description',
    image: '/images/features/leasefy-brand-01.jpg',
  },
  {
    id: 'cotizador',
    pathPrefix: '/panel/inmobiliaria/ai/asegurabilidad',
    titleKey: 'inmobiliaria.ai.intro.cotizador.title',
    descriptionKey: 'inmobiliaria.ai.intro.cotizador.description',
    image: '/images/features/leasefy-brand-03.jpg',
  },
  {
    id: 'avaluos',
    pathPrefix: '/panel/inmobiliaria/ai/avaluos',
    titleKey: 'inmobiliaria.ai.intro.avaluos.title',
    descriptionKey: 'inmobiliaria.ai.intro.avaluos.description',
    image: '/images/features/leasefy-brand-04.jpg',
  },
  {
    id: 'conciliacion',
    pathPrefix: '/panel/inmobiliaria/ai/conciliacion',
    titleKey: 'inmobiliaria.ai.intro.conciliacion.title',
    descriptionKey: 'inmobiliaria.ai.intro.conciliacion.description',
    image: '/images/features/leasefy-brand-05.jpg',
  },
  {
    id: 'estudio',
    pathPrefix: '/panel/inmobiliaria/ai/estudio',
    titleKey: 'inmobiliaria.ai.intro.estudio.title',
    descriptionKey: 'inmobiliaria.ai.intro.estudio.description',
    image: '/images/features/leasefy-brand-06.jpg',
  },
  {
    id: 'matching',
    pathPrefix: '/panel/inmobiliaria/ai/matching',
    titleKey: 'inmobiliaria.ai.intro.matching.title',
    descriptionKey: 'inmobiliaria.ai.intro.matching.description',
    image: '/images/features/leasefy-brand-07.jpg',
  },
  {
    id: 'pagos',
    pathPrefix: '/panel/inmobiliaria/ai/pagos',
    titleKey: 'inmobiliaria.ai.intro.pagos.title',
    descriptionKey: 'inmobiliaria.ai.intro.pagos.description',
    image: '/images/features/leasefy-brand-08.jpg',
  },
]

const STORAGE_PREFIX = 'leasefy.agent-intro.'

function isDismissed(id: string): boolean {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${id}`) === '1'
  } catch {
    return true // storage unavailable → never nag
  }
}

function persistDismissed(id: string): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1')
  } catch {
    /* storage unavailable — session-only dismissal */
  }
}

/**
 * Olvida el "ya la vi" de TODAS las novedades, para que vuelvan a presentarse.
 *
 * Existe porque el ajuste «volver a ver las novedades» sólo repone la
 * preferencia global: sin esto, cada agente seguiría marcado como visto en
 * localStorage y el botón no haría nada visible.
 */
export function resetAgentIntros(): void {
  try {
    for (const a of AGENT_INTROS) {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${a.id}`)
    }
  } catch {
    /* storage unavailable — nothing to reset */
  }
}

export interface AgentIntroModalProps {
  /** Current pathname (from usePathname in the host layout). */
  pathname: string
  /** Suppress while the panel tour is open/visible. */
  suppressed?: boolean
}

export function AgentIntroModal({ pathname, suppressed = false }: AgentIntroModalProps) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [visibleId, setVisibleId] = useState<string | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const agent = AGENT_INTROS.find((a) => pathname.startsWith(a.pathPrefix)) ?? null

  useEffect(() => {
    setMounted(true)
  }, [])

  // Open with a small delay on first visit to the agent's workspace.
  useEffect(() => {
    if (!mounted || suppressed || !agent) {
      setVisibleId(null)
      return
    }
    if (isDismissed(agent.id)) {
      setVisibleId(null)
      return
    }
    const timer = window.setTimeout(() => {
      prevFocusRef.current = document.activeElement as HTMLElement | null
      setVisibleId(agent.id)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [mounted, suppressed, agent])

  const dismiss = useCallback(() => {
    if (visibleId) persistDismissed(visibleId)
    setVisibleId(null)
    setTimeout(() => {
      prevFocusRef.current?.focus?.()
    }, 0)
  }, [visibleId])

  // Escape dismisses; focus lands on the dialog when it opens.
  useEffect(() => {
    if (!visibleId) return
    const raf = requestAnimationFrame(() => dialogRef.current?.focus())
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss()
      }
    }
    document.addEventListener('keydown', handler)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handler)
    }
  }, [visibleId, dismiss])

  if (!mounted || !visibleId || !agent || visibleId !== agent.id) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4 motion-reduce:transition-none"
      onClick={dismiss}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t(agent.titleKey)}
        className="outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <FeatureAnnouncement
          appName="Leasefy"
          appInitial="L"
          title={t(agent.titleKey)}
          description={t(agent.descriptionKey)}
          ctaLabel={t('inmobiliaria.ai.tour.finish')}
          onCta={dismiss}
          className="max-w-[calc(100vw-2rem)]"
        />
      </div>
    </div>,
    document.body,
  )
}
