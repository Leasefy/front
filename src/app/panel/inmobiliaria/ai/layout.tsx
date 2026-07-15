'use client'

/**
 * AI panel layout — Phase 38 plan 38-06 (D-38-07).
 *
 * Hosts the PanelTour auto-trigger for any /panel/inmobiliaria/ai/* route.
 * Renders its children verbatim; the only behavior added is:
 *   1. Reads tourDismissed from PanelPrefsContext.
 *   2. When tourDismissed === false, fires the tour after a 500ms delay
 *      (let realtime channels + per-page hydration settle first).
 *   3. Selects isHub via usePathname() — true only on /panel/inmobiliaria/ai
 *      exactly, so sub-pages get the sidebar-link variant of TOUR_STEPS.
 *
 * Dismissal persists via PanelPrefsContext.setTourDismissed(true), which
 * writes localStorage and fires the PATCH /api/agency/:id/members/me/preferences
 * endpoint (D-38-06 hybrid persistence).
 *
 * Refs:
 *   - .planning/phases/38-polish-empty-states-onboarding-a11y/38-CONTEXT.md (D-38-07)
 *   - .planning/phases/38-polish-empty-states-onboarding-a11y/38-06-PLAN.md
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext'
import { PanelTour } from '@/components/tour/PanelTour'
import { AgentIntroModal } from '@/components/tour/AgentIntroModal'
import { WorkspaceNav } from '@/components/inmobiliaria/ai/WorkspaceNav'

const HUB_PATHNAME = '/panel/inmobiliaria/ai'

export default function AiLayout({ children }: { children: React.ReactNode }) {
  const { tourDismissed, setTourDismissed } = usePanelPrefs()
  const pathname = usePathname()
  const isHub = pathname === HUB_PATHNAME
  const [showTour, setShowTour] = useState(false)

  // Auto-trigger logic (D-38-07): only fire when context has hydrated AND
  // the user has not yet dismissed. Wait 500ms after mount so any per-page
  // realtime subscription (SSE / Supabase channels) settles first.
  useEffect(() => {
    if (tourDismissed !== false) return
    const timer = window.setTimeout(() => setShowTour(true), 500)
    return () => window.clearTimeout(timer)
  }, [tourDismissed])

  // If the user relaunches the tour via the user-menu link (which sets
  // tourDismissed → false in session-only state), this effect picks it up
  // again automatically because the dependency is tourDismissed.

  const handleDismiss = () => {
    // Close immediately — never block the UI on the PATCH.
    setShowTour(false)
    // Persist asynchronously (D-38-06: writes localStorage + DB).
    void setTourDismissed(true)
  }

  return (
    <>
      {/* In-workspace tabs — the agent's functions live here now, not in the
          global sidebar. Self-hides on the AI hub and outside known agents. */}
      <WorkspaceNav />
      {children}
      <PanelTour
        isOpen={showTour}
        onDismiss={handleDismiss}
        isHub={isHub}
      />
      {/* Per-agent presentation card (first visit to each agent workspace).
          Suppressed while the panel tour is open or still pending, so the two
          announcements never stack. */}
      <AgentIntroModal
        pathname={pathname}
        suppressed={showTour || tourDismissed === false}
      />
    </>
  )
}
