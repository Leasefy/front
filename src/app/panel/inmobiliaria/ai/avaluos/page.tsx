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
 *  - "Avalúos de tu inmobiliaria" reads the agency's own certificates by
 *    lifecycle state (`useAgencyAvaluos`) — the SAME closed set the avalúo micro
 *    exposes (borrador|en_revisión|firmado|rechazado|entregado). Deliberately NOT
 *    called "Mis solicitudes": that is the neighbouring TAB (`./cola`), which
 *    shows the agent's work-items — otro servicio, otros datos. Two places with
 *    the same name and different contents leave you unable to tell which you
 *    are looking at.
 *
 * There used to be a third block, "Actividad reciente", calling the same hook a
 * second time to render the 5 newest rows of the list already shown in full
 * above it. It added no data, cost a second round-trip, and had no error branch:
 * with the list failing it announced "Aún no hay actividad reciente" right below
 * "No pudimos cargar los avalúos". Removed.
 *
 * PRODUCT REALITY (legal-sensitive copy): this is a REMOTE "estimación de valor
 * referencial" generated with AI — there is NO physical visit (the certificate
 * itself states "No se realizó visita física") — and it is reviewed and signed
 * by a Leasefy reviewer. The copy below must never imply a site visit.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  Copy,
  ChartLineUp,
  DownloadSimple,
  FileMagnifyingGlass,
  SealCheck,
  ShareNetwork,
  WarningCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { PageGuard } from '@/components/auth/PageGuard'
import { useAgencyAvaluos } from '@/lib/hooks/useInmobiliaria'
import { avaluosApi } from '@/lib/api/inmobiliaria.service'
import { ApiError } from '@/lib/api/client'
import { AVALUO_WIZARD_ORIGIN } from '@/lib/avaluo/wizard-url'
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

  // Both CTAs end at the avalúo MICRO's wizard, whose origin comes from
  // `NEXT_PUBLIC_AVALUO_API_URL`. When that is unset there is no URL to compose:
  // `avaluosApi.solicitar()` throws AFTER the back has already minted an agency
  // token, so the click cost a round-trip and returned nothing usable.
  //
  // `wizard-url.ts` states the contract: "Empty when the micro base is unset →
  // callers must degrade (hide/disable the CTA)". `/avaluo/nuevo` already honours
  // it ("no está disponible por ahora"); this panel did not — it offered two live
  // buttons for a service it could not reach. Say so BEFORE the click, not after.
  const servicioConfigurado = AVALUO_WIZARD_ORIGIN !== ''

  // Two distinct ways to request an avalúo, both backed by `avaluosApi.solicitar()`:
  //  - Directo: the agency member does it themselves now → open the wizard in a
  //    NEW tab so the panel (and the agency session) stays alive. See the anti-popup
  //    pattern in `onSolicitarDirecto` for why the tab is opened synchronously.
  //    Independent loading state so it never blocks the link action's spinner.
  //  - Link para compartir: mint a SHAREABLE wizard link the agency sends to a
  //    third party (owner/client). Keep the last minted link so it can be
  //    copied or opened.
  const [openingWizard, setOpeningWizard] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // La lista de la agencia — filtrable por estado, paginada. UNA sola vez.
  //
  // Había una segunda llamada a este mismo hook para pintar «Actividad
  // reciente», que mostraba las 5 más nuevas de la MISMA lista que ya estaba
  // completa arriba. Costaba un segundo viaje al servidor (cuatro en total,
  // porque StrictMode duplica cada uno) para no agregar ni un dato nuevo.
  //
  // Y mentía: no tenía rama de error, así que cuando la carga fallaba —hoy
  // falla, 502: el micro de avalúos no responde— la sección de arriba decía
  // «No pudimos cargar los avalúos» y la de abajo, con el MISMO pedido
  // fallado, decía «Aún no hay actividad reciente». Dos frases que se
  // contradicen a diez centímetros una de otra. Se fue entera.
  //
  // `errorCrudo` (el error tal cual, no su mensaje) es lo que necesita
  // <EstadoDeDatos> para clasificar: un 502 no se cuenta igual que un 403.
  const { avaluos, total, pageSize, isLoading, errorCrudo, refetch } = useAgencyAvaluos({
    state: activeState || undefined,
    page,
  })

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

  // Directo — the agency member fills it out right now, but we must NOT navigate the
  // panel away: that would tear down their agency session context. Open the wizard in
  // a NEW tab instead. The catch: `window.open(url, '_blank')` AFTER an await is
  // popup-blocked, because the user-gesture context is gone by then. Anti-popup
  // pattern: open a blank tab SYNCHRONOUSLY inside the click (gesture still alive),
  // keep the handle, and point it at the wizard URL once the request resolves.
  //  - request failed → close the placeholder tab (toast already shown).
  //  - popup blocked even synchronously (handle is null) → degrade to same-tab nav so
  //    the action still works; session preservation is best-effort in that case.
  // `opener` is nulled before navigating (while the tab is still same-origin about:blank)
  // to prevent the wizard tab from reaching back into the panel via window.opener.
  const onSolicitarDirecto = async () => {
    setOpeningWizard(true)
    const newTab = window.open('about:blank', '_blank')
    try {
      const wizardUrl = await requestAvaluo()
      if (!wizardUrl) {
        newTab?.close()
        return
      }
      if (newTab) {
        newTab.opener = null
        newTab.location.replace(wizardUrl)
      } else {
        window.location.assign(wizardUrl)
      }
    } catch {
      newTab?.close()
    } finally {
      setOpeningWizard(false)
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

        {!servicioConfigurado && (
          <div
            className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
            data-testid="avaluos-servicio-no-configurado"
          >
            <WarningCircle
              className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-warning">
                Las solicitudes de avalúo están desconectadas
              </p>
              {/* La frase que estaba acá —«Tus avalúos anteriores se siguen viendo
                  más abajo»— era falsa: la lista de abajo sale del MISMO servicio
                  y falla por la misma razón (502). Un aviso no puede prometer lo
                  que la propia pantalla incumple diez centímetros más abajo. */}
              <p className="text-body-sm text-fg-muted mt-0.5">
                Este entorno no tiene conectado el servicio de avalúos: no podemos abrir el
                asistente ni generar links para compartir. Escribile a tu contacto de Leasefy para
                activarlo.
              </p>
            </div>
          </div>
        )}

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
              disabled={openingWizard || !servicioConfigurado}
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
              disabled={generatingLink || !servicioConfigurado}
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

      {/* ── Los avalúos de la agencia ───────────────────────────────────
          NO se llama «Mis solicitudes»: ése es el nombre de la pestaña de al
          lado (`/avaluos/cola`), que muestra OTRA cosa —los work-items del
          agente— desde otro servicio. Dos lugares distintos con el mismo
          nombre y datos distintos hacen imposible saber cuál mira uno. La
          pestaña es un lugar; esta sección es un lugar distinto. */}
      <section className="space-y-4" data-testid="avaluos-de-la-agencia">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-foreground">Avalúos de tu inmobiliaria</h2>
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

        {/* Los cuatro estados, en un solo marco.
            Antes eran tres cajas distintas —una por estado— cada una con su
            propio borde, así que el hueco cambiaba de forma según qué pasara.
            Y el cartel de error escupía el mensaje del backend tal cual: la
            agencia leía «Error 502». <EstadoDeDatos> los ordena (cargando →
            falló → vacío → datos), clasifica el fallo y sólo ofrece reintentar
            cuando reintentar puede cambiar algo. */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <EstadoDeDatos
            cargando={isLoading}
            error={errorCrudo}
            vacio={avaluos.length === 0}
            queEs="los avalúos"
            onReintentar={() => void refetch()}
            cuandoVacio={
              // El vacío son DOS: nunca pediste uno, o el filtro de estado no
              // deja pasar ninguno. Decir «todavía no hay avalúos» cuando hay
              // tres firmados y estás mirando «Rechazado» es afirmar algo falso,
              // y deja sin la única salida útil: quitar el filtro.
              <SinDatos
                hayFiltros={activeState !== ''}
                queSon="avalúos"
                icono={FileMagnifyingGlass}
                titulo="Todavía no hay avalúos"
                descripcion="Cuando solicites un avalúo, aparece acá con su estado y su valor de mercado."
                onLimpiarFiltros={() => onStateChange('')}
              />
            }
          >
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
              <span className="text-xs font-medium text-muted-foreground">Propietario</span>
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

                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {item.ownerName?.trim() || 'Propietario sin nombre'}
                      </p>
                      <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground truncate">
                        {item.method || '—'}
                      </p>
                    </div>

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
          </EstadoDeDatos>
        </div>
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
