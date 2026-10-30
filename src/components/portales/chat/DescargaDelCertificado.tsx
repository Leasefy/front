'use client';

/**
 * El PDF del certificado recién emitido desde el chat del portal (R15, 30-10-2026):
 * el paz y salvo o el de estar al día se descarga DENTRO de la tarjeta, con la
 * sesión de la persona (mismo camino que «Mis certificados»), sin ir a otra
 * pantalla.
 */
import { useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { Button } from '@leasefy/cadence';

import { leaseDocumentsApi } from '@/lib/api/lease-documents.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

export function DescargaDelCertificado({ documentoId }: { documentoId: string }) {
  const [bajando, setBajando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bajar = async () => {
    setError(null);
    setBajando(true);
    let url: string | null = null;
    try {
      const blob = await leaseDocumentsApi.pdf(documentoId);
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificado.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setListo(true);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: 'bajar el certificado', porDefecto: 'No pude bajar el certificado. Prueba de nuevo en un momento.' }));
    } finally {
      setBajando(false);
      if (url) {
        const enlace = url;
        setTimeout(() => URL.revokeObjectURL(enlace), 30_000);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border-faint pt-3">
      {listo && (
        <p role="status" className="font-body text-[13px] leading-relaxed text-success">
          Listo: el certificado quedó en tus descargas.
        </p>
      )}
      {error && (
        <p role="alert" className="font-body text-[13px] leading-relaxed text-danger">
          {error}
        </p>
      )}
      <div>
        <Button variant="outline" size="sm" loading={bajando} disabled={bajando} onClick={() => void bajar()}>
          <DownloadSimple className="size-4" aria-hidden="true" />
          {listo ? 'Descargarlo otra vez' : 'Descargar el certificado'}
        </Button>
      </div>
    </div>
  );
}
