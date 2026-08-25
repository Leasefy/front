/**
 * /avaluo/reporte/[slug] — RETIRED in `front`.
 *
 * The report landing now runs on the avalúo micro
 * (`avaluos.leasefy.co/avaluo/reporte/<slug>`) — see
 * `.orchestration/tasks/T-0003-avaluo-review-gated-landing/contract.md`.
 * Every delivery e-mail sent before this route was retired links here with
 * `?token=<capability>`, so this route MUST keep answering: it forwards to
 * the same slug on the micro, preserving that token, instead of 404ing on a
 * link a tenant already received.
 *
 * A temporary redirect (307), not permanent (308): a 308 is cached
 * indefinitely by browsers, which would make this routing decision
 * effectively irreversible for anyone who ever followed an old link.
 * `redirect()` from `next/navigation` issues exactly that (307) outside a
 * Server Action — do not swap it for `permanentRedirect()`.
 *
 * When the micro's base URL isn't configured, `avaluoReportRedirectTarget`
 * returns `null` and this route answers `notFound()` rather than building a
 * malformed or self-looping Location (see `report-redirect.ts`).
 */

import { notFound, redirect } from 'next/navigation'
import { avaluoReportRedirectTarget } from '@/lib/avaluo/report-redirect'

interface Props {
  params: { slug: string }
  searchParams?: { token?: string | string[] }
}

function readToken(searchParams: Props['searchParams']): string | null {
  const value = searchParams?.token
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

export default function ReporteAvaluoRedirectPage({ params, searchParams }: Props) {
  const target = avaluoReportRedirectTarget(params.slug, readToken(searchParams))
  if (target === null) notFound()
  redirect(target)
}
