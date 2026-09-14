'use client';

/**
 * «Descargar PDF» suelto: lo usan el enlace público y los dos portales, donde
 * no hay nada más que compartir —quien mira ES el cliente— y un menú de una
 * sola opción es un menú de más.
 */

import { DownloadSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { useTextoDelEstado } from './textos';
import { useDescargarPdfDelEstado } from './usar-pdf';

export function BotonDescargarPDF({
  doc,
  hoy,
  nota,
}: {
  doc: EstadoDeCuenta;
  hoy: string;
  nota?: string;
}) {
  const t = useTextoDelEstado();
  const { descargar, armando } = useDescargarPdfDelEstado(doc, hoy, nota);

  return (
    <Button
      variant="secondary"
      hideArrow
      isLoading={armando}
      onClick={() => void descargar()}
      data-testid="descargar-pdf"
    >
      <DownloadSimple className="h-4 w-4" aria-hidden="true" />
      {armando ? t('estadoDeCuenta.generando') : t('estadoDeCuenta.descargarPDF')}
    </Button>
  );
}
