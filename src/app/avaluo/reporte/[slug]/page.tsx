/**
 * /avaluo/reporte/[slug] — el informe de estimación comercial, consultable.
 *
 * Ubicación: cuelga de `/avaluo`, que es una raíz que este repo ya declara.
 * NO va bajo `(landing)`: ese grupo carga otras fuentes por una excepción
 * declarada y monta el encabezado y el pie comerciales encima de todo, y un
 * documento que va a leer un banco no quiere el menú de marketing arriba.
 *
 * Server Component: arma la página desde el Report Model y entrega al cliente
 * una estructura ya resuelta. La única isla que se hidrata es el índice lateral.
 *
 * Es LA entrega del avalúo (la web es el entregable principal; el PDF, la
 * descarga secundaria): siempre encendida, sin bandera. Sin `?token=` válido
 * del dueño responde 404, igual que el certificado.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReporteAvaluoShell } from '@/components/avaluo/reporte/ReporteAvaluoShell'
import { reportPdfUrl } from '@/lib/api/avaluo.service'
import { resolveDelivery } from '@/lib/avaluo/reporte/delivery'
import { buildLandingView } from '@/lib/avaluo/reporte/landing-layout'
import { getReportView } from '@/lib/avaluo/reporte/report-view.data'
import '../report-panel.css'
import '../report-print.css'

/**
 * Un informe con datos de un inmueble y de su dueño NO se indexa. Además hay
 * que dejarlo en `src/app/robots.ts` — la etiqueta `noindex` sólo la ve quien
 * ya entró, y `robots.txt` es lo que evita que entren.
 */
export const metadata: Metadata = {
  title: 'Informe de estimación comercial | Leasefy',
  description: 'Estimación comercial de valor referencial, consultable y verificable.',
  robots: { index: false, follow: false },
}

type SearchParams = Record<string, string | string[] | undefined>

interface PageProps {
  // Next 15 resuelve `params` de forma asíncrona; en 14.2 `await` sobre el
  // objeto plano es inocuo. Se escribe así para que un upgrade no lo toque.
  params: Promise<{ slug: string }>
  searchParams?: Promise<SearchParams>
}

function readParam(params: SearchParams, key: string): string | null {
  const value = params[key]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

export default async function ReporteAvaluoPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const query = (await searchParams) ?? {}

  // `token` es el capability token del DUEÑO (el de certificate/memoria). El
  // servicio lo valida y devuelve el informe con su sello real; sin él, o con
  // uno ajeno, responde el mismo 404. El pago y la audiencia los decide quien
  // sirve la vista a partir del token — jamás la query string. El enlace
  // compartido revocable es v2.
  const token = readParam(query, 'token')
  const view = await getReportView({ slug, token })

  // Una sola salida para todos los casos —slug desconocido, enlace vencido,
  // enlace revocado—: la página no dice cuál falló. Esa simetría es lo que
  // impide usar la respuesta para averiguar si un documento existe.
  if (view === null) notFound()

  // El gate (T-0007): `delivery` ausente o roto ⇒ DENIED — nada de PDF, nada
  // de verificar, nada de exportar, y el aviso de reserva. Es la ÚNICA fuente
  // de estas capacidades; nada más en esta página las computa.
  const capabilities = resolveDelivery(view)

  // «Descargar el PDF» = el nuevo informe (E2), con el token del dueño. Se
  // arma ACÁ (servidor) y baja como prop: el cliente nunca lee el token de la
  // URL. `null` a menos que la entrega lo permita — offreciendo la URL en el
  // HTML sin ese permiso sería entregarla gratis aunque el servidor la
  // rechace (E2 gatea de verdad; esto es defensa en profundidad, no el
  // control real).
  const downloadHref =
    capabilities.canDownloadPdf && token !== null ? reportPdfUrl(slug, token) : null

  // El reloj de lo temporal (vigencia): con documento servido gana el del
  // servidor (`render.nowIso`); la muestra usa el de esta petición.
  const landing = buildLandingView(view, { nowIso: new Date().toISOString() })

  return (
    <ReporteAvaluoShell view={landing} downloadHref={downloadHref} capabilities={capabilities} />
  )
}
