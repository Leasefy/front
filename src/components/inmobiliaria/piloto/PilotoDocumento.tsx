'use client'

/**
 * PilotoDocumento — el PDF de una carta, dentro del mismo cajón.
 *
 * ── Por qué existe (pedido de Nico, 2026-09-06) ────────────────────────────
 * El cajón ofrecía «Leer el PDF antes de aprobar» como un enlace que abría
 * OTRA pestaña. Eso rompe lo que el Piloto promete —decidir sin salir de la
 * torre— justo en el peor momento: al lado está el botón que autoriza emitir
 * una carta prejurídica, y leerla antes es el único resguardo.
 *
 * ── El enlace además estaba muerto ─────────────────────────────────────────
 * 🔴 `pdfUrl` NO es un enlace: es una ubicación de almacenamiento. En la base
 * conviven tres formas —`stub://legal-artifact/…` cuando S3 no está
 * configurado, rutas sueltas como `automated_decisions_pdfs/…`, y filas de
 * semilla con `https://demo.leasefy.co/cartas/N.pdf`—. El micro filtraba las
 * dos primeras preguntando «¿empieza por http?», y la tercera pasaba: un
 * enlace que abre una pestaña vacía (Nico, 2026-09-06, mirando la carta de
 * María F.).
 *
 * El PDF de verdad se lee por el endpoint autenticado del micro, que es lo
 * que ya hace la pantalla completa de cartas. Ese endpoint es Bearer-only, así
 * que un `<iframe src>` da 401 y se ve en blanco: hay que traer los bytes con
 * el header y pintar un object URL. Mismo camino que `CartaApprovalClient`.
 *
 * ── Dónde se para (corrección de Nico, 2026-09-06) ─────────────────────────
 * 🔴 Sale del borde IZQUIERDO del cajón que lo abrió, no encima de él. Un
 * panel a pantalla completa sobre el caso se lee como «me fui a otro lado» —
 * exactamente lo que veníamos a evitar—; corrido a la izquierda se ve que el
 * caso sigue ahí, al lado, y que esto es una capa suya.
 *
 * Por eso `right` no es 0 sino el ancho del cajón padre (`sm:max-w-xl`, 36rem)
 * y el velo es transparente: un velo oscuro apagaría el caso que queremos
 * mantener a la vista. En teléfono no hay ancho para dos, así que ahí sí ocupa
 * todo.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowSquareOut, X } from '@phosphor-icons/react'
import { IconButton } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth/use-auth'

export interface PilotoDocumentoProps {
  /** El UUID del artefacto, ya sin el prefijo `art:`. `null` = cerrado. */
  artifactId: string | null
  onClose: () => void
  /** A dónde lleva «Ver la carta completa». */
  hrefCompleto?: string
}

export function PilotoDocumento({ artifactId, onClose, hrefCompleto }: PilotoDocumentoProps) {
  const { agency } = useAuth()
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const agencyId = agency?.id ?? null

  const src = useMemo(() => {
    if (!artifactId || !agentUrl || !agencyId) return null
    return `${agentUrl}/api/agency/${agencyId}/cartera/legal-artifacts/${artifactId}/pdf`
  }, [artifactId, agentUrl, agencyId])

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')

  useEffect(() => {
    if (!src) return
    let cancelado = false
    let objectUrl: string | null = null
    setEstado('cargando')
    setBlobUrl(null)
    void (async () => {
      try {
        const res = await agentFetch(src)
        if (!res.ok) throw new Error(`pdf ${res.status}`)
        const blob = await res.blob()
        if (cancelado) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        setEstado('listo')
      } catch {
        if (!cancelado) setEstado('error')
      }
    })()
    return () => {
      cancelado = true
      // Sin esto cada apertura deja un blob vivo en memoria hasta recargar.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  const faltaEntorno = Boolean(artifactId) && !src

  return (
    <Sheet open={artifactId !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        /*
         * `sm:!right-[36rem]` = el ancho del cajón padre. Va con `!` porque
         * `side="right"` ya trae su propio `right-0` y las dos utilidades
         * tienen la misma especificidad: sin la marca gana la que el bundler
         * ponga última, que no se controla desde acá.
         */
        className="flex w-full flex-col gap-0 border-r border-border p-0 sm:!right-[36rem] sm:max-w-xl sm:!rounded-r-none"
        /* Velo transparente: el caso de al lado tiene que seguir legible. */
        overlayClassName="bg-transparent"
        data-testid="piloto-documento"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="text-h3 text-fg">El documento</SheetTitle>
              <SheetDescription className="text-body-sm text-fg-muted">
                Léelo antes de autorizar que salga.
              </SheetDescription>
            </div>
            <IconButton
              icon={<X weight="bold" className="h-4 w-4" />}
              aria-label="Cerrar el documento"
              variant="ghost"
              size="sm"
              onClick={onClose}
            />
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 bg-surface-muted p-4">
          {faltaEntorno ? (
            <Mensaje
              titulo="No se puede abrir el documento acá"
              texto="Falta la conexión con el servicio de agentes en este entorno. La carta sigue disponible en su pantalla completa."
            />
          ) : estado === 'error' ? (
            <Mensaje
              tono="danger"
              titulo="No se pudo cargar el PDF"
              texto="El documento no respondió. Esto no significa que la carta esté mal: significa que no la pudimos traer para mostrártela, y no conviene aprobar algo que no leíste."
            />
          ) : estado === 'cargando' ? (
            <div
              className="h-full w-full animate-pulse rounded-lg border border-border bg-surface"
              role="status"
              aria-label="Cargando el documento"
            />
          ) : (
            <iframe
              data-testid="piloto-documento-pdf"
              title="El documento de la carta"
              src={blobUrl ?? 'about:blank'}
              className="h-full w-full rounded-lg border border-border bg-surface"
            />
          )}
        </div>

        {hrefCompleto && (
          <footer className="shrink-0 border-t border-border bg-surface px-6 py-4">
            {/* La primaria a la derecha, la secundaria a la izquierda. */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" size="sm" hideArrow onClick={onClose}>
                Volver al caso
              </Button>
              <Button asChild size="sm" hideArrow>
                <Link href={hrefCompleto} target="_blank" rel="noopener noreferrer">
                  Ver la carta completa
                  <ArrowSquareOut weight="bold" className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Mensaje({
  tono = 'info',
  titulo,
  texto,
}: {
  tono?: 'info' | 'danger'
  titulo: string
  texto: string
}) {
  return (
    <div
      role={tono === 'danger' ? 'alert' : undefined}
      className={`rounded-lg border px-4 py-3 ${
        tono === 'danger'
          ? 'border-danger/30 bg-danger-soft text-danger'
          : 'border-border bg-surface text-fg-muted'
      }`}
    >
      <p className="text-body-sm font-medium">{titulo}</p>
      <p className="mt-1 text-caption leading-relaxed">{texto}</p>
    </div>
  )
}
