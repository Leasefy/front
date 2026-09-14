'use client';

/**
 * Bajar el estado de cuenta como PDF.
 *
 * Vive aparte porque lo usan tres pantallas distintas —el panel (dentro de
 * «Compartir»), la página pública del enlace y los dos portales— y el archivo
 * tiene que llamarse igual y salir igual en las tres.
 *
 * El import es DINÁMICO: `@react-pdf/renderer` son ~600 KB que no tienen por
 * qué entrar al bundle de quien nunca baja el PDF. Es el mismo patrón de
 * `CallDetailClient`.
 */

import * as React from 'react';

import { toast } from '@/components/ui/toast';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { texto } from './textos';

/** `J Y C PAPAS S.A.S` → `j-y-c-papas-s-a-s`. Para el nombre del archivo. */
export function comoNombreDeArchivo(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'cliente'
  );
}

export function nombreDelArchivo(doc: EstadoDeCuenta, hoy: string): string {
  return `estado-de-cuenta-${comoNombreDeArchivo(doc.cliente.nombre)}-${hoy}.pdf`;
}

export interface UsarPdfDelEstado {
  descargar: () => Promise<void>;
  armando: boolean;
}

export function useDescargarPdfDelEstado(
  doc: EstadoDeCuenta | null,
  hoy: string,
  nota?: string,
): UsarPdfDelEstado {
  const [armando, setArmando] = React.useState(false);

  const descargar = React.useCallback(async () => {
    if (!doc || armando) return;
    setArmando(true);
    try {
      const [{ pdf }, { EstadoDeCuentaPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./estado-de-cuenta-pdf'),
      ]);
      /*
       * El `as` es por el tipo, no por la forma: `EstadoDeCuentaPDF` devuelve
       * un `<Document>` de @react-pdf, pero su firma dice `JSX.Element` y
       * `pdf()` pide un `ReactElement<DocumentProps>`. Si algún día dejara de
       * devolver un Document, el PDF saldría vacío y su propia prueba lo
       * atraparía antes que esto.
       */
      const elemento = React.createElement(EstadoDeCuentaPDF, {
        doc,
        hoy,
        nota,
      }) as unknown as Parameters<typeof pdf>[0];
      const blob = await pdf(elemento).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreDelArchivo(doc, hoy);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(texto('estadoDeCuenta.falloPDF'));
    } finally {
      setArmando(false);
    }
  }, [doc, hoy, nota, armando]);

  return { descargar, armando };
}
