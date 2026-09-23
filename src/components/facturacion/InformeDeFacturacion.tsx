'use client'

/**
 * El informe de una corrida de «Generar» (auditoría de casos de error 13-09, F2).
 *
 * Molde: el informe de lote de `migracion/MigrarAsientos.tsx`. Una corrida de
 * 3.824 facturas puede terminar de cuatro formas —entera, detenida, sin números
 * de la resolución o con una tanda caída— y en las cuatro la persona necesita
 * las mismas tres respuestas: cuántas salieron, cuántas no y por qué, y qué
 * hacer ahora.
 *
 * 🔴 Lo que se puede prometer y lo que no. Volver a apretar «Generar» es
 * SEGURO: el back es idempotente por la llave `(contract_id, mes,
 * destinatario)`. Lo que NO se puede afirmar es cuántas de una tanda caída
 * quedaron escritas: el back no lo devuelve cuando la conexión se corta. Por
 * eso esas se dicen «sin confirmar», no «no emitidas».
 */

import { CheckCircle, DownloadSimple, Warning, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { mesLegible } from '@/lib/api/facturacion-por-mes.service'
import { cn } from '@/lib/utils'
import { quedaronPendientes, type ResultadoDeLaCorrida } from './facturasPorTandas'
import { motivoParaNoDescargarLote, useDescargarFacturas, vaPorElCentro } from './useDescargarFacturas'

const numero = (n: number) => n.toLocaleString('es-CO')
const facturas = (n: number) => `${numero(n)} ${n === 1 ? 'factura' : 'facturas'}`

/** El mensaje del back si lo hay (vienen en castellano), o uno honesto. */
export function mensajeDelFalloDeEmision(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'No se pudieron emitir las facturas.'
}

export function InformeDeFacturacion({
  corrida,
  onCerrar,
}: {
  corrida: ResultadoDeLaCorrida
  onCerrar: () => void
}) {
  const { informe, corte, error } = corrida
  /*
   * 🔴 Nico, 22-09: «ya acabo de facturar y yo dónde puedo descargar el lote».
   * El aviso decía «Se emitió 1 factura» y sólo ofrecía «Cerrar». Una → su PDF;
   * varias → el ZIP de ESTA corrida; más del tope → apagado diciendo por qué.
   */
  const { descargarLote, descargando, zipEnElCentro } = useDescargarFacturas()
  const documentos = informe.documentos ?? []
  const noSeDescarga = motivoParaNoDescargarLote(documentos.length)
  const pendientes = quedaronPendientes(informe)
  const nadaSalio = informe.emitidas === 0

  const Icono = !pendientes ? CheckCircle : nadaSalio ? WarningCircle : Warning
  const tono = !pendientes ? 'text-success' : nadaSalio ? 'text-danger' : 'text-warning'

  const titulo =
    informe.emitidas > 0
      ? `${informe.emitidas === 1 ? 'Se emitió 1 factura' : `Se emitieron ${numero(informe.emitidas)} facturas`} · ${formatCurrency(informe.totalCop)}`
      : 'No se emitió ninguna factura'

  const lineas: { clave: string; texto: string }[] = []
  if (informe.yaEstaban > 0) {
    lineas.push({
      clave: 'ya-estaban',
      texto: `${facturas(informe.yaEstaban)} ya estaban emitidas: no se duplicaron.`,
    })
  }
  if (informe.yaNoEstabanPorEmitir > 0) {
    lineas.push({
      clave: 'ya-no-estaban',
      texto: `${facturas(informe.yaNoEstabanPorEmitir)} ya no estaban por emitir cuando llegó la orden: alguien las emitió antes o el contrato dejó de tocar el mes.`,
    })
  }
  if (informe.sinNumero > 0) {
    lineas.push({
      clave: 'sin-numero',
      texto: `${facturas(informe.sinNumero)} quedaron sin número. ${informe.motivos.join(' ')}`.trim(),
    })
  }
  if (informe.sinConfirmar > 0) {
    lineas.push({
      clave: 'sin-confirmar',
      texto: `${facturas(informe.sinConfirmar)} de la tanda que falló no se pudieron confirmar: puede que parte haya quedado emitida. Motivo: ${mensajeDelFalloDeEmision(error)}`,
    })
  }
  if (informe.sinEnviar > 0) {
    lineas.push({
      clave: 'sin-enviar',
      texto:
        corte === 'detenida'
          ? `${facturas(informe.sinEnviar)} no se enviaron porque detuviste la corrida.`
          : corte === 'rangoAgotado'
            ? `${facturas(informe.sinEnviar)} no se enviaron: sin números disponibles habrían fallado igual.`
            : `${facturas(informe.sinEnviar)} no se alcanzaron a enviar.`,
    })
  }

  const queHacer = !pendientes
    ? null
    : corte === 'rangoAgotado'
      ? 'Carga la resolución nueva en la pestaña «Resolución» y vuelve a apretar «Generar»: las que ya salieron no se duplican.'
      : 'Vuelve a apretar «Generar»: la lista ya se actualizó y las que salieron no se duplican.'

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5 shadow-sm"
      role="status"
      data-testid="facturacion-informe"
      data-corte={corte}
    >
      <div className="flex items-start gap-3">
        <Icono className={cn('mt-0.5 h-5 w-5 shrink-0', tono)} weight="fill" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-medium text-fg">{titulo}</h3>
          <p className="text-caption text-fg-muted tabular-nums">
            {mesLegible(informe.mes)} · {numero(informe.pedidas)} {informe.pedidas === 1 ? 'elegida' : 'elegidas'}
          </p>
          {lineas.length > 0 && (
            <ul className="mt-2 space-y-1 text-body-sm text-fg-muted">
              {lineas.map((l) => (
                <li key={l.clave} data-testid={`facturacion-informe-${l.clave}`}>
                  {l.texto}
                </li>
              ))}
            </ul>
          )}
          {/* Más de 50: el ZIP lo arma el centro de procesos (22-09). */}
          {vaPorElCentro(documentos.length) && (
            <p className="mt-2 text-body-sm text-fg-muted" data-testid="facturacion-informe-por-el-centro">
              {zipEnElCentro
                ? `Armando el ZIP en el centro de procesos${
                    zipEnElCentro.total
                      ? ` · ${Math.min(zipEnElCentro.hechos, zipEnElCentro.total).toLocaleString('es-CO')} de ${zipEnElCentro.total.toLocaleString('es-CO')} PDF`
                      : ''
                  }. Si te vas, lo bajas desde el botón de procesos de arriba.`
                : `Son ${numero(documentos.length)} facturas: el ZIP se arma en el centro de procesos y se baja de ahí.`}
            </p>
          )}
          {documentos.length > 0 && noSeDescarga && (
            <p className="mt-2 text-body-sm text-fg-muted" data-testid="facturacion-informe-sin-descarga">
              {noSeDescarga}
            </p>
          )}
          {queHacer && (
            <p className="mt-2 text-body-sm font-medium text-fg" data-testid="facturacion-informe-que-hacer">
              {queHacer}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {documentos.length > 0 && (
            <Button
              size="sm"
              hideArrow
              disabled={noSeDescarga !== null || descargando !== null}
              isLoading={descargando !== null}
              title={noSeDescarga ?? undefined}
              onClick={() =>
                void descargarLote(documentos, `facturas-${informe.mes}-${documentos.length}.zip`, {
                  procesosConZip: informe.procesosConZip ?? [],
                })
              }
              data-testid="facturacion-informe-descargar"
            >
              <DownloadSimple className="h-4 w-4" weight="bold" aria-hidden="true" />
              {documentos.length === 1 ? 'Descargar la factura' : 'Descargar las facturas'}
            </Button>
          )}
          <Button variant="outline" size="sm" hideArrow onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </section>
  )
}
