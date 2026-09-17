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
 *   · 🔴 D12 (17-09-2026): a cargo del propietario, dónde está SU aprobación
 *     —esperándolo, aprobada, RECHAZADA (y entonces la inmobiliaria decide qué
 *     sigue) o registrada por emergencia con el aviso que se le generó—.
 */

import { Robot, Receipt, Hourglass, CheckCircle, XCircle, Siren } from '@phosphor-icons/react';

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

  const aprobacion = solicitud.aprobacionDelPropietario ?? null;
  // Una aprobación anulada es historia sin nada que hacer: no se pinta.
  const aprobacionVisible = aprobacion && aprobacion.estado !== 'ANULADA' ? aprobacion : null;

  const pendiente =
    propuesta && !propuesta.atendidaAt && !solicitud.selectedQuoteId ? propuesta : null;
  const cotizacion = pendiente?.quoteId
    ? solicitud.quotes.find((q) => q.id === pendiente.quoteId)
    : undefined;

  if (!pendiente && !cargo && !aprobacionVisible) return null;

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

      {aprobacionVisible && (
        <div
          className="space-y-2 rounded-lg border border-border bg-surface-muted p-4"
          data-testid={`aprobacion-del-propietario-${aprobacionVisible.estado}`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            {aprobacionVisible.estado === 'PENDIENTE' && <Hourglass className="h-4 w-4" aria-hidden="true" />}
            {aprobacionVisible.estado === 'APROBADA' && <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />}
            {aprobacionVisible.estado === 'RECHAZADA' && <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />}
            {aprobacionVisible.estado === 'EMERGENCIA' && <Siren className="h-4 w-4 text-warning" aria-hidden="true" />}
            {t(k(`aprobacionDelPropietario.${aprobacionVisible.estado}`))}
          </p>
          <p className="text-sm text-fg-muted">
            {t(k('aprobacionDelPropietario.valor'), { valor: formatCurrency(aprobacionVisible.valorCop) })}
          </p>
          {aprobacionVisible.estado === 'RECHAZADA' && (
            <>
              {aprobacionVisible.motivoDeRechazo && (
                <p className="text-xs italic text-fg-muted" data-testid="aprobacion-motivo-de-rechazo">
                  «{aprobacionVisible.motivoDeRechazo}»
                </p>
              )}
              <p className="text-xs text-fg">{t(k('aprobacionDelPropietario.queSigue'))}</p>
              {onRevisar && (
                <Button
                  size="sm"
                  hideArrow
                  onClick={() => onRevisar(solicitud.id, aprobacionVisible.quoteId)}
                  data-testid="aprobacion-decidir"
                >
                  {t(k('aprobacionDelPropietario.decidir'))}
                </Button>
              )}
            </>
          )}
          {aprobacionVisible.estado === 'EMERGENCIA' && aprobacionVisible.aviso && (
            <details className="text-xs text-fg-muted" data-testid="aprobacion-aviso">
              <summary className="cursor-pointer text-fg">
                {t(k('aprobacionDelPropietario.avisoGenerado'))}: {aprobacionVisible.aviso.asunto}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans">{aprobacionVisible.aviso.cuerpo}</pre>
            </details>
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
