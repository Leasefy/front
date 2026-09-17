'use client';

/**
 * Las deducciones de UNA liquidación: el neto del mes, cada deducción con su
 * soporte, el neto a girar y —si las deducciones lo superan— cuánto pasa a la
 * siguiente liquidación.
 *
 * 🔴 Acá no se hace ninguna cuenta. Los números vienen del back, calculados con
 * la regla única (`back-erp/src/inmobiliaria/deducciones/neto-con-deducciones.ts`):
 * la vista previa, la dispersión, el lote, el extracto y sus PDF dicen el mismo
 * número porque ninguno lo saca por su lado. Sin deducciones el bloque no se
 * pinta: la liquidación se lee como siempre.
 */

import { Warning } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useI18n } from '@/lib/i18n';
import type { DeduccionesDeLaLiquidacion } from '@/lib/types/deducciones';
import { SoporteDeLaDeduccion } from './SoporteDeLaDeduccion';

export function BloqueDeDeducciones({
  bloque,
  propietarioId,
  className,
}: {
  bloque: DeduccionesDeLaLiquidacion | null | undefined;
  /** Para abrir los soportes. Sin él, se muestra el nombre del archivo y nada más. */
  propietarioId?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.liquidacion.${s}`;
  if (!bloque || bloque.deducciones.length === 0) return null;

  return (
    <section
      className={cn('space-y-3 rounded-lg border border-border bg-surface p-4', className)}
      data-testid="bloque-de-deducciones"
    >
      <h3 className="font-mono text-xs uppercase tracking-wide text-fg-muted">{t(k('titulo'))}</h3>

      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-muted">{t(k('netoDelMes'))}</span>
        <span className="font-mono tabular-nums text-fg">{formatCurrency(bloque.netoDelMesCop)}</span>
      </div>

      <ul className="space-y-2">
        {bloque.renglones.map((renglon, i) => {
          const deduccion = bloque.deducciones[i];
          return (
            <li key={deduccion?.id ?? i} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-fg">{renglon.concepto}</p>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                  {deduccion?.fecha && <span className="font-mono tabular-nums">{deduccion.fecha}</span>}
                  {deduccion?.tieneSoporte &&
                    (propietarioId ? (
                      <SoporteDeLaDeduccion
                        propietarioId={propietarioId}
                        deduccionId={deduccion.id}
                        nombre={deduccion.soporteNombre}
                      />
                    ) : (
                      <span>{deduccion.soporteNombre}</span>
                    ))}
                </div>
              </div>
              <span className="whitespace-nowrap font-mono tabular-nums text-danger">
                −{formatCurrency(-renglon.valorCop)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="font-semibold text-fg">{t(k('aGirar'))}</span>
        <span
          className="font-mono font-semibold tabular-nums text-success"
          data-testid="bloque-a-girar"
        >
          {formatCurrency(bloque.aGirarCop)}
        </span>
      </div>

      {bloque.saldoEnContraCop > 0 && (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-warning-soft p-3"
          data-testid="bloque-saldo-en-contra"
        >
          <Warning className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" weight="fill" />
          <p className="text-xs text-fg">
            {t(k('saldoEnContraAviso'), { valor: formatCurrency(bloque.saldoEnContraCop) })}
          </p>
        </div>
      )}
    </section>
  );
}
