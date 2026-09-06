'use client';

import { DownloadSimple, ArrowSquareOut, UploadSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';

interface ContratoPdfModalProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  /** URL directa del PDF (viene firmada del back, no lleva Bearer). */
  url: string;
  /** Abre el selector de archivos para subir otro PDF. */
  onReemplazar?: () => void;
  /** Hay una subida en curso: el botón de reemplazar lo dice y se apaga. */
  subiendo?: boolean;
}

/**
 * El contrato de consignación se lee DENTRO del panel.
 *
 * Nico (2026-09-04): «cuando le den clic en contrato que se abra pero dentro de
 * saleads, quizás en un modal o algo pero que no lo saquemos de la experiencia.
 * Y le demos opciones, descargar etc…». Antes la fila era un `<a target="_blank">`
 * que mandaba a la persona a una pestaña del visor del navegador, fuera del
 * panel y sin nada más que hacer que volver.
 *
 * El PDF va en un `<iframe>` a pelo porque `consignmentContractUrl` es una URL
 * directa del storage: no hay header que adjuntar, así que no hace falta el
 * baile de blob/objectURL de `CertificatePdfViewer` (ése sí pega a una ruta con
 * Bearer). Y como un `<iframe>` de PDF puede quedar en blanco —Firefox con el
 * visor apagado, un bloqueador, una política del sistema—, debajo queda SIEMPRE
 * visible el enlace para abrirlo aparte: una pantalla en blanco sin salida es
 * peor que la pestaña que estábamos sacando.
 */
export function ContratoPdfModal({
  abierto,
  onAbiertoChange,
  url,
  onReemplazar,
  subiendo = false,
}: ContratoPdfModalProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.consignaciones.detail.${s}`;

  return (
    // Radix ya cierra con Escape y con clic afuera: no hay que cablearlo.
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent
        className="max-w-4xl max-h-[min(900px,92dvh)]"
        data-testid="contrato-pdf-modal"
      >
        <DialogHeader>
          <DialogTitle>{t(k('consignmentContract'))}</DialogTitle>
          <DialogDescription>{t(k('consignmentContractDesc'))}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <iframe
            src={url}
            title={t(k('consignmentContractPreview'))}
            className="h-[70vh] w-full rounded-md border border-border bg-surface-muted"
            data-testid="contrato-pdf-iframe"
          />
          {/* Respaldo siempre a la vista, no sólo cuando falla: no hay forma
              confiable de detectar que el visor del navegador no pintó nada. */}
          <p className="text-xs text-fg-muted" data-testid="contrato-pdf-respaldo">
            {t(k('consignmentContractNoPreview'))}{' '}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {t(k('consignmentContractOpenTab'))}
            </a>
          </p>
        </div>

        <DialogFooter>
          {onReemplazar && (
            <Button
              type="button"
              variant="outline"
              hideArrow
              onClick={onReemplazar}
              disabled={subiendo}
              className="gap-2 sm:mr-auto"
              data-testid="contrato-pdf-reemplazar"
            >
              <UploadSimple className="h-4 w-4" />
              {subiendo
                ? t(k('consignmentContractUploading'))
                : t(k('consignmentContractReplace'))}
            </Button>
          )}
          <Button asChild variant="outline" hideArrow className="gap-2">
            <a href={url} target="_blank" rel="noreferrer" data-testid="contrato-pdf-pestana">
              <ArrowSquareOut className="h-4 w-4" />
              {t(k('consignmentContractOpenTab'))}
            </a>
          </Button>
          <Button asChild hideArrow className="gap-2">
            {/* `download` es sugerencia: contra otro origen el navegador puede
                ignorarlo y navegar. Igual es el camino correcto y el único que
                el front controla. */}
            <a href={url} download target="_blank" rel="noreferrer" data-testid="contrato-pdf-descargar">
              <DownloadSimple className="h-4 w-4" />
              {t(k('consignmentContractDownload'))}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
