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
 * si el back devuelve null (flag-OFF / no cableado) muestra un toast "Próximamente", NO un archivo
 * vacío ni un error crudo.
 */
export function DescargarInformeButton({ agencyId }: DescargarInformeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const blob = await ownerFinanzasApi.getInformePdf(agencyId);
      if (!blob) {
        toast('Próximamente', {
          description: 'El informe se habilita cuando tu inmobiliaria active el Portal del Propietario.',
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'informe-propietario.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
