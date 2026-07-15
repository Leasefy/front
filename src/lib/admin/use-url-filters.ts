'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * URL-as-state for admin screens: filters and the 0-indexed `page` live in the
 * query string so every table is shareable/bookmarkable (FRONT.md §4). Mirrors
 * the monolith's `<form method="GET">` pattern with controlled inputs.
 */
export function useUrlFilters() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const get = useCallback((key: string) => sp.get(key) ?? '', [sp])
  const page = Number(sp.get('page') ?? '0') || 0

  const setFilters = useCallback(
    (patch: Record<string, string | number | undefined | null>, opts?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '') next.delete(k)
        else next.set(k, String(v))
      }
      if (opts?.resetPage) next.delete('page')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [sp, router, pathname],
  )

  const setPage = useCallback((p: number) => setFilters({ page: p <= 0 ? undefined : p }), [setFilters])

  return { get, page, setFilters, setPage }
}
