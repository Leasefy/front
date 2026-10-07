'use client';

/**
 * Los recibos de caja del inquilino, en «Documentos» de su portal (QA-INQ-95,
 * 04-10-2026). Antes la sección «Recibos (comprobante interno)» listaba sus
 * INTENTOS de pago —también los rechazados— y prometía «El comprobante en PDF
 * descargable llegará con Pagos». Ahora son los recibos que la inmobiliaria le
 * emitió de verdad, cada uno con su PDF.
 */
import { useState } from 'react';
import { Download, Money } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { useI18n } from '@/lib/i18n';
import { recibosDelInquilinoApi, type ReciboDelInquilino } from '@/lib/api/recibos-del-inquilino.service';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «Cuota de agosto de 2026», o «Abono a la deuda del contrato» sin mes. */
export function conceptoDelRecibo(r: Pick<ReciboDelInquilino, 'mes'>): string {
  if (!r.mes) return 'Abono a la deuda del contrato';
  const [a, m] = r.mes.split('-').map(Number);
  return `Cuota de ${MESES[(m ?? 1) - 1]} de ${a}`;
}

export function RecibosDeCaja({
  recibos,
  error,
  onReintentar,
}: {
  recibos: ReciboDelInquilino[];
  error: unknown;
  onReintentar: () => void;
}) {
  const { formatCurrency } = useI18n();
  const [bajando, setBajando] = useState<string | null>(null);

  const descargar = async (r: ReciboDelInquilino) => {
    let url: string | null = null;
    setBajando(r.id);
    try {
      const blob = await recibosDelInquilinoApi.pdf(r.id);
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-de-caja-${r.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { accion: 'descargar el recibo', porDefecto: 'No pudimos descargar el recibo.' }));
    } finally {
      setBajando(null);
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
    }
  };

  return (
    <div data-testid="recibos-de-caja">
      <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">Recibos de caja</p>
      <p className="text-xs text-fg-muted dark:text-fg-subtle mb-3">
        Los que te emitió tu inmobiliaria por cada pago. Son comprobantes de pago; la factura electrónica la emite la
        inmobiliaria por separado.
      </p>
      {error ? (
        <FalloDeCarga error={error} queEs="tus recibos" onReintentar={onReintentar} />
      ) : recibos.length === 0 ? (
        <p className="text-sm text-fg-muted dark:text-fg-subtle">Todavía no tienes recibos de caja.</p>
      ) : (
        <div className="space-y-2">
          {recibos.map((r) => (
            <div
              key={r.id}
              data-testid={`recibo-${r.numero}`}
              className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-border flex items-center justify-center flex-shrink-0">
                <Money className="w-5 h-5 text-fg-muted dark:text-fg-subtle" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg dark:text-white">
                  Recibo de caja N.º {r.numero} · {conceptoDelRecibo(r)}
                </p>
                <p className="text-xs text-fg-muted dark:text-fg-subtle">
                  <span className="font-mono tabular-nums">{formatCurrency(r.valorCop)}</span> · {r.medio} ·{' '}
                  {fechaLarga(r.fecha)}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void descargar(r)}
                disabled={bajando === r.id}
                aria-label={`Descargar el recibo de caja N.º ${r.numero}`}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                {bajando === r.id ? 'Descargando…' : 'Descargar PDF'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
