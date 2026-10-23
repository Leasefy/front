'use client';

import { useState } from 'react';
import { mesEnTitulo } from '@/lib/utils/mes';
import { Collapse, Pressable, Stagger, StaggerItem } from '@leasefy/cadence';
import {
  Buildings,
  Warning,
  CurrencyCircleDollar,
  CaretRight,
  CaretDown,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Badge, Button, Spinner } from '@/components/ui';
import type { Dispersion, DispersionStatus } from '@/lib/types/inmobiliaria';
import {
  formatCurrency,
  getDispersionStatusColor,
  getDispersionStatusLabel,
} from '@/lib/types/inmobiliaria';
import { conSigno } from '@/lib/plata/escribir-plata';
import { ROTULO_DEL_CANON } from '@/lib/propietarios/base-del-canon';
import { enmascarar } from '@/components/inmobiliaria/medios-de-pago/legible';
import { useTr, useLocaleDeFechas } from '@/lib/i18n/use-tr';
import { diaEnColombia, fechaCorta } from '@/lib/fechas/fecha-de-la-casa';

interface DispersionCardProps {
  dispersion: Dispersion;
  onViewDetail?: (dispersion: Dispersion) => void;
  onProcess?: (dispersion: Dispersion) => void;
  compact?: boolean;
}

// Status border colors for left accent
/** El mismo Badge que la tabla del paso 2 (punto + palabra), no un bloque de color. */
const VARIANTE_DEL_ESTADO = {
  pending: 'warning',
  processing: 'default',
  completed: 'success',
  failed: 'destructive',
} as const satisfies Record<DispersionStatus, string>;

const STATUS_BORDER_COLORS: Record<DispersionStatus, string> = {
  pending: 'border-l-warning',
  processing: 'border-l-primary',
  completed: 'border-l-success',
  failed: 'border-l-danger',
};

/**
 * Format month string (2026-02) to Spanish display (Febrero 2026)
 */
function formatMonth(month: string): string {
  return mesEnTitulo(month);
}

/**
 * Format bank account for display with partial masking
 */
function formatBankAccount(
  bank: string,
  accountType: string,
  accountNumber: string
): string {
  const bankLabels: Record<string, string> = {
    bancolombia: 'Bancolombia',
    davivienda: 'Davivienda',
    bbva: 'BBVA',
    bogota: 'Banco de Bogotá',
    occidente: 'Banco de Occidente',
    itau: 'Itaú',
    cajasocial: 'Caja Social',
    popular: 'Banco Popular',
  };
  const typeLabels: Record<string, string> = {
    savings: 'Ahorros',
    checking: 'Corriente',
  };

  const bankLabel = bankLabels[bank] || bank;
  const typeLabel = typeLabels[accountType] || accountType;
  // N-07 (QA-PAGOS-95): en la lista va enmascarada («•••• 4321»), como en
  // Liquidaciones y en los lotes; completa sólo en el detalle, donde se copia.
  return `${bankLabel} · ${typeLabel} ${enmascarar(accountNumber) ?? ''}`.trim();
}

/**
 * DispersionCard - Card for displaying individual dispersion (disbursement) info
 * Shows propietario, amounts, status, and action buttons
 */
export function DispersionCard({
  dispersion,
  onViewDetail,
  onProcess,
  compact = false,
}: DispersionCardProps) {
  const fechas = useLocaleDeFechas();
  const tr = useTr();
  const [showProperties, setShowProperties] = useState(false);

  const statusColor = getDispersionStatusColor(dispersion.status);
  const statusLabel = getDispersionStatusLabel(dispersion.status);
  const borderColor = STATUS_BORDER_COLORS[dispersion.status];

  // Compact variant - single row for list views
  if (compact) {
    return (
      <Pressable
        hover="scale"
        press="sm"
        onClick={() => onViewDetail?.(dispersion)}
        className={cn(
          'w-full flex items-center gap-4 p-4 rounded-lg border-l-4 border bg-surface dark:bg-card border-border dark:border-border-strong cursor-pointer transition-colors duration-base',
          borderColor
        )}
      >
        {/* Propietario */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg truncate text-sm">
            {dispersion.propietarioName}
          </p>
          <p className="text-xs text-fg-muted dark:text-fg-subtle truncate">
            {formatMonth(dispersion.month)} · {dispersion.items.length}{' '}
            {dispersion.items.length === 1 ? 'propiedad' : 'propiedades'}
          </p>
        </div>

        {/* Net Amount */}
        <div className="text-right">
          <p className="font-mono font-bold tabular-nums text-success text-sm">
            {formatCurrency(dispersion.netToPropietario)}
          </p>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium shrink-0',
            statusColor
          )}
        >
          {statusLabel}
        </span>

        {/* Processing spinner */}
        {dispersion.status === 'processing' && (
          <Spinner size="sm" className="shrink-0" />
        )}
      </Pressable>
    );
  }

  // Full card variant
  // Revisora r22 (Giros #6): la tarjeta de 390 medía ≈480 px, con el estado dos veces, el mes que ya dice el
  // selector, el banco en un círculo de color y el inmueble en una banda gris. Ahora: el nombre en dos renglones,
  // el estado (punto + palabra, como la tabla), el neto en mono y debajo, en ceniza, el banco y el desglose.
  const fechaDelGiro =
    dispersion.status === 'completed' && dispersion.processedAt
      ? // Revisora r25 (Giros paso 2): «17 oct 2026», el día de Colombia, como la tabla de 1440.
        fechas === 'es-CO'
        ? fechaCorta(diaEnColombia(dispersion.processedAt))
        : new Date(dispersion.processedAt).toLocaleDateString(fechas, { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
  return (
    <Pressable
      hover="lift"
      press="none"
      className={cn(
        'w-full rounded-lg border border-border bg-surface dark:bg-card overflow-hidden transition-colors duration-base group',
        onViewDetail && 'cursor-pointer'
      )}
      onClick={() => onViewDetail?.(dispersion)}
      data-testid="tarjeta-del-giro"
      data-estado={dispersion.status}
    >
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 break-words text-[15px] font-medium leading-snug text-fg">
              {dispersion.propietarioName}
            </h3>
            {/* Sin cuenta se dice, no se inventa: es a dónde va la plata. */}
            <p className="mt-0.5 truncate text-caption text-fg-muted" data-testid="tarjeta-cuenta">
              {dispersion.propietarioBankAccount
                ? formatBankAccount(
                    dispersion.propietarioBankAccount.bank,
                    dispersion.propietarioBankAccount.accountType,
                    dispersion.propietarioBankAccount.accountNumber
                  )
                : tr('Sin cuenta registrada')}
            </p>
          </div>
          <Badge variant={VARIANTE_DEL_ESTADO[dispersion.status]} className="shrink-0 gap-1.5">
            {dispersion.status === 'processing' && <Spinner size="xs" variant="current" />}
            {statusLabel}
          </Badge>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-body-sm text-fg-muted">{tr("Neto a girar")}</span>
          <span className="whitespace-nowrap font-mono text-xl tabular-nums text-fg">
            {formatCurrency(dispersion.netToPropietario)}
          </span>
        </div>

        {/* Revisora r24 (Giros #3): con cajón, la tarjeta del celular es nombre, estado, neto y «Ver detalle»
            (≈150 px; antes ≈390 con 40 propietarios = 16.000 px). El desglose, la referencia y los
            inmuebles van al cajón; sin cajón, se quedan aquí. */}
        {onViewDetail ? null : (
          <div className="space-y-1 text-body-sm text-fg-muted">
            <div className="flex items-center justify-between gap-3">
              {/* 🔴 Decía «Total recaudado» siempre, y la dispersión gira por
                  defecto con base CAUSADO: el canon del mes, pagado o no. */}
              <span data-testid="tarjeta-rotulo-canon">{ROTULO_DEL_CANON[dispersion.baseDelCanon ?? 'CAUSADO']}</span>
              <span className="whitespace-nowrap font-mono tabular-nums">{formatCurrency(dispersion.totalCollected)}</span>
            </div>
            {/* Ronda 20: la comisión neutra (era marrón aquí, roja en el paso 1 y azul en la tabla), y el «−» pegado a su cifra. */}
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0">{tr("Comisión de administración")}</span>
              <span className="shrink-0 whitespace-nowrap font-mono tabular-nums">{conSigno('−', formatCurrency(dispersion.totalCommission))}</span>
            </div>
            {/* 🔴 22-09: el IVA de la comisión, en su línea (antes no se nombraba). */}
            {(dispersion.totalIvaComision ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-3" data-testid="tarjeta-iva-comision">
                <span className="min-w-0">{tr("IVA de la comisión")}</span>
                <span className="shrink-0 whitespace-nowrap font-mono tabular-nums">{conSigno('−', formatCurrency(dispersion.totalIvaComision ?? 0))}</span>
              </div>
            )}
          </div>
        )}

        {/* Lo que dice el estado y la palabra no alcanza a decir: cuándo salió y con qué referencia, o por qué no. */}
        {fechaDelGiro && (
          <p className="text-caption text-fg-muted">
            {tr("Girado el {fecha}", { fecha: fechaDelGiro })}
            {dispersion.transferReference && !onViewDetail ? (
              <span className="font-mono"> · {tr("Ref.")} {dispersion.transferReference}</span>
            ) : null}
          </p>
        )}
        {dispersion.status === 'failed' && dispersion.failureReason && (
          <p className="flex items-start gap-1.5 text-caption text-danger">
            <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
            <span>{dispersion.failureReason}</span>
          </p>
        )}
      </div>

      {/* Los inmuebles del giro, plegados (sin la banda gris). */}
      {onViewDetail ? null : (
      <div className="border-t border-border-faint px-4 py-2.5">
        {/* allowlist: collapsible disclosure toggle (count + caret) inside a clickable card; el
            contenido se abre con `Collapse` de Cadence (antes animaba `height` a mano). */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowProperties(!showProperties);
          }}
          aria-expanded={showProperties}
          className="flex w-full items-center justify-between text-body-sm text-fg-muted transition-colors hover:text-fg"
        >
          <span className="flex items-center gap-2">
            <Buildings className="h-4 w-4 text-fg-subtle" />
            {dispersion.items.length}{' '}
            {dispersion.items.length === 1 ? tr('inmueble incluido') : tr('inmuebles incluidos')}
          </span>
          <CaretDown
            className={cn(
              'h-4 w-4 text-fg-subtle transition-transform duration-slow ease-emphasis',
              showProperties && 'rotate-180'
            )}
          />
        </button>

        <Collapse open={showProperties}>
          <Stagger className="mt-2 space-y-1.5 pb-1" distance="xs" layout={false}>
            {dispersion.items.map((item) => (
              <StaggerItem
                key={item.cuotaId ?? item.cobroId}
                className="flex items-center justify-between gap-3 text-body-sm"
              >
                <span className="min-w-0 truncate text-fg-muted">{item.propertyTitle}</span>
                <span className="whitespace-nowrap font-mono tabular-nums text-fg">{formatCurrency(item.netAmount)}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </Collapse>
      </div>
      )}

      {/* La acción de la fila y «Ver detalle» (el banco completo y el extracto viven en el cajón). */}
      {(onViewDetail || ((dispersion.status === 'pending' || dispersion.status === 'failed') && onProcess)) && (
        <div className="flex items-center justify-between gap-3 border-t border-border-faint px-4 py-3">
          {dispersion.status === 'pending' && onProcess && (
            <Button
              size="sm"
              variant="secondary"
              hideArrow
              onClick={(e) => {
                e.stopPropagation();
                onProcess(dispersion);
              }}
            >
              <PaperPlaneTilt className="h-4 w-4" />
              {tr("Aprobar")}
            </Button>
          )}
          {dispersion.status === 'failed' && onProcess && (
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={(e) => {
                e.stopPropagation();
                onProcess(dispersion);
              }}
            >
              <CurrencyCircleDollar className="h-4 w-4" />
              {tr("Reintentar")}
            </Button>
          )}
          {onViewDetail && (
            <span className="ml-auto flex items-center gap-1 text-body-sm text-fg-muted transition-colors group-hover:text-fg">
              {tr("Ver detalle")}
              <CaretRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      )}
    </Pressable>
  );
}

/**
 * DispersionCardCompact - Compact variant export
 */
export function DispersionCardCompact(
  props: Omit<DispersionCardProps, 'compact'>
) {
  return <DispersionCard {...props} compact />;
}

export default DispersionCard;
