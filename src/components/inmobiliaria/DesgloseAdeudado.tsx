'use client';

/**
 * DesgloseAdeudado — de qué está compuesto el total que debe el inquilino.
 *
 * Existe por una razón concreta que dijo la inmobiliaria: sin el desglose a la
 * vista, la persona de facturación acepta un abono parcial creyendo que el
 * cliente quedó al día. Por eso se pinta en DOS lados —el detalle del cobro y
 * el formulario del recibo de caja— y no sólo en el detalle.
 *
 * 🔴 `valorCop` viene SIEMPRE positivo. Lo que decide si la línea suma o resta
 * es `resta`, no el signo. Pintar `valorCop` tal cual en una línea de prorrateo
 * o de retención hace que el desglose no cuadre con el total.
 *
 * 🔴 `conceptos` puede venir vacío: sólo se llena si la agencia prendió el
 * motor nuevo. En ese caso NO se inventan líneas — se muestra lo único que el
 * cobro ya permite separar (canon, administración, mora) y se dice en pantalla
 * que el desglose detallado no está disponible para esta inmobiliaria.
 */

import * as React from 'react';
import { ArrowClockwise, Warning } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Banner, Callout, KeyValueList, type KeyValueItem } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Cobro } from '@/lib/types/inmobiliaria';
import {
  enOrden,
  sumarConceptos,
  type ConceptoDelCobro,
  type TipoDeConcepto,
} from '@/lib/api/recibos-de-caja.types';

/**
 * Un peso de diferencia es redondeo; más que eso es un cobro que no cuadra y
 * hay que decirlo, no esconderlo.
 */
const TOLERANCIA_COP = 1;

export interface DesgloseAdeudadoProps {
  cobro: Cobro;
  /** Las líneas del back. `undefined` mientras carga, `[]` si la agencia no las tiene. */
  conceptos?: ConceptoDelCobro[];
  cargando?: boolean;
  /** El detalle no se pudo traer: se muestra lo que ya se tenía y se avisa. */
  fallo?: boolean;
  onReintentar?: () => void;
  /** Oculta las filas de «ya abonado / saldo pendiente» (el formulario ya las muestra). */
  sinEstadoDePago?: boolean;
  className?: string;
}

export function DesgloseAdeudado({
  cobro,
  conceptos,
  cargando = false,
  fallo = false,
  onReintentar,
  sinEstadoDePago = false,
  className,
}: DesgloseAdeudadoProps) {
  const { t, formatCurrency } = useI18n();

  const nombreDelTipo = React.useCallback(
    (tipo: TipoDeConcepto, nombre: string): string => {
      // El nombre que manda el back manda; el catálogo es el respaldo para una
      // línea sin nombre y para un tipo que todavía no conocemos.
      if (nombre?.trim()) return nombre.trim();
      const delCatalogo = t(`recibos.desglose.tipos.${tipo}`);
      return delCatalogo === `recibos.desglose.tipos.${tipo}` ? tipo : delCatalogo;
    },
    [t],
  );

  const hayConceptos = Array.isArray(conceptos) && conceptos.length > 0;
  const totales = React.useMemo(
    () => sumarConceptos(hayConceptos ? conceptos! : []),
    [conceptos, hayConceptos],
  );

  /** Lo que se pinta cuando la agencia todavía no tiene el motor de conceptos. */
  const filasDeRespaldo = React.useMemo<KeyValueItem[]>(() => {
    const filas: KeyValueItem[] = [
      { label: t('recibos.desglose.tipos.CANON'), value: formatCurrency(cobro.rentAmount) },
    ];
    if (cobro.adminAmount > 0) {
      filas.push({
        label: t('recibos.desglose.tipos.ADMINISTRACION'),
        value: formatCurrency(cobro.adminAmount),
      });
    }
    if (cobro.lateFee > 0) {
      filas.push({
        label: t('recibos.desglose.tipos.INTERES_DE_MORA'),
        value: formatCurrency(cobro.lateFee),
        valueColor: 'warning',
      });
    }
    return filas;
  }, [cobro.adminAmount, cobro.lateFee, cobro.rentAmount, formatCurrency, t]);

  const filasDeConceptos = React.useMemo<KeyValueItem[]>(() => {
    if (!hayConceptos) return [];
    const filas: KeyValueItem[] = enOrden(conceptos!).map((c) => ({
      label: c.resta
        ? `${nombreDelTipo(c.tipo, c.nombre)} (${t('recibos.desglose.resta')})`
        : nombreDelTipo(c.tipo, c.nombre),
      // El signo lo pone `resta`, nunca el valor: `valorCop` es siempre positivo.
      value: c.resta ? `− ${formatCurrency(c.valorCop)}` : formatCurrency(c.valorCop),
      valueColor: c.resta ? 'muted' : c.tipo === 'INTERES_DE_MORA' ? 'warning' : undefined,
    }));

    // Subtotal y descuentos sólo aportan cuando hay algo que restar: sin
    // retenciones, «suma de conceptos» y «total» serían la misma cifra dos veces.
    if (totales.resta > 0) {
      filas.push(
        { label: t('recibos.desglose.subtotal'), value: formatCurrency(totales.suma), muted: true },
        {
          label: t('recibos.desglose.descuentos'),
          value: `− ${formatCurrency(totales.resta)}`,
          muted: true,
        },
      );
    }
    return filas;
  }, [conceptos, formatCurrency, hayConceptos, nombreDelTipo, t, totales.resta, totales.suma]);

  const filas = hayConceptos ? filasDeConceptos : filasDeRespaldo;
  const total = hayConceptos ? totales.total : cobro.totalWithFees;
  const descuadra = hayConceptos && Math.abs(total - cobro.totalWithFees) > TOLERANCIA_COP;

  const filasDePago = React.useMemo<KeyValueItem[]>(() => {
    if (sinEstadoDePago) return [];
    const filas: KeyValueItem[] = [];
    if (cobro.paidAmount > 0) {
      filas.push({
        label: t('recibos.desglose.yaAbonado'),
        value: formatCurrency(cobro.paidAmount),
        valueColor: 'success',
      });
    }
    filas.push({
      label: t('recibos.desglose.saldo'),
      value: formatCurrency(cobro.pendingAmount),
      valueColor: cobro.pendingAmount > 0 ? 'warning' : 'success',
    });
    return filas;
  }, [cobro.paidAmount, cobro.pendingAmount, formatCurrency, sinEstadoDePago, t]);

  return (
    <div className={cn('space-y-3', className)} data-testid="desglose-adeudado">
      <p className="text-sm text-fg-muted">{t('recibos.desglose.ayuda')}</p>

      {cargando && (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Spinner size="sm" variant="current" />
          {t('recibos.desglose.cargando')}
        </p>
      )}

      {fallo && (
        <Banner variant="warning">
          <span className="flex flex-wrap items-center gap-2">
            {t('recibos.desglose.fallo')}
            {onReintentar && (
              <Button variant="link" size="sm" hideArrow className="h-auto p-0" onClick={onReintentar}>
                <ArrowClockwise className="w-3.5 h-3.5" />
                {t('recibos.desglose.reintentar')}
              </Button>
            )}
          </span>
        </Banner>
      )}

      {/* Sin conceptos NO se inventan líneas: se dice que el detalle no está. */}
      {!cargando && !hayConceptos && (
        <Callout icon={<Warning className="w-4 h-4" weight="duotone" />}>
          {t('recibos.desglose.sinDetalle')}
        </Callout>
      )}

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-2">
        <KeyValueList items={filas} />
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-border py-3">
          <span className="text-sm font-semibold text-fg">{t('recibos.desglose.total')}</span>
          <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-fg">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {descuadra && (
        <Banner variant="danger" title={t('recibos.desglose.total')}>
          {t('recibos.desglose.descuadre', {
            conceptos: formatCurrency(total),
            cobro: formatCurrency(cobro.totalWithFees),
          })}
        </Banner>
      )}

      {filasDePago.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-1">
          <KeyValueList items={filasDePago} compact />
        </div>
      )}
    </div>
  );
}

export default DesgloseAdeudado;
