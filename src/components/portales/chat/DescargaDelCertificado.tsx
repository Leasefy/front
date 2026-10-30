'use client';

/**
 * El PDF del certificado recién emitido desde el chat del portal (R15, 30-10-2026):
 * el paz y salvo o el de estar al día se descarga DENTRO de la tarjeta, con la
 * sesión de la persona (mismo camino que «Mis certificados»), sin ir a otra
 * pantalla. Desde D1 (30-10) usa la pieza común del chat, `DescargaEnElChat`.
 */
import { DescargaEnElChat } from '@/components/beta/DescargaEnElChat';
import { leaseDocumentsApi } from '@/lib/api/lease-documents.service';
import { descargarBlob } from '@/lib/reportes/exportables';

export function DescargaDelCertificado({ documentoId }: { documentoId: string }) {
  return (
    <DescargaEnElChat
      etiqueta="Descargar el certificado"
      accion="bajar el certificado"
      bajar={async () => descargarBlob(await leaseDocumentsApi.pdf(documentoId), 'certificado.pdf')}
    />
  );
}
