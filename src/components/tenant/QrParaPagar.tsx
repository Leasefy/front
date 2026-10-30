'use client';

/**
 * EL QR DEL BANCO para pagar (Nico 29-10-2026: «demos opción también con llave de Bre-B y QR»). El inquilino lo escanea
 * con la app de su banco. Desde el celular no puede escanear su propia pantalla: por eso «Abrir el QR», para guardarlo
 * y leerlo desde la galería en la app del banco. La imagen es la captura que subió la inmobiliaria, con su fondo.
 */

import { ArrowSquareOut } from '@phosphor-icons/react';

export function QrParaPagar({ url, nombre }: { url: string; nombre: string }) {
  return (
    <div className="flex items-center gap-4 rounded-md bg-surface-muted p-3" data-testid="qr-para-pagar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`QR para pagar a ${nombre}`}
        className="h-32 w-32 shrink-0 rounded-md border border-border bg-surface object-contain"
      />
      <div className="min-w-0 space-y-1.5 text-sm">
        <p className="text-fg">Escanéalo con la app de tu banco.</p>
        <p className="text-caption text-fg-muted">Si estás en el celular, ábrelo, guárdalo y léelo desde la galería en la app.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-caption text-primary underline-offset-4 hover:underline"
        >
          Abrir el QR
          <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
