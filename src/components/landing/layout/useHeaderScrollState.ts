'use client'

import { useEffect, useState } from 'react'

const SOLID_THRESHOLD_PX = 24

interface HeaderScrollState {
  solid: boolean
}

/**
 * Header state machine seam. `solid` toggles once the user scrolls past
 * ~24px — replaces the standalone port's `onScrollHdr`/`__syncHdr`
 * pair. Internal pages (no dark hero to sit over) force `solid` from
 * first paint via `forceSolid`.
 */
export function useHeaderScrollState(forceSolid = false): HeaderScrollState {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (forceSolid) return

    function handleScroll() {
      setScrolled(window.scrollY > SOLID_THRESHOLD_PX)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [forceSolid])

  return { solid: forceSolid || scrolled }
}
