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

import { useEffect, useMemo, useState } from 'react'
import { Presence, Stagger, StaggerItem } from '@leasefy/cadence'
import { toast } from '@/components/ui/toast'
import {
  Check,
  Copy,
  CreditCard,
  EnvelopeSimple,
  FileMagnifyingGlass,
  SealCheck,
  ShareNetwork,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
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
 * Las columnas de la lista desde `md`: estado · propietario · valor · creado · certificado.
 * Bajo 768 px cada avalúo es una TARJETA (revisora r24 #5): propietario · valor / estado · fecha /
 * «Descargar certificado» a lo ancho. Las celdas se reordenan con `order-*`, sin duplicar el contenido.
 */
const COLUMNAS_DE_LA_LISTA = 'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[8.5rem_minmax(0,1fr)_auto_auto_11rem]'

/** El método en palabras; un código del micro que no conocemos no se muestra (revisora r24 #5). */
const METODO_EN_PALABRAS: Record<string, string> = {
  AVM: 'metodos.avm',
  COMPARABLES: 'metodos.comparables',
  COMPARABLES_IA: 'metodos.comparablesIa',
}
function metodoEnPalabras(metodo: string | null | undefined, t: (k: string) => string): string | null {
  const m = (metodo ?? '').trim()
  if (!m || m === '—') return null
  const clave = METODO_EN_PALABRAS[m.toUpperCase()]
  if (clave) return t(`${NS}.${clave}`)
  return /^[A-Z0-9_]+$/.test(m) ? null : m
}

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

/** El orden de las pestañas: lo que está andando primero, lo cerrado al final. */
const ORDEN_DE_LAS_PESTANAS: readonly AvaluoStateValue[] = ['en_revisión', 'firmado', 'entregado', 'borrador', 'rechazado']

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
  // Con TODOS los avalúos en una página (el back sirve 100 por página), las pestañas cuentan y filtran
  // aquí mismo: un solo pedido sin estado. Con más, el estado vuelve a viajar al back y las pestañas van
  // sin número (no se puede contar lo que no llegó). `null` = todavía no se sabe.
  const [todosCaben, setTodosCaben] = useState<boolean | null>(null)
  const filtroEnElServidor = todosCaben === false

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
  const estadoQueViaja = filtroEnElServidor ? activeState || undefined : undefined
  const { avaluos, total, pageSize, isLoading, errorCrudo, refetch } = useAgencyAvaluos({
    state: estadoQueViaja,
    page,
  })
  useEffect(() => {
    if (estadoQueViaja === undefined && page === 0 && !isLoading && !errorCrudo) setTodosCaben(total <= pageSize)
  }, [estadoQueViaja, page, isLoading, errorCrudo, total, pageSize])

  const cuantosPorEstado = useMemo(() => {
    const n: Record<string, number> = {}
    for (const a of avaluos) n[a.state] = (n[a.state] ?? 0) + 1
    return n
  }, [avaluos])
  const visibles = filtroEnElServidor || !activeState ? avaluos : avaluos.filter((a) => a.state === activeState)
  const totalVisible = filtroEnElServidor ? total : visibles.length

  // El servicio puede estar configurado (hay URL) y aun así no contestar: el
  // back responde 502 «Avaluo service unreachable» al listar. Con el servicio
  // caído, los botones abrían una pestaña a un host muerto y parecía que «no
  // hacían nada» (Nico, 2026-09-03). El mismo aviso de «desconectado» que ya
  // existía para la URL vacía vale para este caso, y apaga los dos botones.
  const servicioCaido = errorCrudo instanceof ApiError && errorCrudo.status === 502
  const servicioDesconectado = !servicioConfigurado || servicioCaido
  // Revisora r24 #1: los dos botones apagados dicen POR QUÉ en su `title`.
  const porQueApagado = !servicioConfigurado
    ? t(`${NS}.desconectadoTitulo`)
    : servicioCaido
      ? t(`${NS}.sinServicioBoton`)
      : null
  const listosParaEntregar = cuantosPorEstado['firmado'] ?? 0
  const rechazados = cuantosPorEstado['rechazado'] ?? 0
  const hayCifra = !filtroEnElServidor && !servicioCaido && !isLoading && !errorCrudo && avaluos.length > 0

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
      {/* GLOW UP 22-10 (UX, al nivel de Deuda del mes): el encabezado común —«Hacer un avalúo» (lo hago yo)
          la principal, «Generar link para compartir» (se lo mando a un cliente) la secundaria, «¿Cómo
          funciona?» en la ayuda—. Antes las dos acciones vivían en dos tarjetas dentro de otra tarjeta, y
          la lista de avalúos (el trabajo) quedaba debajo del pliegue. */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.secAgentes')}
        titulo={t(`${NS}.salaTitulo`)}
        descripcion={t(`${NS}.salaDesc`)}
        ayuda={
          <ParaEntenderMas
            etiqueta={t(`${NS}.comoFunciona.title`)}
            titulo={t(`${NS}.comoFunciona.titulo`)}
            descripcion={t(`${NS}.comoFunciona.descripcion`)}
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
        }
        acciones={
          <Button
            size="sm"
            hideArrow
            variant="outline"
            title={porQueApagado ?? t(`${NS}.linkDetalle`)}
            isLoading={generatingLink}
            disabled={generatingLink || servicioDesconectado}
            onClick={onGenerarLink}
            data-testid="avaluos-generar-link-cta"
          >
            <ShareNetwork className="size-4" />
            {generatingLink ? t(`${NS}.generandoLink`) : t(`${NS}.linkCta`)}
          </Button>
        }
        accionPrincipal={
          <Button
            size="sm"
            hideArrow
            title={porQueApagado ?? t(`${NS}.directoDetalle`)}
            isLoading={openingWizard}
            disabled={openingWizard || servicioDesconectado}
            onClick={onSolicitarDirecto}
            data-testid="avaluos-solicitar-directo-cta"
          >
            {openingWizard ? t(`${NS}.abriendoAsistente`) : t(`${NS}.solicitarCta`)}
          </Button>
        }
      />

      {/* Revisora r24 #1: «no está activo» SÓLO cuando falta la conexión (sin URL). Una caída (502) se dice
          una sola vez, dentro de la lista, con «Reintentar». */}
      {!servicioConfigurado ? (
        <AlertaAccionable
          severidad="warning"
          titulo={t(`${NS}.desconectadoTitulo`)}
          accion={{ label: t(`${NS}.escribenos`), href: 'mailto:hola@leasefy.co' }}
          data-testid="avaluos-servicio-no-configurado"
        >
          {t(`${NS}.solicitarUnavailable`)}
        </AlertaAccionable>
      ) : null}

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
              <Button variant="outline" size="sm" hideArrow onClick={onCopy}>
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
              <Button asChild variant="outline" size="sm" hideArrow>
                <a href={shareUrl ?? undefined} target="_blank" rel="noopener noreferrer">
                  {t(`${NS}.abrirAhora`)}
                </a>
              </Button>
            </div>
          </div>
      </Presence>

      {/* LA RESPUESTA (revisora r24 #4): cuántos ya se pueden entregar, de cuántos; la barra reparte los que
          siguen andando y los cerrados, y los rechazados van aparte con su «Ver». */}
      {hayCifra ? (
        <section className="rounded-lg border border-border bg-card px-5 py-5" data-testid="avaluos-cifra">
          <CifraHeroe
            rotulo={t(`${NS}.listosTitulo`)}
            cifra={String(listosParaEntregar)}
            contexto={
              avaluos.length === 1
                ? t(`${NS}.deTotalUno`)
                : t(`${NS}.deTotal`).replace('{{n}}', String(avaluos.length))
            }
            tramos={[
              { clave: 'en_revisión', etiqueta: stateMeta('en_revisión', t).label, monto: cuantosPorEstado['en_revisión'] ?? 0, tono: 'aviso' as const, cifra: String(cuantosPorEstado['en_revisión'] ?? 0) },
              { clave: 'firmado', etiqueta: stateMeta('firmado', t).label, monto: listosParaEntregar, tono: 'exito' as const, cifra: String(listosParaEntregar) },
              { clave: 'entregado', etiqueta: stateMeta('entregado', t).label, monto: cuantosPorEstado['entregado'] ?? 0, tono: 'neutro' as const, cifra: String(cuantosPorEstado['entregado'] ?? 0) },
              { clave: 'borrador', etiqueta: stateMeta('borrador', t).label, monto: cuantosPorEstado['borrador'] ?? 0, tono: 'neutro' as const, cifra: String(cuantosPorEstado['borrador'] ?? 0) },
            ]}
            pie={
              rechazados > 0 ? (
                <span className="inline-flex items-center gap-2">
                  {rechazados === 1 ? t(`${NS}.rechazadosUno`) : t(`${NS}.rechazados`).replace('{{n}}', String(rechazados))}
                  <button
                    type="button"
                    className="text-fg underline underline-offset-2 hover:no-underline"
                    onClick={() => onStateChange('rechazado')}
                  >
                    {t('common.view')}
                  </button>
                </span>
              ) : undefined
            }
          />
        </section>
      ) : null}

      {/* ── Los avalúos de la agencia ───────────────────────────────────
          NO se llama «Mis solicitudes»: ése es el nombre de la pestaña de al
          lado (`/avaluos/cola`), que muestra OTRA cosa —los work-items del
          agente— desde otro servicio. El título de la sección queda para el
          lector de pantalla: a la vista repetía el h1 (revisora r24 #7). */}
      <section
        className="overflow-hidden rounded-lg border border-border bg-card"
        aria-labelledby="avaluos-de-la-agencia-titulo"
        data-testid="avaluos-de-la-agencia"
      >
        <h2 id="avaluos-de-la-agencia-titulo" className="sr-only">{t(`${NS}.listaTitulo`)}</h2>

        {/* Las pestañas de estado DENTRO de la tarjeta, con su conteo y sin las que están en cero
            (revisora r24 #3). Sin servicio no hay pestañas: no hay lista que filtrar. */}
        {!servicioCaido && (total > 0 || activeState !== '') ? (
          <div className="border-b border-border px-4 py-3 empty:hidden">
            <PestanasDeEstado<string>
              etiqueta={t(`${NS}.filtrarPorEstado`)}
              valor={activeState}
              onCambio={onStateChange}
              data-testid="avaluos-por-estado"
              pestanas={[
                { valor: '', etiqueta: t('common.all'), cuantos: total, fija: true },
                ...ORDEN_DE_LAS_PESTANAS.map((e) => ({
                  valor: e as string,
                  etiqueta: stateMeta(e, t).label,
                  cuantos: filtroEnElServidor ? null : cuantosPorEstado[e] ?? 0,
                })),
              ]}
            />
          </div>
        ) : null}

        {servicioCaido && !servicioConfigurado ? (
          // Revisora r25: sin la conexión, el aviso de arriba ya lo dice («no están activos»);
          // la lista no agrega un segundo porqué distinto («no responde»).
          null
        ) : servicioCaido ? (
          // IA-C-03 (QA 04-10) + revisora r24 #1: una caída, dicha una sola vez y con su salida. No dice
          // «vuelve en unos minutos» ni «pide que lo activen»: está activo y no responde.
          <div className="flex flex-col items-start gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between" data-testid="avaluos-lista-sin-servicio">
            <p className="text-body-sm text-fg-muted">{t(`${NS}.sinServicioLista`)}</p>
            <Button type="button" variant="outline" size="sm" hideArrow onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <EstadoDeDatos
            cargando={isLoading}
            error={errorCrudo}
            vacio={visibles.length === 0}
            queEs={t(`${NS}.queEs`)}
            onReintentar={refetch}
            esqueleto={
              <div className="divide-y divide-border" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-4">
                    <div className="h-5 w-20 animate-pulse rounded-full bg-surface-muted" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-surface-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
                  </div>
                ))}
              </div>
            }
            cuandoVacio={
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
            {/* El encabezado de la tabla sólo desde `md`; abajo cada avalúo es una tarjeta. */}
            <div className={`${COLUMNAS_DE_LA_LISTA} hidden gap-4 border-b border-border px-4 py-2.5 md:grid`}>
              <span className="text-caption text-fg-subtle">{t(`${NS}.col.estado`)}</span>
              <span className="text-caption text-fg-subtle">{t(`${NS}.col.propietario`)}</span>
              <span className="text-right text-caption text-fg-subtle">{t(`${NS}.col.valor`)}</span>
              <span className="text-right text-caption text-fg-subtle">{t(`${NS}.col.creado`)}</span>
              <span className="text-right text-caption text-fg-subtle">{t(`${NS}.col.certificado`)}</span>
            </div>

            {/* Filtrar o paginar: las filas entran escalonadas (paginada: sin `layout`). */}
            <Stagger as="ul" layout={false} role="list" className="divide-y divide-border">
              {visibles.map((item) => {
                const meta = stateMeta(item.state, t)
                const metodo = metodoEnPalabras(item.method, t)
                const debajo = [item.city?.trim() || null, metodo].filter(Boolean).join(' · ')
                return (
                  <StaggerItem
                    as="li"
                    key={item.id}
                    className={`${COLUMNAS_DE_LA_LISTA} items-center gap-x-4 gap-y-2 px-4 py-3`}
                  >
                    <div className="order-3 md:order-none">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>

                    <div className="order-1 min-w-0 md:order-none">
                      <p className="truncate text-sm text-fg">{item.ownerName?.trim() || t(`${NS}.sinNombre`)}</p>
                      {debajo ? <p className="truncate text-caption text-fg-muted">{debajo}</p> : null}
                    </div>

                    <span className="order-2 whitespace-nowrap text-right font-mono text-sm tabular-nums text-fg md:order-none">
                      {item.valueCop == null ? '—' : formatCurrency(item.valueCop)}
                    </span>

                    <span className="order-4 whitespace-nowrap text-right font-mono text-caption tabular-nums text-fg-muted md:order-none">
                      {formatDate(item.createdAt)}
                    </span>

                    {/* El certificado firmado, sólo donde ya existe (firmado y entregado). En la tarjeta del
                        celular va en su propio renglón; en las demás filas la celda sólo existe desde `md`. */}
                    {tieneCertificado(item.state) ? (
                      <div className="order-5 col-span-2 flex md:order-none md:col-span-1 md:justify-end">
                        <DescargarCertificado
                          id={item.id}
                          propietario={item.ownerName?.trim() || t(`${NS}.sinNombre`)}
                        />
                      </div>
                    ) : (
                      <div className="hidden md:block" aria-hidden="true" />
                    )}
                  </StaggerItem>
                )
              })}
            </Stagger>

            {/* Pie de tabla del design system: «Mostrando 1–N de N». Las páginas las sirve el back
                (`pageSize` fijo), así que no se ofrece el tamaño de página. `page` es 0-indexado aquí. */}
            {totalVisible > 0 && (
              <div className="border-t border-border px-4 py-3">
                <TablePagination
                  total={totalVisible}
                  page={page + 1}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(Math.max(0, p - 1))}
                />
              </div>
            )}
          </EstadoDeDatos>
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
