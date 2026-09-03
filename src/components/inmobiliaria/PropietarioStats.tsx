'use client';

import {
  Buildings,
  CurrencyDollar,
  ChartLineUp,
  Warning,
  CalendarCheck,
  TrendUp,
  TrendDown,
} from '@phosphor-icons/react';
import { Stat, StatStrip } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import type { Consignacion, Propietario } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface PropietarioStatsProps {
  propietario: Propietario;
  variant?: 'full' | 'compact' | 'mini';
  className?: string;
  /**
   * Los mandatos del propietario (la ficha ya los tiene). Con ellos la alerta
   * de «sin arrendar» dice CUÁLES y lleva al inmueble; sin ellos no se muestra
   * — antes salía «la ocupación está por debajo del 70 %» hasta con cero
   * inmuebles (Nico, 2026-09-02 13:23).
   */
  consignaciones?: Consignacion[];
  /** Abre el formulario para cargar la cuenta bancaria (alerta «no se le puede girar»). */
  onCargarCuenta?: () => void;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
}

const colorClasses = {
  indigo: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    icon: 'text-primary',
  },
  emerald: {
    bg: 'bg-success-soft',
    text: 'text-success',
    icon: 'text-success',
  },
  amber: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    icon: 'text-warning',
  },
  rose: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    icon: 'text-danger',
  },
  purple: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

function StatCard({ icon: Icon, label, value, subValue, trend, color }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {subValue && (
          <p className="text-sm text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.positive ? (
            <TrendUp className="w-3.5 h-3.5 text-success" />
          ) : (
            <TrendDown className="w-3.5 h-3.5 text-danger" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-success' : 'text-danger'
            )}
          >
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * PropietarioStats - KPI stats display for a property owner
 * Shows key metrics like property count, monthly rent, pending balances
 */
export function PropietarioStats({
  propietario,
  variant = 'full',
  className,
  consignaciones,
  onCargarCuenta,
}: PropietarioStatsProps) {
  const { t, locale } = useI18n();
  const hasPendingBalance = propietario.pendingBalance > 0;
  const occupancyRate = propietario.propertyCount > 0
    ? Math.round((propietario.activeLeases / propietario.propertyCount) * 100)
    : 0;

  // La comisión real viene del back (Σ canon × % de cada mandato). Antes se
  // «estimaba» al 10 % parejo — un número inventado al lado de uno real.
  const comisionReal = propietario.totalCommission;

  // Inmuebles en arriendo que hoy no están arrendados: cada mes vacío es
  // canon que el propietario no recibe. Una venta no cuenta.
  const sinArrendar = (consignaciones ?? []).filter(
    (c) => c.listingType !== 'sale' && c.availability === 'available',
  );
  const sinCuenta = !propietario.bankAccount?.accountNumber;

  if (variant === 'mini') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="flex items-center gap-2">
          <Buildings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {propietario.propertyCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyDollar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(propietario.totalMonthlyRent)}
          </span>
        </div>
        {hasPendingBalance && (
          <Badge variant="warning" className="gap-1">
            <Warning className="w-3 h-3" />
            {formatCurrency(propietario.pendingBalance)}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.properties')}</p>
          <p className="text-xl font-semibold text-foreground">
            {propietario.propertyCount}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.rented')}</p>
          <p className="text-xl font-semibold text-foreground">
            {propietario.activeLeases}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.monthlyRent')}</p>
          <p className="text-xl font-semibold text-foreground">
            {formatCurrency(propietario.totalMonthlyRent)}
          </p>
        </div>
        <div className={cn(
          'p-3 rounded-lg',
          hasPendingBalance
            ? 'bg-warning-soft'
            : 'bg-success-soft'
        )}>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.pending')}</p>
          <p className={cn(
            'text-xl font-semibold',
            hasPendingBalance
              ? 'text-warning'
              : 'text-success'
          )}>
            {hasPendingBalance ? formatCurrency(propietario.pendingBalance) : t('inmobiliaria.propietario.stats.upToDate')}
          </p>
        </div>
      </div>
    );
  }

  // Full variant — la franja de la ficha (2026-09-02, mismo patrón que la
  // ficha del contrato): cuatro números de un vistazo en vez de cuatro
  // tarjetas con ícono de color. La ocupación no es un número propio: es el
  // «2 de 3 arrendados» debajo de Inmuebles — con uno o tres inmuebles, un
  // «0 %» grande no dice nada.
  const neto = propietario.netToOwner ?? propietario.totalMonthlyRent - (comisionReal ?? 0);
  const ultimoGiro = propietario.lastPaymentDate
    ? new Date(propietario.lastPaymentDate).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { day: 'numeric', month: 'short' })
    : null;
  return (
    <div className={cn('space-y-4', className)}>
      <StatStrip className="rounded-lg border border-border bg-card px-4" data-testid="resumen-del-propietario">
        <Stat
          label={t('inmobiliaria.propietario.stats.properties')}
          value={String(propietario.propertyCount)}
          delta={
            propietario.propertyCount > 0
              ? t('inmobiliaria.propietario.stats.ofTotalRented', { rentados: propietario.activeLeases, total: propietario.propertyCount })
              : t('inmobiliaria.propietario.stats.sinPropiedades')
          }
          deltaDirection={
            propietario.propertyCount > 0 && propietario.activeLeases < propietario.propertyCount ? 'down' : 'neutral'
          }
          compact
        />
        <Stat
          label={t('inmobiliaria.propietario.stats.monthlyRent')}
          value={formatCurrency(propietario.totalMonthlyRent)}
          delta={comisionReal != null ? `${formatCurrency(comisionReal)} ${t('inmobiliaria.propietario.stats.commission')}` : undefined}
          compact
        />
        <Stat
          label={t('inmobiliaria.propietario.stats.netToOwner')}
          value={formatCurrency(neto)}
          delta={t('inmobiliaria.propietario.stats.netToOwnerHint')}
          compact
        />
        <Stat
          label={t('inmobiliaria.propietario.stats.pendingBalance')}
          value={hasPendingBalance ? formatCurrency(propietario.pendingBalance) : t('inmobiliaria.propietario.stats.upToDate')}
          delta={ultimoGiro ? `${t('inmobiliaria.propietario.stats.lastPayment')}: ${ultimoGiro}` : undefined}
          deltaDirection={hasPendingBalance ? 'down' : 'up'}
          compact
        />
      </StatStrip>

      {/* Alertas: qué pasó (con el número), qué hacer, y el botón que lo hace. */}
      {sinCuenta && propietario.activeLeases > 0 && (
        <AlertaAccionable
          severidad="danger"
          titulo={t('inmobiliaria.propietario.alertas.sinCuenta.titulo')}
          accion={onCargarCuenta ? { label: t('inmobiliaria.propietario.alertas.sinCuenta.accion'), onClick: onCargarCuenta } : undefined}
          data-testid="alerta-sin-cuenta"
        >
          {t('inmobiliaria.propietario.alertas.sinCuenta.detalle', { n: propietario.activeLeases })}
        </AlertaAccionable>
      )}

      {hasPendingBalance && (
        <AlertaAccionable
          severidad="warning"
          titulo={t('inmobiliaria.propietario.alertas.pendienteDeGiro.titulo', { monto: formatCurrency(propietario.pendingBalance) })}
          accion={{ label: t('inmobiliaria.propietario.alertas.pendienteDeGiro.accion'), href: '/panel/inmobiliaria/dispersiones' }}
          data-testid="alerta-pendiente-de-giro"
        >
          {t('inmobiliaria.propietario.alertas.pendienteDeGiro.detalle')}
        </AlertaAccionable>
      )}

      {sinArrendar.length > 0 && (
        <AlertaAccionable
          severidad="info"
          titulo={
            sinArrendar.length === 1
              ? t('inmobiliaria.propietario.alertas.sinArrendar.tituloUno', { inmueble: sinArrendar[0].propertyTitle })
              : t('inmobiliaria.propietario.alertas.sinArrendar.titulo', { n: sinArrendar.length, total: propietario.propertyCount })
          }
          accion={
            sinArrendar.length === 1
              ? { label: t('inmobiliaria.propietario.alertas.sinArrendar.accionUno'), href: `/panel/inmobiliaria/inmuebles/${sinArrendar[0].id}` }
              : { label: t('inmobiliaria.propietario.alertas.sinArrendar.accion'), href: '/panel/inmobiliaria/inmuebles' }
          }
          data-testid="alerta-sin-arrendar"
        >
          {t('inmobiliaria.propietario.alertas.sinArrendar.detalle')}
        </AlertaAccionable>
      )}
    </div>
  );
}

export default PropietarioStats;
