'use client';

import Link from 'next/link';
import { Buildings, ChartPieSlice, CurrencyDollar, ChatCircleText, CaretRight } from '@phosphor-icons/react';
import { PageHeader, KpiCard } from '@leasefy/cadence';
import { Card } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import type {
  FinanzasPortafolio,
  FinanzasInmueble,
  FinanzasProyeccion,
  FinanzasRecaudoAnual,
} from '@/lib/api/owner-finanzas.types';
import { DescargarInformeButton } from './DescargarInformeButton';

interface MiPlataViewProps {
  agencyId: string | null;
  portafolio: FinanzasPortafolio;
  inmuebles: FinanzasInmueble[];
  proyeccion: FinanzasProyeccion | null;
  recaudoAnual: FinanzasRecaudoAnual | null;
}

/**
 * Vista de datos de "Mi plata" (F3). Todos los montos se muestran VERBATIM del back vía
 * `formatCurrency` — el front no recompone totales. Vencimientos/preavisos son informativos
 * (sin countdown alarmista ni estilos destructivos — doctrina de v7).
 */
export function MiPlataView({ agencyId, portafolio, inmuebles, proyeccion, recaudoAnual }: MiPlataViewProps) {
  // Copy en español como el resto de la chrome del panel (labels del nav hardcodeados);
  // la i18n fina de estas vistas se alinea en la fase de polish.
  const { formatCurrency, formatDate } = useI18n();

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="Mi plata"
          subtitle="Tus pagos, la proyección de tu contrato y tu portafolio, en un solo lugar."
          actions={<DescargarInformeButton agencyId={agencyId} />}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <KpiCard label="Inmuebles" value={String(portafolio.totalProperties)} icon={<Buildings />} />
          <KpiCard label="Ocupación" value={`${Math.round(portafolio.occupancyPct)}%`} icon={<ChartPieSlice />} />
          <KpiCard label="Recaudo del mes" value={formatCurrency(portafolio.recaudoMesActual)} icon={<CurrencyDollar />} />
          <KpiCard label="Solicitudes abiertas" value={String(portafolio.openRequestsCount)} icon={<ChatCircleText />} />
        </div>

        {/* Mis inmuebles */}
        <Card className="p-4 sm:p-6 mt-6">
          <h2 className="text-base font-semibold mb-4">Mis inmuebles</h2>
          {inmuebles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay inmuebles para mostrar.</p>
          ) : (
            <ul className="divide-y divide-faint">
              {inmuebles.map((inm) => (
                <li key={inm.propertyRef}>
                  <Link
                    href={`/panel/portafolio/${inm.propertyRef}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-surface-muted rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{inm.label}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {inm.contract?.tenantDisplayName
                          ? `Inquilino: ${inm.contract.tenantDisplayName}`
                          : inm.occupancyStatus}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {inm.contract && (
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(inm.contract.canonCop)}</p>
                          <p className="text-xs text-muted-foreground">
                            Vence {formatDate(inm.contract.endDate)}
                          </p>
                        </div>
                      )}
                      <CaretRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Contratos por vencer (informativo) */}
        {portafolio.contractsExpiring.length > 0 && (
          <Card className="p-4 sm:p-6 mt-6">
            <h2 className="text-base font-semibold mb-1">Contratos por vencer</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Con tiempo para decidir. Tu inmobiliaria te acompaña en la renovación o el cierre.
            </p>
            <ul className="divide-y divide-faint">
              {portafolio.contractsExpiring.map((c) => (
                <li key={c.propertyRef} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.propertyLabel}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.tenantDisplayName ?? 'Sin inquilino'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm">Vence {formatDate(c.endDate)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.daysLeft} días · {c.preaviso.windowOpen ? 'ventana de preaviso abierta' : 'preaviso más adelante'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Recaudo anual por concepto */}
          {recaudoAnual && recaudoAnual.totals.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h2 className="text-base font-semibold mb-4">Recaudo {recaudoAnual.year} por concepto</h2>
              <ul className="divide-y divide-faint">
                {recaudoAnual.totals.map((row) => (
                  <li key={row.concepto} className="py-2.5 flex items-center justify-between gap-4">
                    <span className="text-sm capitalize">{row.concepto}</span>
                    <span className="text-sm text-muted-foreground">
                      {row.paymentsCount} pagos · <span className="font-medium text-foreground">{formatCurrency(row.totalCop)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Proyección de ingresos */}
          {proyeccion && proyeccion.months.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h2 className="text-base font-semibold mb-4">Proyección de ingresos</h2>
              <ul className="divide-y divide-faint">
                {proyeccion.months.map((m) => (
                  <li key={m.month} className="py-2.5 flex items-center justify-between gap-4">
                    <span className="text-sm">{m.month}</span>
                    <span className="text-sm font-medium">{formatCurrency(m.totalCop)}</span>
                  </li>
                ))}
              </ul>
              {proyeccion.assumptions.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {proyeccion.assumptions.map((a, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {a}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
