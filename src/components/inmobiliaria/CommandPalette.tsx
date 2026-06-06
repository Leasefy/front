'use client';

/**
 * CommandPalette — the ⌘K modal for the Leasefy operator backoffice.
 *
 * Architecture:
 *  - Shell: Radix Dialog (focus trap, aria, portal)  via src/components/ui/dialog.tsx
 *  - Left  (52%): search input + grouped results list
 *  - Right (48%): preview panel for the highlighted result
 *  - Footer     : keyboard hint strip
 *  - Empty state (no query): Novedades (audit log feed) + Acciones rápidas
 *
 * Keyboard nav:
 *  ↑ / ↓   move highlight across the flat result list
 *  Enter   router.push(result.href) + close
 *  Esc     close (handled by Dialog + our shortcut hook)
 *
 * Accessibility:
 *  - role="listbox" on the results list, role="option" per item
 *  - aria-selected on highlighted item
 *  - aria-label on the search input
 *  - Focus returned to trigger on close (Radix handles this)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
  ArrowElbowDownLeft,
  Spinner,
  User,
  Clock,
  ChatCircleText,
  FileText,
  ChartLineUp,
  House,
  Lightning,
  ArrowSquareOut,
  Phone,
  Envelope,
  Warning,
} from '@phosphor-icons/react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { useCommandPalette } from '@/lib/context/CommandPaletteContext';
import { useFederatedSearch } from '@/lib/hooks/useFederatedSearch';
import type { SearchResult, SearchSource, SearchSourceContext } from '@/lib/hooks/useFederatedSearch';
import { debtorsSource } from '@/lib/search/sources/debtors-source';
import { useAuditLog } from '@/lib/hooks/cobranza/use-audit-log';
import { STAGE_LABELS_ES } from '@/lib/cartera';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────────
// Relative time (America/Bogota) — no date-fns dependency
// ──────────────────────────────────────────────────────────────────────────────

function relativeTime(isoString: string, locale: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (locale === 'en') {
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  }
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  return `hace ${diffDays}d`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Audit action → human label
// ──────────────────────────────────────────────────────────────────────────────

const AUDIT_ACTION_LABELS_ES: Record<string, string> = {
  stage_transition: 'Cambio de etapa',
  call_completed: 'Llamada completada',
  payment_plan_approved: 'Plan de pago aprobado',
  pii_reveal: 'Cédula revelada',
  carta_approved: 'Carta aprobada',
  siniestro_approved: 'Siniestro aprobado',
  memo_created: 'Nota creada',
  debtor_paused: 'Deudor pausado',
  debtor_unpaused: 'Deudor reanudado',
  compromiso_created: 'Compromiso creado',
};

const AUDIT_ACTION_LABELS_EN: Record<string, string> = {
  stage_transition: 'Stage transition',
  call_completed: 'Call completed',
  payment_plan_approved: 'Payment plan approved',
  pii_reveal: 'ID revealed',
  carta_approved: 'Letter approved',
  siniestro_approved: 'Claim approved',
  memo_created: 'Note created',
  debtor_paused: 'Debtor paused',
  debtor_unpaused: 'Debtor unpaused',
  compromiso_created: 'Commitment created',
};

function auditActionLabel(action: string, locale: string): string {
  const labels = locale === 'en' ? AUDIT_ACTION_LABELS_EN : AUDIT_ACTION_LABELS_ES;
  return labels[action] ?? action;
}

// ──────────────────────────────────────────────────────────────────────────────
// Quick actions — derived from the inmobiliaria nav (no runtime import needed)
// ──────────────────────────────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  permission?: { module: string; action: string };
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'qa-cobranza',
    labelKey: 'inmobiliaria.commandPalette.quickActions.cobranza',
    icon: ChatCircleText,
    href: '/panel/inmobiliaria/ai/cobranza',
    permission: { module: 'cobranza', action: 'view' },
  },
  {
    id: 'qa-cotizador',
    labelKey: 'inmobiliaria.commandPalette.quickActions.cotizador',
    icon: FileText,
    href: '/panel/inmobiliaria/ai/cotizador',
    permission: { module: 'cotizador', action: 'view' },
  },
  {
    id: 'qa-reportes',
    labelKey: 'inmobiliaria.commandPalette.quickActions.reportes',
    icon: ChartLineUp,
    href: '/panel/inmobiliaria/reportes',
    permission: { module: 'reportes', action: 'view' },
  },
  {
    id: 'qa-portafolio',
    labelKey: 'inmobiliaria.commandPalette.quickActions.portafolio',
    icon: House,
    href: '/panel/inmobiliaria/portafolio',
    permission: { module: 'portafolio', action: 'view' },
  },
  {
    id: 'qa-hoy',
    labelKey: 'inmobiliaria.commandPalette.quickActions.hoy',
    icon: Lightning,
    href: '/panel/inmobiliaria/hoy',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Badge chip
// ──────────────────────────────────────────────────────────────────────────────

const BADGE_COLORS = {
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

function Badge({ label, color }: { label: string; color: keyof typeof BADGE_COLORS }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border',
        BADGE_COLORS[color],
      )}
    >
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Preview panel for debtor results
// ──────────────────────────────────────────────────────────────────────────────

interface StageColors { text: string; bg: string; border: string }

interface DebtorData {
  fullName: string;
  cedulaMasked: string;
  phoneMasked: string | null;
  emailMasked: string | null;
  currentStage: string;
  stageLabel: string;
  daysInStage: number;
  channel: string;
  isPaused: boolean;
  lastActivityAt: string | null;
  stageColors: StageColors | null;
}

function toDebtorData(raw: Record<string, unknown>): DebtorData {
  const sc = raw.stageColors as StageColors | null | undefined;
  return {
    fullName: String(raw.fullName ?? ''),
    cedulaMasked: String(raw.cedulaMasked ?? ''),
    phoneMasked: raw.phoneMasked != null ? String(raw.phoneMasked) : null,
    emailMasked: raw.emailMasked != null ? String(raw.emailMasked) : null,
    currentStage: String(raw.currentStage ?? ''),
    stageLabel: String(raw.stageLabel ?? ''),
    daysInStage: typeof raw.daysInStage === 'number' ? raw.daysInStage : 0,
    channel: String(raw.channel ?? ''),
    isPaused: raw.isPaused === true,
    lastActivityAt: raw.lastActivityAt != null ? String(raw.lastActivityAt) : null,
    stageColors: sc ?? null,
  };
}

function DebtorPreview({ data: rawData }: { data: Record<string, unknown> }) {
  const { locale } = useI18n();
  const data = toDebtorData(rawData);
  const colors = data.stageColors;

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-neutral-900 truncate">
              {data.fullName}
            </p>
            <p className="text-[11px] text-neutral-500 font-mono truncate">
              {data.cedulaMasked}
            </p>
          </div>
        </div>
      </div>

      {/* Stage pill */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium',
          colors?.text,
          colors?.bg,
          colors?.border,
        )}
      >
        {data.stageLabel}
        {data.daysInStage > 0 && (
          <span className="opacity-70">· {data.daysInStage}d</span>
        )}
      </div>

      {/* Contact info */}
      <div className="space-y-2">
        {data.phoneMasked != null && (
          <div className="flex items-center gap-2 text-[12px] text-neutral-600">
            <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <span className="font-mono">{data.phoneMasked}</span>
          </div>
        )}
        {data.emailMasked != null && (
          <div className="flex items-center gap-2 text-[12px] text-neutral-600">
            <Envelope className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <span className="truncate">{data.emailMasked}</span>
          </div>
        )}
      </div>

      {/* Last activity */}
      {data.lastActivityAt != null && (
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <Clock className="w-3 h-3" />
          <span>
            {locale === 'es' ? 'Última actividad' : 'Last activity'}{' '}
            {relativeTime(data.lastActivityAt, locale)}
          </span>
        </div>
      )}

      {/* Paused banner */}
      {data.isPaused && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <Warning className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 leading-snug">
            {locale === 'es' ? 'Cobranza pausada' : 'Collections paused'}
          </p>
        </div>
      )}

      {/* Open link hint */}
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-1 border-t border-neutral-100">
        <ArrowElbowDownLeft className="w-3 h-3" />
        <span>{locale === 'es' ? 'Enter para abrir en cobranza' : 'Enter to open in collections'}</span>
        <ArrowSquareOut className="w-3 h-3 ml-auto" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Generic preview (no special template)
// ──────────────────────────────────────────────────────────────────────────────

function GenericPreview({ result }: { result: SearchResult }) {
  const { locale } = useI18n();
  return (
    <div className="p-5 space-y-3">
      <p className="text-[14px] font-semibold text-neutral-900">{result.title}</p>
      {result.subtitle && (
        <p className="text-[12px] text-neutral-500">{result.subtitle}</p>
      )}
      {result.badges && result.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.badges.map((b, i) => (
            <Badge key={i} label={b.label} color={b.color} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
        <ArrowElbowDownLeft className="w-3 h-3" />
        <span>{locale === 'es' ? 'Enter para abrir' : 'Enter to open'}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Preview router
// ──────────────────────────────────────────────────────────────────────────────

function ResultPreview({ result }: { result: SearchResult | null }) {
  const { locale } = useI18n();

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
          <MagnifyingGlass className="w-5 h-5 text-neutral-400" />
        </div>
        <p className="text-[13px] text-neutral-500">
          {locale === 'es'
            ? 'Selecciona un resultado para ver el detalle'
            : 'Select a result to see details'}
        </p>
      </div>
    );
  }

  if (result.preview?.type === 'debtor') {
    return <DebtorPreview data={result.preview} />;
  }

  return <GenericPreview result={result} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// Novedades empty state
// ──────────────────────────────────────────────────────────────────────────────

function NovadadesState({
  onNavigate,
}: {
  onNavigate: (href: string) => void;
}) {
  const { t, locale } = useI18n();
  const { canAccess } = usePermissionsContext();

  // Fetch last 8 audit events, no filters (default last 7d)
  const { items, isLoading } = useAuditLog({});
  const recentItems = items.slice(0, 8);

  const visibleQuickActions = QUICK_ACTIONS.filter(
    (qa) => !qa.permission || canAccess(qa.permission.module, qa.permission.action),
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: feed */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Novedades header */}
        <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/80">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
            {t('inmobiliaria.commandPalette.novedades')}
          </p>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner className="w-4 h-4 text-neutral-400 animate-spin" />
            </div>
          ) : recentItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-neutral-400">
                {locale === 'es' ? 'Sin actividad reciente' : 'No recent activity'}
              </p>
            </div>
          ) : (
            <div>
              {recentItems.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-neutral-700 leading-snug">
                      {auditActionLabel(entry.action, locale)}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {entry.entity_type} · {relativeTime(entry.occurred_at, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: quick actions */}
      <div className="w-[180px] flex-shrink-0 border-l border-neutral-100 flex flex-col">
        <div className="px-3 py-2.5 border-b border-neutral-100 bg-neutral-50/80">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
            {t('inmobiliaria.commandPalette.quickActions.title')}
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {visibleQuickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.id}
                  onClick={() => onNavigate(qa.href)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 group-hover:bg-indigo-50 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors leading-snug">
                    {t(qa.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main palette
// ──────────────────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { agency } = useAuth();
  const { canAccess } = usePermissionsContext();

  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const highlightedItemRef = useRef<HTMLButtonElement | null>(null);

  const agencyId = agency?.id ?? null;

  // Build sources (filtered by permissions)
  const sources = useMemo((): SearchSource[] => {
    const all: SearchSource[] = [debtorsSource];
    return all.filter(
      (s) => !s.permission || canAccess(s.permission.module, s.permission.action),
    );
  }, [canAccess]);

  const ctx = useMemo((): SearchSourceContext => ({ agencyId }), [agencyId]);

  const { bySource, flat, isAnyLoading } = useFederatedSearch(query, sources, ctx);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIdx(0);
  }, [flat.length]);

  const highlightedResult = flat[highlightIdx] ?? null;

  const handleNavigate = useCallback(
    (href: string) => {
      close();
      setQuery('');
      router.push(href);
    },
    [close, router],
  );

  // Keyboard navigation within the palette (input captures these)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (flat.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const result = flat[highlightIdx];
        if (result) handleNavigate(result.href);
      }
    },
    [flat, highlightIdx, handleNavigate],
  );

  // Scroll highlighted item into view
  useEffect(() => {
    highlightedItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  // Focus input when palette opens; clear query when closed
  useEffect(() => {
    if (isOpen) {
      // Small defer so Dialog animation doesn't steal focus
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setHighlightIdx(0);
    }
  }, [isOpen]);

  // Group results by sourceId for display
  const groups = useMemo(() => {
    const result: Array<{ source: SearchSource; results: SearchResult[] }> = [];
    for (const src of sources) {
      const state = bySource[src.id];
      if (!state) continue;
      if (state.results.length > 0) {
        result.push({ source: src, results: state.results });
      }
    }
    return result;
  }, [sources, bySource]);

  const hasResults = flat.length > 0;
  const isQuerying = query.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      {/* We override DialogContent styling for the palette layout */}
      <DialogContent
        className={cn(
          // Override default DialogContent styles
          'fixed left-1/2 top-[12%] -translate-x-1/2 translate-y-0',
          'w-[min(760px,96vw)] p-0 gap-0',
          'rounded-2xl border border-neutral-200 bg-white shadow-2xl',
          'overflow-hidden',
          // Disable the default slide-in animation — we use our own
          'data-[state=open]:animate-none data-[state=closed]:animate-none',
          'max-h-[70vh]',
        )}
        // Remove the close button from the Radix default
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {t('inmobiliaria.commandPalette.title')}
        </DialogTitle>

        {/* ── Search input row ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
          {isAnyLoading ? (
            <Spinner className="w-4 h-4 text-neutral-400 animate-spin flex-shrink-0" />
          ) : (
            <MagnifyingGlass className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={hasResults}
            aria-autocomplete="list"
            aria-controls="cp-results-list"
            aria-label={t('inmobiliaria.commandPalette.inputLabel')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('inmobiliaria.commandPalette.placeholder')}
            className={cn(
              'flex-1 text-[14px] text-neutral-900 placeholder:text-neutral-400',
              'bg-transparent border-0 outline-none',
            )}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label={locale === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex min-h-[320px] max-h-[calc(70vh-100px)]">
          {!isQuerying ? (
            /* Empty state / Novedades */
            <NovadadesState onNavigate={handleNavigate} />
          ) : (
            <>
              {/* Results list */}
              <div className="flex-1 min-w-0 border-r border-neutral-100 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  {!hasResults && !isAnyLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <MagnifyingGlass className="w-4 h-4 text-neutral-400" />
                      </div>
                      <p className="text-[13px] text-neutral-500">
                        {t('inmobiliaria.commandPalette.noResults', { query })}
                      </p>
                    </div>
                  )}

                  <div
                    id="cp-results-list"
                    role="listbox"
                    aria-label={t('inmobiliaria.commandPalette.resultsLabel')}
                    ref={listRef}
                  >
                    {groups.map(({ source, results }) => {
                      const SrcIcon = source.icon;
                      return (
                        <div key={source.id}>
                          {/* Group header */}
                          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50/80 border-b border-neutral-100 sticky top-0 z-10">
                            <SrcIcon className="w-3 h-3 text-neutral-400" />
                            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
                              {t(source.labelKey)}
                            </span>
                          </div>

                          {/* Result rows */}
                          {results.map((result) => {
                            const flatIdx = flat.indexOf(result);
                            const isHighlighted = flatIdx === highlightIdx;

                            return (
                              <button
                                key={result.id}
                                ref={isHighlighted ? (el) => { highlightedItemRef.current = el; } : undefined}
                                role="option"
                                aria-selected={isHighlighted}
                                onClick={() => handleNavigate(result.href)}
                                onMouseEnter={() => setHighlightIdx(flatIdx)}
                                className={cn(
                                  'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                                  isHighlighted
                                    ? 'bg-indigo-50'
                                    : 'hover:bg-neutral-50',
                                )}
                              >
                                {/* Icon */}
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                                    isHighlighted ? 'bg-indigo-100' : 'bg-neutral-100',
                                  )}
                                >
                                  <SrcIcon
                                    className={cn(
                                      'w-3.5 h-3.5',
                                      isHighlighted ? 'text-indigo-600' : 'text-neutral-500',
                                    )}
                                  />
                                </div>

                                {/* Text */}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      'text-[13px] font-medium truncate',
                                      isHighlighted ? 'text-indigo-900' : 'text-neutral-800',
                                    )}
                                  >
                                    {result.title}
                                  </p>
                                  {result.subtitle && (
                                    <p className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
                                      {result.subtitle}
                                    </p>
                                  )}
                                  {result.badges && result.badges.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {result.badges.map((b, i) => (
                                        <Badge key={i} label={b.label} color={b.color} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Loading spinners per source */}
                    {isAnyLoading &&
                      sources
                        .filter((s) => bySource[s.id]?.isLoading)
                        .map((s) => (
                          <div key={`loading-${s.id}`} className="flex items-center gap-2 px-4 py-3">
                            <Spinner className="w-3 h-3 text-neutral-400 animate-spin" />
                            <span className="text-[12px] text-neutral-400">
                              {t(s.labelKey)}…
                            </span>
                          </div>
                        ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Preview panel */}
              <div className="w-[240px] flex-shrink-0 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={highlightedResult?.id ?? 'empty'}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ResultPreview result={highlightedResult} />
                    </motion.div>
                  </AnimatePresence>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        {/* ── Footer / keyboard hints ─────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <ArrowUp className="w-3 h-3" />
            <ArrowDown className="w-3 h-3" />
            <span>{t('inmobiliaria.commandPalette.hintNavigate')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <ArrowElbowDownLeft className="w-3 h-3" />
            <span>{t('inmobiliaria.commandPalette.hintOpen')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <kbd className="text-[10px] font-mono bg-neutral-200 px-1 rounded">esc</kbd>
            <span>{t('inmobiliaria.commandPalette.hintClose')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
