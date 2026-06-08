'use client';

/**
 * Agente de Pagos (AP) — landing.
 *
 * Destination for the AGENTES IA → "Pagos" sidebar item. The Phase 40 AP backend
 * is live on the agent ({NEXT_PUBLIC_AGENT_URL}/api/agency/{id}/ap/bills, /ap/aging,
 * /ap/payment-runs, /ap/vendors, /ap/matrix) but its operator UI is not built yet.
 *
 * This landing introduces the agent and previews the operational surfaces. The full
 * data experience (vendor bills, approval inbox, payment runs, aging) is the next
 * build on top of those endpoints. No fake data is rendered.
 */

import {
  CurrencyDollar,
  Receipt,
  ClipboardText,
  PaperPlaneTilt,
  ChartBar,
} from '@phosphor-icons/react';

import { useI18n } from '@/lib/i18n';
import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';

function PagosContent() {
  const { locale } = useI18n();
  const tx = (es: string, en: string) => (locale === 'en' ? en : es);

  const capabilities = [
    {
      icon: Receipt,
      title: tx('Facturas de proveedor', 'Vendor bills'),
      desc: tx('Captura y normaliza las facturas que entran.', 'Capture and normalize incoming bills.'),
    },
    {
      icon: ClipboardText,
      title: tx('Aprobaciones', 'Approvals'),
      desc: tx('Bandeja de aprobación con matriz por monto y centro de costo.', 'Approval inbox with an amount + cost-center matrix.'),
    },
    {
      icon: PaperPlaneTilt,
      title: tx('Corridas de pago', 'Payment runs'),
      desc: tx('Agrupa y ejecuta dispersiones de forma idempotente.', 'Batch and execute disbursements idempotently.'),
    },
    {
      icon: ChartBar,
      title: tx('Aging', 'Aging'),
      desc: tx('Antigüedad de saldos por proveedor.', 'Balance aging by vendor.'),
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <SectionLabel>{tx('Agentes IA', 'AI Agents')}</SectionLabel>
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-2xl bg-accent flex-shrink-0">
            <CurrencyDollar className="w-5 h-5 text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-h2 text-foreground">{tx('Agente de Pagos', 'Payments Agent')}</h1>
            <p className="text-body text-muted-foreground">
              {tx(
                'Valida facturas de proveedor, gestiona aprobaciones y ejecuta dispersiones.',
                'Validates vendor bills, manages approvals and executes disbursements.',
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Phase-honest banner */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3.5">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
          {tx('Motor AP conectado — experiencia operativa en construcción', 'AP engine connected — operator experience in progress')}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-300/90 mt-0.5">
          {tx(
            'El backend de cuentas por pagar (facturas, aprobaciones, corridas, aging) ya está disponible. La vista operativa se conecta a continuación.',
            'The accounts-payable backend (bills, approvals, runs, aging) is live. The operator view connects next.',
          )}
        </p>
      </div>

      {/* Capabilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {capabilities.map((c) => (
          <div key={c.title} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-muted flex-shrink-0">
              <c.icon className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-foreground">{c.title}</p>
              <p className="text-caption text-muted-foreground mt-0.5">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PagosPage() {
  return (
    <PageGuard>
      <PagosContent />
    </PageGuard>
  );
}
