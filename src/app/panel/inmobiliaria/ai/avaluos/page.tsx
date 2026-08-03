'use client'

/**
 * /panel/inmobiliaria/ai/avaluos — the ONE canonical agency Avalúos workspace.
 *
 * Consolidates the three former avalúo pages into a single real, back-connected
 * page (the old /avaluos and /avaluos-ia routes now redirect here):
 *
 *  - "Solicitar avalúo" mints a SHAREABLE wizard link (`avaluosApi.solicitar`)
 *    the agency sends to its client; the certificate is issued in the agency's
 *    name. The link is the primary output — NOT an auto-redirect.
 *  - "Casos por etapa / Mis solicitudes" reads the agency's own certificates by
 *    lifecycle state (`useAgencyAvaluos`) — the SAME closed set the avalúo micro
 *    exposes (borrador|en_revisión|firmado|rechazado|entregado).
 *  - "Actividad reciente" shows the latest requests, unfiltered.
 *
 * PRODUCT REALITY (legal-sensitive copy): this is a REMOTE "estimación de valor
 * referencial" generated with AI — there is NO physical visit (the certificate
 * itself states "No se realizó visita física") — and it is reviewed and signed
 * by a Leasefy reviewer. The copy below must never imply a site visit.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  Copy,
  ChartLineUp,
  DownloadSimple,
  FileMagnifyingGlass,
  SealCheck,
  ShareNetwork,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/data-display/EmptyState'
import { PageGuard } from '@/components/auth/PageGuard'
import { useAgencyAvaluos } from '@/lib/hooks/useInmobiliaria'
import { avaluosApi } from '@/lib/api/inmobiliaria.service'
import { ApiError } from '@/lib/api/client'
import { formatCurrency, formatDate } from '@/lib/format'

// ---------------------------------------------------------------------------
// State metadata — the real certificate lifecycle states, the SAME closed set
// the avalúo micro exposes. Mirrors the admin `avaluo-states.ts` template,
// mapped to the panel's own Badge variants.
// ---------------------------------------------------------------------------

const AVALUO_STATES = [
  'borrador',
  'en_revisión',
  'firmado',
  'rechazado',
  'entregado',
] as const

type AvaluoStateValue = (typeof AVALUO_STATES)[number]

const STATE_META: Record<
  AvaluoStateValue,
  { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  'en_revisión': { label: 'En revisión', variant: 'warning' },
  firmado: { label: 'Firmado', variant: 'success' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
  entregado: { label: 'Entregado', variant: 'default' },
}

/** Presentation for a state; an unknown value degrades to a neutral pill. */
function stateMeta(state: string): {
  label: string
  variant: React.ComponentProps<typeof Badge>['variant']
} {
  return STATE_META[state as AvaluoStateValue] ?? { label: state, variant: 'secondary' }
}

/** Filter tabs: "Todos" ('' → no state filter) + the real lifecycle states. */
const STATE_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  ...AVALUO_STATES.map((s) => ({ value: s, label: STATE_META[s].label })),
]

// ---------------------------------------------------------------------------
// "¿Cómo funciona?" — the real, truthful journey (no site visit).
// ---------------------------------------------------------------------------

const COMO_FUNCIONA_STEPS: { icon: Icon; title: string; desc: string }[] = [
  {
    icon: ShareNetwork,
    title: 'Generás y compartís el link',
    desc: 'Enviás el link a tu cliente; se cargan los datos del inmueble y el pago en línea.',
  },
  {
    icon: ChartLineUp,
    title: 'Estimación con datos de mercado',
    desc: 'El motor cruza datos del mercado y genera la estimación de valor referencial, sin visita física.',
  },
  {
    icon: SealCheck,
    title: 'Revisión y firma',
    desc: 'Un revisor de Leasefy revisa la estimación y firma el certificado.',
  },
  {
    icon: DownloadSimple,
    title: 'Certificado firmado',
    desc: 'Descargás el certificado firmado y llega al correo de la inmobiliaria.',
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AvaluosSala() {
  const [activeState, setActiveState] = useState('')
  const [page, setPage] = useState(0)

  // Two distinct ways to request an avalúo, both backed by `avaluosApi.solicitar()`:
  //  - Directo: the agency member does it themselves now → navigate to the wizard
  //    in the same tab (a new-tab popup would be blocked after the await).
  //    Independent loading state so it never blocks the link action's spinner.
  //  - Link para compartir: mint a SHAREABLE wizard link the agency sends to a
  //    third party (owner/client). Keep the last minted link so it can be
  //    copied or opened.
  const [openingWizard, setOpeningWizard] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Main list — filterable by state, paginated.
  const { avaluos, total, pageSize, isLoading, error } = useAgencyAvaluos({
    state: activeState || undefined,
    page,
  })

  // "Actividad reciente" — always the latest requests regardless of the filter.
  const { avaluos: recentAll } = useAgencyAvaluos({ page: 0 })
  const recent = useMemo(
    () =>
      [...recentAll]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [recentAll],
  )

  const onStateChange = (state: string) => {
    setActiveState(state)
    setPage(0)
  }

  // Single source of truth for the API call + error surfacing; both actions
  // reuse it. Returns the wizard URL, or null when the request failed (a toast
  // was already shown) so callers just short-circuit.
  const requestAvaluo = async (): Promise<string | null> => {
    try {
      const { wizardUrl } = await avaluosApi.solicitar()
      return wizardUrl
    } catch (err) {
      // Surface the back's Spanish message (incl. 422 agency missing email/name).
      const message =
        err instanceof ApiError
          ? err.message
          : 'No pudimos solicitar el avalúo. Intentá de nuevo.'
      toast.error(message)
      return null
    }
  }

  // Directo — the agency member fills it out right now: navigate to the wizard in
  // the SAME tab. A `window.open(_, '_blank')` here would be popup-blocked: it runs
  // after `await requestAvaluo()`, so the user-gesture context is already gone.
  // Same-tab navigation after an await is never blocked. On success we leave
  // `openingWizard` true so the button keeps showing "Abriendo asistente…" through
  // the navigation; on failure the finally clause clears it and the toast is shown.
  const onSolicitarDirecto = async () => {
    setOpeningWizard(true)
    let navigating = false
    try {
      const wizardUrl = await requestAvaluo()
      if (wizardUrl) {
        navigating = true
        window.location.assign(wizardUrl)
      }
    } finally {
      if (!navigating) setOpeningWizard(false)
    }
  }

  // Link para compartir — mint the link and show the copy card.
  const onGenerarLink = async () => {
    setGeneratingLink(true)
    setCopied(false)
    try {
      const wizardUrl = await requestAvaluo()
      if (wizardUrl) setShareUrl(wizardUrl)
    } finally {
      setGeneratingLink(false)
    }
  }

  const onCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No pudimos copiar el link. Copialo manualmente.')
    }
  }

  const hasPrev = page > 0
  const hasNext = (page + 1) * pageSize < total

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Avalúos</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Estimación de valor referencial, 100% remota y asistida por IA. Sin visita física: el
          certificado se genera con datos de mercado y lo firma un revisor de Leasefy.
        </p>
      </header>

      {/* ── Solicitar un avalúo ────────────────────────────────────────
          TWO distinct actions, both backed by `avaluosApi.solicitar()`:
          "directo" opens the wizard now (lo hago yo), "link" mints a
          shareable URL (se lo mando a un cliente). Each has its own loading
          state so one spinner never blocks the other. */}
      <div
        className="rounded-xl border border-border bg-card p-5 space-y-4"
        data-testid="avaluos-solicitar"
      >
        <h2 className="text-base font-semibold text-foreground">Solicitar un avalúo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Directo — lo hago yo */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Solicitar avalúo</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Abrí el asistente y cargá los datos del inmueble vos mismo.
              </p>
            </div>
            <Button
              hideArrow
              className="mt-auto w-full"
              isLoading={openingWizard}
              disabled={openingWizard}
              onClick={onSolicitarDirecto}
              data-testid="avaluos-solicitar-directo-cta"
            >
              {openingWizard ? 'Abriendo asistente…' : 'Solicitar avalúo'}
            </Button>
          </div>

          {/* Link para compartir — se lo mando a un cliente */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Generar link para compartir</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Enviá el link a tu cliente para que lo complete; el avalúo saldrá a nombre de tu
                inmobiliaria.
              </p>
            </div>
            <Button
              hideArrow
              variant="secondary"
              className="mt-auto w-full"
              isLoading={generatingLink}
              disabled={generatingLink}
              onClick={onGenerarLink}
              data-testid="avaluos-generar-link-cta"
            >
              <ShareNetwork className="size-4" />
              {generatingLink ? 'Generando link…' : 'Generar link para compartir'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Shareable link ─────────────────────────────────────────────
          Output of the "Generar link para compartir" action: the minted wizard
          link carries the agency token so the avalúo is issued in the agency's
          name. The agency copies it and sends it to their client. */}
      {shareUrl && (
        <div
          className="rounded-xl border border-border bg-card p-4 space-y-3"
          data-testid="avaluos-share-link"
        >
          <p className="text-sm text-muted-foreground">
            Enviá este link a tu cliente; el avalúo saldrá a nombre de tu inmobiliaria.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              aria-label="Link para compartir el avalúo"
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-foreground truncate"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" hideArrow onClick={onCopy}>
                {copied ? (
                  <>
                    <Check className="size-4" weight="bold" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copiar link para compartir
                  </>
                )}
              </Button>
              <Button asChild variant="outline" hideArrow>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  Abrir ahora
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ¿Cómo funciona? ────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-border bg-card p-5 space-y-4"
        data-testid="avaluos-como-funciona"
      >
        <h2 className="text-base font-semibold text-foreground">¿Cómo funciona?</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMO_FUNCIONA_STEPS.map((step, i) => {
            const StepIcon = step.icon
            return (
              <li key={step.title} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <StepIcon className="w-4 h-4 text-foreground" weight="duotone" aria-hidden="true" />
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{step.desc}</p>
              </li>
            )
          })}
        </ol>
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          La revisión y la firma del certificado las hace un revisor de Leasefy. No se realiza
          visita física al inmueble.
        </p>
      </div>

      {/* ── Casos por etapa / Mis solicitudes ──────────────────────── */}
      <section className="space-y-4" data-testid="avaluos-mis-solicitudes">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-foreground">Mis solicitudes</h2>
        </div>

        {/* State filter */}
        <div className="flex flex-wrap gap-2">
          {STATE_TABS.map((tab) => {
            const active = activeState === tab.value
            return (
              <button
                key={tab.value || 'todos'}
                type="button"
                aria-pressed={active}
                onClick={() => onStateChange(tab.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted/40'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Cargando avalúos…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            No pudimos cargar los avalúos. {error}
          </div>
        ) : avaluos.length === 0 ? (
          <EmptyState
            icon={FileMagnifyingGlass}
            title="Todavía no hay avalúos"
            description="Cuando solicites un avalúo, aparecerá aquí con su estado y valor de mercado."
          />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
              <span className="text-xs font-medium text-muted-foreground">Método</span>
              <span className="text-xs font-medium text-muted-foreground text-right">Valor</span>
              <span className="text-xs font-medium text-muted-foreground hidden sm:block text-right">
                Creado
              </span>
            </div>

            {/* Rows */}
            <ul role="list" className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {avaluos.map((item) => {
                const meta = stateMeta(item.state)
                return (
                  <li
                    key={item.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3"
                  >
                    <Badge variant={meta.variant}>{meta.label}</Badge>

                    <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground truncate">
                      {item.method || '—'}
                    </span>

                    <span className="text-sm font-medium tabular-nums text-right whitespace-nowrap">
                      {item.valueCop == null ? '—' : formatCurrency(item.valueCop)}
                    </span>

                    <span className="text-xs text-muted-foreground hidden sm:block text-right whitespace-nowrap tabular-nums">
                      {formatDate(item.createdAt)}
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* Pagination */}
            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {total} {total === 1 ? 'avalúo' : 'avalúos'}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    hideArrow
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    hideArrow
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Actividad reciente ─────────────────────────────────────── */}
      <section
        className="rounded-xl border border-border bg-card p-5 space-y-3"
        data-testid="avaluos-actividad-reciente"
      >
        <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no hay actividad reciente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((item) => {
              const meta = stateMeta(item.state)
              return (
                <li key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                    {item.city || 'Inmueble'} ·{' '}
                    <span className="text-muted-foreground">
                      {item.valueCop == null ? 'Sin valor' : formatCurrency(item.valueCop)}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {formatDate(item.createdAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function AvaluosSalaPage() {
  return (
    // Agent module gate — ABSENT key in my-permissions = allowed
    // (see agent-module-access.ts); present without 'view' = denied.
    <PageGuard module="avaluos">
      <AvaluosSala />
    </PageGuard>
  )
}
