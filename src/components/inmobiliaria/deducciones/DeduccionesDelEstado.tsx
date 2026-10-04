'use client';

/**
 * 🔴 SO-09 (QA del 04-10): el giro de octubre de Paula ya restaba la
 * reparación de $180.000 y un descuento de $50.000 (neto $3.426.150) y su
 * estado de cuenta no decía nada: «recibirá $230.000 menos sin ver por qué».
 * Regla del CEO (16-09): el propietario ve cada descuento en su extracto, con
 * el soporte.
 *
 * El bloque «Descuentos de tus giros» del estado de cuenta del PROPIETARIO
 * (portal, vista de la inmobiliaria y enlace compartido): concepto, inmueble,
 * soporte, mes, valor y estado. «Por descontar» es la MISMA cifra que «Por
 * girar» ya resta (`porGirar.deduccionesCop` del back): cuadra con el giro.
 */

import { useState } from 'react';
import { FileText, Wrench, Receipt } from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/format';
import { nombreDelMes } from '@/lib/utils/mes';
import { cn } from '@/lib/utils';

import type { DeduccionDelEstado, DeduccionesDelEstadoDto } from '@/lib/types/estado-de-cuenta';
export type { DeduccionDelEstado, DeduccionesDelEstadoDto };

export const ORIGEN_DE_LA_DEDUCCION: Record<string, string> = {
  REPARACION: 'Reparación',
  MANUAL: 'Descuento',
  SALDO_ANTERIOR: 'Saldo del mes anterior',
  COBRO_AL_ARRENDAR: 'Cobro al arrendar',
  RETENCION_DEL_INQUILINO: 'Retención del inquilino',
};
const ORIGEN = ORIGEN_DE_LA_DEDUCCION;

export function estadoDeLaDeduccionEnPalabras(d: Pick<DeduccionDelEstado, 'estado' | 'mes'>): string {
  const mes = nombreDelMes(d.mes);
  if (d.estado === 'APLICADA') return `Descontada en el giro de ${mes}`;
  if (d.estado === 'EN_LIQUIDACION') return `En la liquidación de ${mes}`;
  return `Pendiente: se descuenta en tu próximo giro (desde ${mes})`;
}

export function DeduccionesDelEstado({
  deducciones,
  abrirSoporte,
  className,
}: {
  deducciones: DeduccionesDelEstadoDto | null | undefined;
  /** Firma el soporte y devuelve su URL. Sin él, el soporte sólo se nombra. */
  abrirSoporte?: (deduccionId: string) => Promise<string>;
  className?: string;
}) {
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [falla, setFalla] = useState<string | null>(null);
  if (!deducciones || deducciones.filas.length === 0) return null;

  const abrir = async (id: string) => {
    if (!abrirSoporte) return;
    setAbriendo(id);
    setFalla(null);
    try {
      const url = await abrirSoporte(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setFalla('No se pudo abrir el soporte. Prueba de nuevo en un momento.');
    } finally {
      setAbriendo(null);
    }
  };

  return (
    <section
      className={cn('break-inside-avoid', className)}
      data-testid="estado-deducciones"
      aria-labelledby="estado-deducciones-titulo"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-2">
        <h2 id="estado-deducciones-titulo" className="text-h4 font-semibold text-fg">
          Descuentos de tus giros
        </h2>
        <p className="text-body-sm text-fg-muted">
          Por descontar:{' '}
          <span className="font-mono tabular-nums text-fg" data-testid="estado-deducciones-por-descontar">
            {formatCurrency(deducciones.porDescontarCop)}
          </span>
          {deducciones.aplicadasCop > 0 && (
            <>
              {' · '}Ya descontado:{' '}
              <span className="font-mono tabular-nums">{formatCurrency(deducciones.aplicadasCop)}</span>
            </>
          )}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {deducciones.filas.map((d) => (
          <li
            key={d.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
            data-testid={`estado-deduccion-${d.id}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {d.origen === 'REPARACION' ? (
                <Wrench className="mt-0.5 h-4 w-4 flex-shrink-0 text-fg-muted" aria-hidden="true" />
              ) : (
                <Receipt className="mt-0.5 h-4 w-4 flex-shrink-0 text-fg-muted" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-fg">
                  {ORIGEN[d.origen] ?? 'Descuento'}: {d.concepto}
                </p>
                <p className="text-xs text-fg-muted">
                  {[d.inmueble, estadoDeLaDeduccionEnPalabras(d)].filter(Boolean).join(' · ')}
                </p>
                {d.tieneSoporte &&
                  (abrirSoporte ? (
                    <button
                      type="button"
                      onClick={() => void abrir(d.id)}
                      disabled={abriendo === d.id}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline print:hidden"
                      data-testid={`estado-deduccion-soporte-${d.id}`}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      {abriendo === d.id ? 'Abriendo…' : `Ver soporte${d.soporteNombre ? ` (${d.soporteNombre})` : ''}`}
                    </button>
                  ) : (
                    <p className="mt-1 text-xs text-fg-muted">Soporte: {d.soporteNombre ?? 'adjunto'}</p>
                  ))}
              </div>
            </div>
            <p
              className={cn(
                'font-mono text-body-sm tabular-nums sm:text-right',
                d.estado === 'APLICADA' ? 'text-fg-muted' : 'text-fg',
              )}
            >
              −{formatCurrency(d.valorCop)}
            </p>
          </li>
        ))}
      </ul>
      {falla && <p className="mt-2 text-xs text-danger">{falla}</p>}
    </section>
  );
}
