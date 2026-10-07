'use client'

/**
 * /panel/inmobiliaria/inmuebles/avaluos — the ONE canonical agency Avalúos workspace.
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
 * by a Leasefy reviewer. The copy must never imply a site visit.
 *
 * ⚠️ That copy now lives in `es.json`/`en.json` under
 * `inmobiliaria.ai.workspace.pages.avaluos`, NOT in this file. It used to be
 * hardcoded here while the same keys sat in both dictionaries with OLDER,
 * different wording — so this was the only page in the workspace that stayed
 * in Spanish when you switched to English, and there were two versions of a
 * legally reviewed sentence with nothing keeping them in sync. The migration
 * moved what was ON SCREEN into the dictionaries; it did not adopt the stale
 * text that was already there. `claves-avaluos.test.ts` freezes the key set in
 * both locales.
 */

import { useId, useState } from 'react'
import { MotionIndicator, Presence, Stagger, StaggerItem } from '@leasefy/cadence'
import { toast } from '@/components/ui/toast'
import {
  Check,
  Copy,
  CreditCard,
  EnvelopeSimple,
  FileMagnifyingGlass,
  SealCheck,
  ShareNetwork,
  WarningCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PasosExplicados, type QuienLoHace } from '@/components/ui/pasos-explicados'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { PageGuard } from '@/components/auth/PageGuard'
import { TablePagination } from '@/components/ui/pagination'
import { useAgencyAvaluos } from '@/lib/hooks/useInmobiliaria'
import { avaluosApi } from '@/lib/api/inmobiliaria.service'
import { ApiError } from '@/lib/api/client'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { AVALUO_WIZARD_ORIGIN } from '@/lib/avaluo/wizard-url'
import { formatCurrency, formatDate } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { DescargarCertificado, tieneCertificado } from './DescargarCertificado'

/** Raíz del diccionario de esta pantalla. */
const NS = 'inmobiliaria.ai.workspace.pages.avaluos'

/**
 * Las columnas de la lista: estado · propietario · valor · creado · certificado.
 * A 390 px «Creado» se esconde y el botón del certificado baja a su propio
 * renglón, a lo ancho (con él en la misma línea, el nombre del propietario se
 * quedaba en una letra): la plantilla es de tres columnas y la celda del
 * certificado ocupa las tres.
 */
const COLUMNAS_DE_LA_LISTA =
  'grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto]'

// ---------------------------------------------------------------------------
// State metadata — the real certificate lifecycle states, the SAME closed set
// the avalúo micro exposes. Mirrors the admin `avaluo-states.ts` template,
// mapped to the panel's own Badge variants.
//
// El valor que manda el micro (`en_revisión`, con tilde) NO sirve como clave de
// i18n, así que cada estado lleva la suya. Lo que se guarda acá es lo que NO se
// traduce —la variante del Badge— y el puente al diccionario.
// ---------------------------------------------------------------------------

const AVALUO_STATES = [
  'borrador',
  'en_revisión',
  'firmado',
  'rechazado',
  'entregado',
] as const

type AvaluoStateValue = (typeof AVALUO_STATES)[number]

type BadgeVariant = React.ComponentProps<typeof Badge>['variant']

const STATE_META: Record<AvaluoStateValue, { clave: string; variant: BadgeVariant }> = {
  borrador: { clave: 'borrador', variant: 'secondary' },
  'en_revisión': { clave: 'enRevision', variant: 'warning' },
  firmado: { clave: 'firmado', variant: 'success' },
  rechazado: { clave: 'rechazado', variant: 'destructive' },
  entregado: { clave: 'entregado', variant: 'default' },
}

/**
 * Presentación de un estado. Un valor que no conocemos degrada a píldora
 * neutra mostrando el valor crudo: inventarle una traducción sería peor.
 */
function stateMeta(
  state: string,
  t: (key: string) => string,
): { label: string; variant: BadgeVariant } {
  const meta = STATE_META[state as AvaluoStateValue]
  return meta
    ? { label: t(`${NS}.estados.${meta.clave}`), variant: meta.variant }
    : { label: state, variant: 'secondary' }
}

/** Pestañas de filtro: "Todos" ('' → sin filtro) + los estados reales. */
function stateTabs(t: (key: string) => string): { value: string; label: string }[] {
  return [
    { value: '', label: t('common.all') },
    ...AVALUO_STATES.map((s) => ({ value: s, label: stateMeta(s, t).label })),
  ]
}

// ---------------------------------------------------------------------------
// "¿Cómo funciona?" — the real, truthful journey (no site visit).
//
// Nico (05-10-2026): «eso no debe de estar ahí siempre […] llévalas al botón
// que al dar clic abre drawer y explica mejor cada cosa». Vive detrás del
// botón del encabezado, en el cajón de `ParaEntenderMas`, y cada paso dice
// quién lo hace. Lo que la pantalla TIENE que decir sigue a la vista: el aviso
// de «desconectadas» y, en el subtítulo, que no hay visita y que firma un
// revisor de Leasefy.
//
// Verificado contra el código (05-10): el pago va en el asistente, antes de la
// estimación; la firma es del backoffice de Leasefy; el certificado llega al
// correo de la inmobiliaria con el PDF. Desde el 05-10 (PROMESAS-Y-DIRECTOR)
// la lista también lo baja: «Descargar certificado» en las filas firmadas
// (`GET /inmobiliaria/avaluos/:id/certificate`), y el paso 4 lo dice.
// ---------------------------------------------------------------------------

const COMO_FUNCIONA_STEPS: { icon: Icon; clave: string; quien?: QuienLoHace; tuParte?: true }[] = [
  { icon: ShareNetwork, clave: 'step1', quien: 'tu', tuParte: true },
  { icon: CreditCard, clave: 'step2' },
  { icon: SealCheck, clave: 'step3', quien: 'leasefy' },
  { icon: EnvelopeSimple, clave: 'step4', quien: 'leasefy', tuParte: true },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AvaluosSala() {
  const { t } = useI18n()
  const [activeState, setActiveState] = useState('')
  const [page, setPage] = useState(0)
  // El filtro de estado elegido lleva su píldora, que se DESLIZA al nuevo.
  const indicadorDelEstado = `${useId()}-estado`

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

  // El servicio puede estar configurado (hay URL) y aun así no contestar: el
  // back responde 502 «Avaluo service unreachable» al listar. Con el servicio
  // caído, los botones abrían una pestaña a un host muerto y parecía que «no
  // hacían nada» (Nico, 2026-09-03). El mismo aviso de «desconectado» que ya
  // existía para la URL vacía vale para este caso, y apaga los dos botones.
  const servicioCaido = errorCrudo instanceof ApiError && errorCrudo.status === 502
  const servicioDesconectado = !servicioConfigurado || servicioCaido

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
      // El mensaje del back gana cuando se puede leer (el 422 de agencia sin
      // correo/nombre lo escribe él en español y es más específico que
      // cualquier texto nuestro). Pero no siempre: un 5xx traía «Internal
      // server error» o un volcado, y el 502 del micro caído, «Avaluo service
      // unreachable». El traductor aplica la regla de oro: conexión sólo sin
      // respuesta, un 5xx dice que fue nuestro con la referencia, una caída
      // dice qué se cayó.
      toast.error(
        mensajeParaLaPersona(err, {
          porDefecto: t(`${NS}.errorSolicitar`),
          accion: 'solicitar el avalúo',
        }),
      )
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
      toast.error(t(`${NS}.errorCopiar`))
    }
  }


  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────
          «¿Cómo funciona?» va acá, donde iría el botón de acción (Nico,
          05-10-2026): abre el cajón con los cuatro pasos y la nota del
          revisor. Antes era una tarjeta de cuatro columnas siempre a la vista. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-h2 text-fg">
            {t(`${NS}.salaTitulo`)}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">{t(`${NS}.salaDesc`)}</p>
        </div>
        <ParaEntenderMas
          etiqueta={t(`${NS}.comoFunciona.title`)}
          titulo={t(`${NS}.comoFunciona.titulo`)}
          descripcion={t(`${NS}.comoFunciona.descripcion`)}
          variante="secundario"
          className="self-start sm:shrink-0"
        >
          <PasosExplicados
            data-testid="avaluos-como-funciona"
            pasos={COMO_FUNCIONA_STEPS.map((step) => ({
              id: step.clave,
              icono: step.icon,
              titulo: t(`${NS}.comoFunciona.${step.clave}.title`),
              explicacion: t(`${NS}.comoFunciona.${step.clave}.desc`),
              quien: step.quien,
              tuParte: step.tuParte ? t(`${NS}.comoFunciona.${step.clave}.tuParte`) : undefined,
            }))}
            nota={t(`${NS}.firmaNota`)}
          />
        </ParaEntenderMas>
      </header>

      {/* ── Solicitar un avalúo ────────────────────────────────────────
          TWO distinct actions, both backed by `avaluosApi.solicitar()`:
          "directo" opens the wizard now (lo hago yo), "link" mints a
          shareable URL (se lo mando a un cliente). Each has its own loading
          state so one spinner never blocks the other. */}
      <div
        className="rounded-lg border border-border bg-card p-5 space-y-4"
        data-testid="avaluos-solicitar"
      >
        <h2 className="text-base font-semibold text-foreground">{t(`${NS}.solicitarTitle`)}</h2>

        {servicioDesconectado && (
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
                {t(`${NS}.desconectadoTitulo`)}
              </p>
              {/* `solicitarUnavailable`, la MISMA frase que usa el vacío de la
                  cola: el servicio está desconectado en un solo lugar del
                  diccionario, no en dos que se despegan.

                  Lo que decía antes —«Tus avalúos anteriores se siguen viendo
                  más abajo»— era falso: la lista de abajo sale del MISMO
                  servicio y falla por la misma razón (502). Un aviso no puede
                  prometer lo que la pantalla incumple diez centímetros abajo. */}
              <p className="text-body-sm text-fg-muted mt-0.5">
                {t(`${NS}.solicitarUnavailable`)}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Directo — lo hago yo */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{t(`${NS}.solicitarCta`)}</p>
              <p className="text-xs text-muted-foreground leading-snug">
                {t(`${NS}.directoDetalle`)}
              </p>
            </div>
            <Button
              hideArrow
              className="mt-auto w-full"
              isLoading={openingWizard}
              disabled={openingWizard || servicioDesconectado}
              onClick={onSolicitarDirecto}
              data-testid="avaluos-solicitar-directo-cta"
            >
              {openingWizard ? t(`${NS}.abriendoAsistente`) : t(`${NS}.solicitarCta`)}
            </Button>
          </div>

          {/* Link para compartir — se lo mando a un cliente */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{t(`${NS}.linkCta`)}</p>
              <p className="text-xs text-muted-foreground leading-snug">
                {t(`${NS}.linkDetalle`)}
              </p>
            </div>
            <Button
              hideArrow
              variant="secondary"
              className="mt-auto w-full"
              isLoading={generatingLink}
              disabled={generatingLink || servicioDesconectado}
              onClick={onGenerarLink}
              data-testid="avaluos-generar-link-cta"
            >
              <ShareNetwork className="size-4" />
              {generatingLink ? t(`${NS}.generandoLink`) : t(`${NS}.linkCta`)}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Shareable link ─────────────────────────────────────────────
          Output of the "Generar link para compartir" action: the minted wizard
          link carries the agency token so the avalúo is issued in the agency's
          name. The agency copies it and sends it to their client. */}
      {/* El link recién generado aparece con su entrada (sube 8 px). */}
      <Presence
        show={Boolean(shareUrl)}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
        data-testid="avaluos-share-link"
      >
          <p className="text-sm text-muted-foreground">{t(`${NS}.linkListoDetalle`)}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl ?? ''}
              aria-label={t(`${NS}.linkAria`)}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-foreground truncate"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" hideArrow onClick={onCopy}>
                {copied ? (
                  <>
                    <Check className="size-4" weight="bold" />
                    {t('common.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    {t(`${NS}.copiarLink`)}
                  </>
                )}
              </Button>
              <Button asChild variant="outline" hideArrow>
                <a href={shareUrl ?? undefined} target="_blank" rel="noopener noreferrer">
                  {t(`${NS}.abrirAhora`)}
                </a>
              </Button>
            </div>
          </div>
      </Presence>

      {/* ── Los avalúos de la agencia ───────────────────────────────────
          NO se llama «Mis solicitudes»: ése es el nombre de la pestaña de al
          lado (`/avaluos/cola`), que muestra OTRA cosa —los work-items del
          agente— desde otro servicio. Dos lugares distintos con el mismo
          nombre y datos distintos hacen imposible saber cuál mira uno. La
          pestaña es un lugar; esta sección es un lugar distinto. */}
      <section className="space-y-4" data-testid="avaluos-de-la-agencia">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-foreground">{t(`${NS}.listaTitulo`)}</h2>
        </div>

        {/* State filter */}
        <div className="flex flex-wrap gap-2">
          {stateTabs(t).map((tab) => {
            const active = activeState === tab.value
            return (
              <button
                key={tab.value || 'todos'}
                type="button"
                aria-pressed={active}
                onClick={() => onStateChange(tab.value)}
                className={`relative isolate rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                  active
                    ? 'text-primary-foreground border-transparent'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted/40'
                }`}
              >
                {/* La píldora cobalto del activo (la misma de antes), que viaja. */}
                {active && (
                  <MotionIndicator
                    layoutId={indicadorDelEstado}
                    className="-inset-px -z-10 rounded-full border border-primary bg-primary"
                  />
                )}
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
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <EstadoDeDatos
            cargando={isLoading}
            // IA-C-03 (QA 04-10): con el servicio desconectado (502) el aviso de
            // arriba ya lo explica; la lista no dice «vuelve a intentar en unos
            // minutos» como si fuera una caída pasajera.
            error={servicioCaido ? null : errorCrudo}
            vacio={servicioCaido || avaluos.length === 0}
            queEs={t(`${NS}.queEs`)}
            onReintentar={refetch}
            cuandoVacio={
              servicioCaido ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="avaluos-lista-sin-servicio">
                  Los avalúos aparecen aquí cuando el servicio de avalúos esté conectado.
                </p>
              ) :
              // El vacío son DOS: nunca pediste uno, o el filtro de estado no
              // deja pasar ninguno. Decir «todavía no hay avalúos» cuando hay
              // tres firmados y estás mirando «Rechazado» es afirmar algo falso,
              // y deja sin la única salida útil: quitar el filtro.
              <SinDatos
                hayFiltros={activeState !== ''}
                queSon={t(`${NS}.queSon`)}
                icono={FileMagnifyingGlass}
                titulo={t(`${NS}.vacioTitulo`)}
                descripcion={t(`${NS}.vacioDesc`)}
                onLimpiarFiltros={() => onStateChange('')}
              />
            }
          >
            {/* Table header — la quinta columna es «Certificado» (05-10-2026):
                el botón de descarga de las filas firmadas. A 390 px «Creado» y
                «Certificado» no van en el encabezado (el botón baja de renglón). */}
            <div className={`${COLUMNAS_DE_LA_LISTA} gap-4 px-4 py-2.5 bg-muted/40 border-b border-border`}>
              <span className="text-xs font-medium text-muted-foreground">
                {t(`${NS}.col.estado`)}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {t(`${NS}.col.propietario`)}
              </span>
              <span className="text-xs font-medium text-muted-foreground text-right">
                {t(`${NS}.col.valor`)}
              </span>
              <span className="text-xs font-medium text-muted-foreground hidden sm:block text-right">
                {t(`${NS}.col.creado`)}
              </span>
              <span className="text-xs font-medium text-muted-foreground hidden sm:block text-right">
                {t(`${NS}.col.certificado`)}
              </span>
            </div>

            {/* Rows */}
            {/* Filtrar o paginar: las filas entran escalonadas (paginada: sin `layout`). */}
            <Stagger as="ul" layout={false} role="list" className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {avaluos.map((item) => {
                const meta = stateMeta(item.state, t)
                return (
                  <StaggerItem as="li"
                    key={item.id}
                    className={`${COLUMNAS_DE_LA_LISTA} gap-4 items-center px-4 py-3`}
                  >
                    <Badge variant={meta.variant}>{meta.label}</Badge>

                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {item.ownerName?.trim() || t(`${NS}.sinNombre`)}
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

                    {/* El certificado firmado, sólo donde ya existe (firmado y
                        entregado). A 390 px va en su propio renglón; en las
                        demás filas la celda sólo existe desde `sm` (alinea). */}
                    {tieneCertificado(item.state) ? (
                      <div className="col-span-3 flex sm:col-span-1 sm:justify-end">
                        <DescargarCertificado
                          id={item.id}
                          propietario={item.ownerName?.trim() || t(`${NS}.sinNombre`)}
                        />
                      </div>
                    ) : (
                      <div className="hidden sm:block" aria-hidden="true" />
                    )}
                  </StaggerItem>
                )
              })}
            </Stagger>

            {/* Pie de tabla del design system, el mismo del resto del panel:
                «Mostrando 1–100 de N». Antes eran dos botones Anterior/
                Siguiente que sólo aparecían con más de una página — con 3
                avalúos no se veía ni cuántos había.

                Las páginas las sirve el back (`useAgencyAvaluos({ page })`,
                `pageSize` fijo del servidor), así que no se ofrece el tamaño
                de página: sin `pageSizeOptions` el selector no se monta y no
                queda un control que no hace nada.

                `page` acá es 0-indexado y el del design system 1-indexado. */}
            {total > 0 && (
              <div className="border-t border-border px-4 py-3">
                <TablePagination
                  total={total}
                  page={page + 1}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(Math.max(0, p - 1))}
                />
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
