'use client';

/**
 * En el detalle de una solicitud de mantenimiento: lo que PROPUSO el agente y
 * el CARGO que quedó en el estado de cuenta del inquilino.
 *
 * Nico y Juan Camilo (2026-09-16):
 *   · «El agente de mantenimiento PROPONE, una persona APRUEBA.» La propuesta
 *     se ve con la cotización y la sugerencia de a cargo de quién, y lleva al
 *     mismo diálogo de aprobación que cualquier otra cotización. Una propuesta
 *     ya atendida (una persona aprobó) no se vuelve a ofrecer.
 *   · La reparación a cargo del inquilino entra a su estado de cuenta: se dice
 *     cuánto y en qué cuota.
 */

import { Robot, Receipt } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, type SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import { mesEnTitulo } from '@/lib/utils/mes';

export function PropuestaYCargoDeLaReparacion({
  solicitud,
  onRevisar,
}: {
  solicitud: SolicitudMantenimiento;
  /** Abre la aprobación de la cotización propuesta. Sin él, no se ofrece. */
  onRevisar?: (solicitudId: string, quoteId: string) => void;
}) {
  const { t, locale } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.${s}`;
  const propuesta = solicitud.propuesta;
  const cargo = solicitud.cargoAlInquilino;

  const pendiente =
    propuesta && !propuesta.atendidaAt && !solicitud.selectedQuoteId ? propuesta : null;
  const cotizacion = pendiente?.quoteId
    ? solicitud.quotes.find((q) => q.id === pendiente.quoteId)
    : undefined;

  if (!pendiente && !cargo) return null;

  return (
    <div className="space-y-3">
      {pendiente && (
        <div
          className="space-y-2 rounded-lg border border-border bg-info-soft p-4"
          data-testid="propuesta-del-agente"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Robot className="h-4 w-4" aria-hidden="true" />
            {t(k('propuesta.titulo'))}
          </p>
          <p className="text-sm text-fg">
            {cotizacion
              ? t(k('propuesta.cotizacion'), {
                  proveedor: cotizacion.providerName,
                  valor: formatCurrency(cotizacion.amount),
                })
              : t(k('propuesta.sinCotizacion'))}
          </p>
          {pendiente.aCargoDeSugerido && (
            <p className="text-sm text-fg">
              {t(
                k(
                  pendiente.aCargoDeSugerido === 'PROPIETARIO'
                    ? 'propuesta.sugierePropietario'
                    : 'propuesta.sugiereInquilino',
                ),
              )}
            </p>
          )}
          {pendiente.nota && (
            <p className="text-xs italic text-fg-muted" data-testid="propuesta-nota">
              «{pendiente.nota}»
            </p>
          )}
          <p className="text-xs text-fg-muted">{t(k('propuesta.aprobacionHumana'))}</p>
          {onRevisar && cotizacion && (
            <Button
              size="sm"
              hideArrow
              onClick={() => onRevisar(solicitud.id, cotizacion.id)}
              data-testid="propuesta-revisar"
            >
              {t(k('propuesta.revisar'))}
            </Button>
          )}
        </div>
      )}

      {cargo && (
        <div
          className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4"
          data-testid="cargo-al-inquilino"
        >
          <Receipt className="mt-0.5 h-5 w-5 text-fg-muted" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-fg">{t(k('cargoAlInquilino.titulo'))}</p>
            <p className="text-sm text-fg-muted">
              {t(k('cargoAlInquilino.detalle'), {
                valor: formatCurrency(cargo.valorCop),
                mes: mesEnTitulo(cargo.mes, locale === 'en' ? 'en' : 'es'),
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
