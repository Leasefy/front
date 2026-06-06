'use client';

/**
 * AP Bill detail page.
 * Route: /panel/inmobiliaria/tesoreria/ap/[id]
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
  Spinner,
  Warning,
} from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { agentAuthHeaders } from '@/lib/api/agent-auth';
import { cn } from '@/lib/utils';

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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  paid: {
    text: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
  },
  approved: {
    text: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
  },
  pending_approval: {
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900',
  },
  rejected: {
    text: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900',
  },
  void: {
    text: 'text-neutral-600 dark:text-neutral-400',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    border: 'border-neutral-200 dark:border-neutral-700',
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
        <Spinner className="w-6 h-6 text-muted-foreground animate-spin" />
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
          className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4"
        >
          <Warning
            className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
          <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Receipt className="w-8 h-8 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t(k('notFound'))}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t(k('notFoundDesc'))}
            </p>
          </div>
          <Link
            href="/panel/inmobiliaria/tesoreria"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-mono uppercase tracking-wide text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
            {t(k('backToList'))}
          </Link>
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
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-h2 text-foreground font-semibold">
              {bill.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {bill.costCenterCode}
            </p>
          </div>
        </div>

        {/* Status pill */}
        <span
          className={cn(
            'inline-flex items-center self-start px-3 py-1.5 rounded-lg border text-sm font-medium',
            colors.text,
            colors.bg,
            colors.border,
          )}
        >
          {statusLabel}
        </span>
      </header>

      {/* M1 info banner */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 flex items-start gap-2.5">
        <Info
          className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
          weight="fill"
        />
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            {t(k('m1BannerTitle'))}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300/90 mt-0.5">
            {t(k('m1BannerDesc'))}
          </p>
        </div>
      </div>

      {/* Detail card */}
      <section className="rounded-2xl border border-border bg-card p-6">
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
                'inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium',
                colors.text,
                colors.bg,
                colors.border,
              )}
            >
              {statusLabel}
            </span>
          </DetailRow>

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
        href="/panel/inmobiliaria/tesoreria"
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
