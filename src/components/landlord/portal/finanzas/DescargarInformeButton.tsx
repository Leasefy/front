'use client';

import { useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { ownerFinanzasApi } from '@/lib/api/owner-finanzas.service';

interface DescargarInformeButtonProps {
  agencyId: string | null;
}

/**
 * Descarga el informe PDF del propietario (`GET /informe.pdf`, blob vía agent). Degrade honesto:
 * si el portal no está habilitado (flag-OFF / no cableado) muestra un toast "Próximamente"; si
 * FALLÓ (403, 5xx, red) lo dice con un toast de error (O2). Nunca un archivo vacío ni un error
 * crudo, y nunca un rechazo sin atrapar que deja el botón colgado.
 */
export function DescargarInformeButton({ agencyId }: DescargarInformeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const resultado = await ownerFinanzasApi.getInformePdfConEstado(agencyId);
      if (resultado.estado === 'no-habilitado') {
        toast('Próximamente', {
          description: 'El informe se habilita cuando tu inmobiliaria active el Portal del Propietario.',
        });
        return;
      }
      if (resultado.estado === 'fallo') {
        toast.error('No pudimos generar el informe', {
          description:
            resultado.status === 0
              ? 'Revisa tu conexión e inténtalo de nuevo.'
              : 'El portal no respondió. Inténtalo de nuevo en un momento.',
        });
        return;
      }
      const url = URL.createObjectURL(resultado.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'informe-propietario.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No pudimos descargar el informe', {
        description: 'Inténtalo de nuevo en un momento.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={handleDownload} disabled={loading} hideArrow>
      <DownloadSimple className="w-4 h-4" />
      {loading ? 'Generando…' : 'Descargar informe'}
    </Button>
  );
}
