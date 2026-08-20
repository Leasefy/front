/**
 * report-view.data.ts — LA función de acceso a datos del informe.
 *
 * El resto de la landing (página, layout, componentes, tests) no sabe de dónde
 * salen los datos: sólo consume `ReportWebView`. Ese aislamiento es a propósito.
 *
 * ── De dónde salen los datos ───────────────────────────────────────────────
 * `GET {MICRO}/api/avaluo/report/[slug]?token=<capability>` (report-serve v1),
 * llamado **desde el servidor** (este módulo corre en el servidor; la página es
 * un Server Component) y sin caché. Lo que ese contrato resuelve, y que este
 * archivo antes no podía decidir por su cuenta:
 *
 *   1. **Endpoint estructurado.** Devuelve el `ReportWebView` más `render`
 *      (sello real, QR como matriz, fotos presignadas, reloj). Se autentica con
 *      el capability token del dueño en `?token=` — el mismo precedente que
 *      certificate/memoria (`src/lib/api/avaluo.service.ts`) — así que acá NO
 *      hace falta el canal HMAC que `src/lib/admin/avaluos.ts:1-16` prohíbe
 *      mandar al navegador.
 *   2. **El pago y la audiencia los decide el servidor, no la URL.** `paid` y
 *      `paywallCtaHref` vienen en la respuesta; las secciones `paid` ya llegan
 *      proyectadas. `toPaidProjection` se aplica igual como red de seguridad.
 *   3. **Las fotos llegan presignadas.** `render.photos` trae `key → url`
 *      (TTL corto); `resolveMediaUrls` las cruza con el anexo y descarta lo que
 *      no se pudo resolver. Una key de S3 jamás llega a un `<img src>`.
 *   4. **El enlace compartido revocable NO entra en v1.** `audience` es
 *      siempre `'owner'`; el `token` de acá es el del dueño. Cuando exista la
 *      tabla de enlaces (v2), el servicio canjeará ese otro token y devolverá
 *      audiencia y caducidad ya resueltas — este archivo no cambia de forma.
 *
 * ── Base URL ────────────────────────────────────────────────────────────────
 * `AVALUO_API_URL` (server-only, `.env.example`) con fallback a
 * `NEXT_PUBLIC_AVALUO_API_URL`. Un fetch server-side necesita una URL absoluta:
 * el «vacío ⇒ mismo origen» del cliente no aplica acá. Sin base ⇒ `null`.
 *
 * ── Una sola salida neutral ─────────────────────────────────────────────────
 * 404 / 429 / 503 / red caída / JSON inválido ⇒ `null`, y la página responde
 * `notFound()`. La simetría es lo que impide usar la respuesta para averiguar
 * si un slug existe. Nada de esto se loguea con datos del documento.
 *
 * ── Sin muestra, sin overrides ──────────────────────────────────────────────
 * No hay slug de muestra ni `?vista=`/`?pago=`: TODO informe —en desarrollo y
 * en producción— sale del servicio con el token del dueño. La fixture de la
 * landing (`fixture-muestra.ts`) es material de TESTS. Para ver la landing en
 * local se corre el micro (o un mock HTTP fuera del repo) en `AVALUO_API_URL`.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { toPaidProjection } from './audience'
import type {
  MediaBlock,
  ReportBlock,
  ReportRenderPhoto,
  ReportSectionNode,
  ReportWebView,
  SectionId,
} from './report-model'
import { parseReportServeResponse, type ReportServeResponse } from './report-serve.schema'

export interface GetReportViewParams {
  readonly slug: string
  /**
   * El capability token del DUEÑO (el que emitió `POST /intake`), tal como
   * viaja en `?token=` para certificate/memoria. No es el enlace compartido
   * revocable: ese es v2 y lo canjeará el servicio.
   */
  readonly token?: string | null
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

/**
 * La base del micro para el fetch server-side. Se lee en cada llamada (no al
 * cargar el módulo) para que un test pueda cambiarla. Vacía ⇒ `null`.
 */
export function resolveAvaluoApiBase(): string | null {
  const base = process.env.AVALUO_API_URL || process.env.NEXT_PUBLIC_AVALUO_API_URL || ''
  const trimmed = base.trim().replace(/\/+$/, '')
  return trimmed.length > 0 ? trimmed : null
}

/** La URL del informe en el micro. Misma forma que `certificateUrl()`. */
export function reportServeUrl(base: string, slug: string, token: string): string {
  return `${base}/api/avaluo/report/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`
}

let warnedNoBase = false

async function fetchServedView(slug: string, token: string): Promise<ReportServeResponse | null> {
  const base = resolveAvaluoApiBase()
  if (base === null) {
    if (!warnedNoBase && process.env.NODE_ENV !== 'production') {
      warnedNoBase = true
      console.warn(
        '[avaluo/reporte] AVALUO_API_URL no está configurada: la landing no puede servir ningún informe (todo 404).',
      )
    }
    return null
  }

  let response: Response
  try {
    response = await fetch(reportServeUrl(base, slug, token), {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
  } catch {
    // Red caída, DNS, timeout: misma salida que un 404.
    return null
  }

  if (!response.ok) return null

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return null
  }

  const parsed = parseReportServeResponse(json)
  if (!parsed.ok) {
    if (process.env.NODE_ENV !== 'production') {
      // Sólo rutas y mensajes de forma; nunca valores del documento.
      console.warn('[avaluo/reporte] respuesta del servicio con forma inválida', parsed.issues)
    }
    return null
  }

  // El servicio respondió por OTRO documento: no se pinta.
  if (parsed.view.meta.slug !== slug) return null

  return parsed.view
}

// ---------------------------------------------------------------------------
// Fotos presignadas
// ---------------------------------------------------------------------------

/** true ⇒ ya es una URL que un `<img>` puede cargar (absoluta o del propio sitio). */
function isLoadableSrc(src: string): boolean {
  return /^https?:\/\//i.test(src) || src.startsWith('/')
}

function resolveMediaBlock(block: MediaBlock, photos: readonly ReportRenderPhoto[]): MediaBlock {
  const byKey = new Map(photos.map((photo) => [photo.key, photo.url]))
  const items = block.items.flatMap((item) => {
    const presigned = byKey.get(item.src)
    if (presigned !== undefined) return [{ ...item, src: presigned }]
    if (isLoadableSrc(item.src)) return [item]
    // Una key sin URL firmada no se puede mostrar y no debe salir al HTML.
    return []
  })
  return { ...block, items }
}

/**
 * Cruza el anexo fotográfico con `render.photos`. Es idempotente y no toca
 * ningún otro bloque; con `photos: []` sólo descarta lo que no sea una URL.
 */
export function resolveMediaUrls(view: ReportWebView): ReportWebView {
  const photos = view.render?.photos ?? []

  const sections = Object.fromEntries(
    (Object.entries(view.sections) as [SectionId, ReportSectionNode][]).map(([id, node]) => {
      if (!node.blocks.some((block) => block.kind === 'media')) return [id, node]
      const blocks: ReportBlock[] = node.blocks.map((block) =>
        block.kind === 'media' ? resolveMediaBlock(block, photos) : block,
      )
      return [id, { ...node, blocks }]
    }),
  ) as Record<SectionId, ReportSectionNode>

  return { ...view, sections }
}

// ---------------------------------------------------------------------------
// La función
// ---------------------------------------------------------------------------

/**
 * Devuelve la vista del informe, ya proyectada por pago y audiencia, o `null`
 * cuando no hay nada que mostrar (slug desconocido, token inválido, servicio
 * caído, respuesta inválida).
 *
 * `null` es deliberadamente **un solo resultado para todos los casos**: la
 * página no debe decir cuál falló. La simetría es lo que impide usar la
 * respuesta para averiguar si un slug existe.
 *
 * El tipo de retorno es `ReportServeResponse`, no `ReportWebView`: una vista
 * servida SIEMPRE trae `render` (no `null`, lo exige el validador) y puede
 * traer `delivery` (T-0007, opcional en el wire). `delivery` es ortogonal al
 * pipeline de pago/fotos — no lo tocan `toPaidProjection` ni
 * `resolveMediaUrls` — así que se vuelve a adjuntar al final desde `served`,
 * junto con `render` para restaurar el tipo no-nulo.
 */
export async function getReportView(
  params: GetReportViewParams,
): Promise<ReportServeResponse | null> {
  // No hay camino de muestra ni overrides por URL: TODO informe sale del
  // servicio, con el token del dueño. La fixture (`fixture-muestra.ts`) vive
  // sólo en los tests.
  const token = params.token?.trim() ?? ''
  // El servicio responde 404 sin token; ahorrarse el viaje no cambia la salida.
  if (token.length === 0) return null

  const served = await fetchServedView(params.slug, token)
  if (served === null) return null

  // Red de seguridad, no la defensa: el servidor ya proyectó las secciones
  // `paid`. Si dijo `paid:false`, ningún peso sale de acá aunque él lo dejara.
  const projected = served.paid ? served : toPaidProjection(served, false)

  const finalView = resolveMediaUrls(withPaywallCta(projected))
  return { ...finalView, render: served.render, delivery: served.delivery }
}

/**
 * La ruta de pago es de ESTE repo, así que la construye este repo: el servicio
 * manda `paywallCtaHref: null` y `render.submissionId`, y acá se convierte en la
 * página de estado de la solicitud, donde ya vive el botón «Pagar certificado».
 * Con el pago hecho no hay CTA.
 */
export function paywallCtaHrefFor(view: ReportWebView): string | null {
  if (view.paid || view.render === null) return null
  return `/avaluo/estado/${encodeURIComponent(view.render.submissionId)}`
}

function withPaywallCta(view: ReportWebView): ReportWebView {
  const href = paywallCtaHrefFor(view)
  if (href === view.meta.paywallCtaHref) return view
  return { ...view, meta: { ...view.meta, paywallCtaHref: href } }
}
