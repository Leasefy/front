'use client';

/**
 * AP Bill detail page.
 * Route: /panel/inmobiliaria/pagos/cxp/[id]
 *
 * Data layer: no dedicated GET-by-id endpoint exists for AP bills as of Phase 40.
 * The page fetches the full list via GET /api/agency/:agencyId/ap/bills and selects
 * the record whose id matches the route param.
 *
 * NOTE: A dedicated GET /api/agency/:agencyId/ap/bills/:id endpoint is a
 * recommended follow-up (see ap-bills-source.ts comments).
 *
 * Permission: ap:view (enforced by PageGuard).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CaretLeft,
  Receipt,
  Info,
  Warning,
  ArrowSquareOut,
} from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { agentAuthHeaders } from '@/lib/api/agent-auth';
import { cn } from '@/lib/utils';
import { Button, Spinner } from '@/components/ui';

// ---------------------------------------------------------------------------
// AP Bill shape (mirrors ap-bills-source.ts)
// ---------------------------------------------------------------------------

interface ApBill {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  amountCop: string; // BigInt serialized as string
  costCenterCode: string;
  issuedAt: string;
  dueDate: string;
  status: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  /** Captura por IA (2026-09-02): la factura original en Storage y qué se cobra. */
  adjuntoUrl?: string | null;
  concepto?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  paid: {
    text: 'text-success',
    bg: 'bg-success-soft',
    border: 'border-success/30',
  },
  approved: {
    text: 'text-success',
    bg: 'bg-success-soft',
    border: 'border-success/30',
  },
  pending_approval: {
    text: 'text-warning',
    bg: 'bg-warning-soft',
    border: 'border-warning/30',
  },
  rejected: {
    text: 'text-danger',
    bg: 'bg-danger-soft',
    border: 'border-danger/30',
  },
  void: {
    text: 'text-fg-muted',
    bg: 'bg-surface-muted',
    border: 'border-border',
  },
};

function formatCOP(amountStr: string): string {
  const amount = Number(amountStr);
  if (isNaN(amount) || amount === 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale === 'es' ? 'es-CO' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' },
    );
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Detail field row
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground min-w-[140px] flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground text-right font-medium">
        {children}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner content — rendered inside PageGuard (auth guaranteed)
// ---------------------------------------------------------------------------

function ApBillDetailContent({ billId }: { billId: string }) {
  const { t, locale } = useI18n();
  const { agency } = useAuth();
  const k = (s: string) => `inmobiliaria.ap.bill.${s}`;

  const [bill, setBill] = useState<ApBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agency?.id) return;

    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl) {
      setError(t(k('loadingError')));
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agency.id}/ap/bills`,
          { headers: agentAuthHeaders(), signal: controller.signal },
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { bills: ApBill[] };
        const found = (json.bills ?? []).find((b) => b.id === billId) ?? null;
        setBill(found);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(t(k('loadingError')));
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [agency?.id, billId, t]);

  const statusMap: Record<string, string> = {
    paid: t(k('statusPaid')),
    approved: t(k('statusApproved')),
    pending_approval: t(k('statusPendingApproval')),
    rejected: t(k('statusRejected')),
    void: t(k('statusVoid')),
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <Spinner size="md" variant="muted" />
        <p className="text-sm text-muted-foreground">{t(k('fetching'))}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <BackNav t={t} k={k} />
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4"
        >
          <Warning
            className="w-5 h-5 text-danger flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-sm text-danger">{error}</p>
        </div>
      </div>
    );
  }

  // Not-found state
  if (!bill) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <BackNav t={t} k={k} />
        <div className="max-w-sm mx-auto text-center py-16 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-surface-muted flex items-center justify-center">
            <Receipt className="w-8 h-8 text-fg-subtle" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t(k('notFound'))}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t(k('notFoundDesc'))}
            </p>
          </div>
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/pagos/liquidaciones">
              <CaretLeft className="w-4 h-4" />
              {t(k('backToList'))}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const colors =
    STATUS_COLORS[bill.status] ??
    STATUS_COLORS['void'];

  const statusLabel = statusMap[bill.status] ?? bill.status;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back nav */}
      <BackNav t={t} k={k} />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-fg-muted" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {bill.invoiceNumber}
            </h1>
            <p className="text-sm text-fg-muted mt-0.5">
              {bill.costCenterCode}
            </p>
          </div>
        </div>

        {/* Status pill */}
        <span
          className={cn(
            'inline-flex items-center self-start px-3 py-1.5 rounded-md border text-sm font-medium',
            colors.text,
            colors.bg,
            colors.border,
          )}
        >
          {statusLabel}
        </span>
      </header>

      {/* M1 info banner */}
      <div className="rounded-lg bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5">
        <Info
          className="w-5 h-5 text-primary dark:text-primary flex-shrink-0 mt-0.5"
          weight="fill"
        />
        <div>
          <p className="text-xs font-semibold text-primary dark:text-primary">
            {t(k('m1BannerTitle'))}
          </p>
          <p className="text-xs text-primary dark:text-primary/90 mt-0.5">
            {t(k('m1BannerDesc'))}
          </p>
        </div>
      </div>

      {/* Detail card */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="divide-y divide-border">
          <DetailRow label={t(k('labelInvoiceNumber'))}>
            <span className="font-mono">{bill.invoiceNumber}</span>
          </DetailRow>

          <DetailRow label={t(k('labelVendor'))}>
            <span className="font-mono text-xs text-muted-foreground">
              {bill.vendorId}
            </span>
          </DetailRow>

          <DetailRow label={t(k('labelCostCenter'))}>
            {bill.costCenterCode}
          </DetailRow>

          <DetailRow label={t(k('labelStatus'))}>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-sm border text-xs font-medium',
                colors.text,
                colors.bg,
                colors.border,
              )}
            >
              {statusLabel}
            </span>
          </DetailRow>

          {bill.concepto ? (
            <DetailRow label={t(k('labelConcepto'))}>
              <span data-testid="ap-bill-concepto">{bill.concepto}</span>
            </DetailRow>
          ) : null}

          <DetailRow label={t(k('labelAmount'))}>
            <span className="font-mono tabular-nums text-base font-semibold text-foreground">
              {formatCOP(bill.amountCop)}
            </span>
          </DetailRow>

          <DetailRow label={t(k('labelIssued'))}>
            {formatDate(bill.issuedAt, locale)}
          </DetailRow>

          <DetailRow label={t(k('labelDue'))}>
            {formatDate(bill.dueDate, locale)}
          </DetailRow>

          <DetailRow label={t(k('labelCreatedBy'))}>
            <span className="font-mono text-xs">{bill.createdBy}</span>
          </DetailRow>

          <DetailRow label={t(k('labelApprovedBy'))}>
            {bill.approvedBy != null ? (
              <span className="font-mono text-xs">{bill.approvedBy}</span>
            ) : (
              <span className="text-muted-foreground italic">
                {t(k('noApprover'))}
              </span>
            )}
          </DetailRow>

          {bill.adjuntoUrl ? (
            <DetailRow label={t(k('labelAdjunto'))}>
              <a
                href={bill.adjuntoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
                data-testid="ap-bill-adjunto"
              >
                <ArrowSquareOut className="w-4 h-4" />
                {t(k('verFactura'))}
              </a>
            </DetailRow>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared back-nav (avoids duplication across states)
// ---------------------------------------------------------------------------

function BackNav({
  t,
  k,
}: {
  t: (key: string) => string;
  k: (s: string) => string;
}) {
  return (
    <nav>
      <Link
        href="/panel/inmobiliaria/pagos/liquidaciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <CaretLeft className="w-4 h-4" />
        {t(k('backToList'))}
      </Link>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Default export wrapped in PageGuard
// ---------------------------------------------------------------------------

export default function ApBillDetailPage() {
  const params = useParams();
  const billId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

  return (
    <PageGuard module="ap" action="view">
      <ApBillDetailContent billId={billId} />
    </PageGuard>
  );
}
