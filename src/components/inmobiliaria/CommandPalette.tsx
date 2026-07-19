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
  User,
  Clock,
  ChatCircleText,
  FileText,
  ChartLineUp,
  House,
  ArrowSquareOut,
  Phone,
  Envelope,
  Warning,
  CaretRight,
  Plus,
  X,
} from '@phosphor-icons/react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner as DSSpinner } from '@/components/ui/spinner';
import { IconButton } from '@leasefy/cadence';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { useCommandPalette } from '@/lib/context/CommandPaletteContext';
import { useFederatedSearch } from '@/lib/hooks/useFederatedSearch';
import type { SearchResult, SearchSource, SearchSourceContext } from '@/lib/hooks/useFederatedSearch';
import { navigationSource } from '@/lib/search/sources/navigation-source';
import { debtorsSource } from '@/lib/search/sources/debtors-source';
import { propietariosSource } from '@/lib/search/sources/propietarios-source';
import { agentesSource } from '@/lib/search/sources/agentes-source';
import { propiedadesSource } from '@/lib/search/sources/propiedades-source';
import { contratosSource } from '@/lib/search/sources/contratos-source';
import { cotizacionesSource } from '@/lib/search/sources/cotizaciones-source';
import { apBillsSource } from '@/lib/search/sources/ap-bills-source';
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
    id: 'qa-nueva-propiedad',
    labelKey: 'inmobiliaria.commandPalette.quickActions.nuevaPropiedad',
    icon: Plus,
    href: '/publicar',
    permission: { module: 'portafolio', action: 'create' },
  },
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
    href: '/panel/inmobiliaria/ai/asegurabilidad',
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
];

// ──────────────────────────────────────────────────────────────────────────────
// Badge chip
// ──────────────────────────────────────────────────────────────────────────────

const BADGE_COLORS = {
  green: 'bg-success-soft text-success border-success/30',
  amber: 'bg-warning-soft text-warning border-warning/30',
  red: 'bg-danger-soft text-danger border-danger/30',
  violet: 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle border-border dark:border-strong',
  neutral: 'bg-muted text-muted-foreground border-border',
};

function Badge({ label, color }: { label: string; color: keyof typeof BADGE_COLORS }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border',
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
          <div className="w-9 h-9 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground truncate">
              {data.fullName}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {data.cedulaMasked}
            </p>
          </div>
        </div>
      </div>

      {/* Stage pill */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-medium',
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
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-mono">{data.phoneMasked}</span>
          </div>
        )}
        {data.emailMasked != null && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Envelope className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{data.emailMasked}</span>
          </div>
        )}
      </div>

      {/* Last activity */}
      {data.lastActivityAt != null && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {locale === 'es' ? 'Última actividad' : 'Last activity'}{' '}
            {relativeTime(data.lastActivityAt, locale)}
          </span>
        </div>
      )}

      {/* Paused banner */}
      {data.isPaused && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-warning-soft border border-warning/30">
          <Warning className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-warning leading-snug">
            {locale === 'es' ? 'Cobranza pausada' : 'Collections paused'}
          </p>
        </div>
      )}

      {/* Open link hint */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border">
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
      <p className="text-[14px] font-semibold text-foreground">{result.title}</p>
      {result.subtitle && (
        <p className="text-[12px] text-muted-foreground">{result.subtitle}</p>
      )}
      {result.badges && result.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.badges.map((b, i) => (
            <Badge key={i} label={b.label} color={b.color} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2 border-t border-border">
        <ArrowElbowDownLeft className="w-3 h-3" />
        <span>{locale === 'es' ? 'Enter para abrir' : 'Enter to open'}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Preview: propietario
// ──────────────────────────────────────────────────────────────────────────────

function PropietarioPreview({ data }: { data: Record<string, unknown> }) {
  const { locale } = useI18n();
  const name = String(data.name ?? '');
  const email = String(data.email ?? '');
  const phone = String(data.phone ?? '');
  const city = data.city != null ? String(data.city) : null;
  const propertyCount = typeof data.propertyCount === 'number' ? data.propertyCount : 0;
  const activeLeases = typeof data.activeLeases === 'number' ? data.activeLeases : 0;
  const totalMonthlyRent = typeof data.totalMonthlyRent === 'number' ? data.totalMonthlyRent : 0;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground truncate">{name}</p>
          {city && <p className="text-[11px] text-muted-foreground truncate">{city}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Envelope className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-mono">{phone}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="bg-muted rounded-md p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {locale === 'es' ? 'Propiedades' : 'Properties'}
          </p>
          <p className="text-[16px] font-semibold text-foreground">{propertyCount}</p>
        </div>
        <div className="bg-muted rounded-md p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {locale === 'es' ? 'Arriendos' : 'Leases'}
          </p>
          <p className="text-[16px] font-semibold text-foreground">{activeLeases}</p>
        </div>
      </div>
      {totalMonthlyRent > 0 && (
        <div className="bg-success-soft border border-success/30 rounded-md p-2.5">
          <p className="text-[10px] text-success font-medium">
            {locale === 'es' ? 'Renta mensual total' : 'Total monthly rent'}
          </p>
          <p className="text-[14px] font-semibold text-success">
            ${totalMonthlyRent.toLocaleString('es-CO')}
          </p>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border">
        <ArrowElbowDownLeft className="w-3 h-3" />
        <span>{locale === 'es' ? 'Enter para abrir' : 'Enter to open'}</span>
        <ArrowSquareOut className="w-3 h-3 ml-auto" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Preview: propiedad
// ──────────────────────────────────────────────────────────────────────────────

function PropiedadPreview({ data }: { data: Record<string, unknown> }) {
  const { locale } = useI18n();
  const title = String(data.title ?? '');
  const address = String(data.address ?? '');
  const city = String(data.city ?? '');
  const monthlyRent = typeof data.monthlyRent === 'number' ? data.monthlyRent : 0;
  const bedrooms = typeof data.bedrooms === 'number' ? data.bedrooms : null;
  const bathrooms = typeof data.bathrooms === 'number' ? data.bathrooms : null;
  const area = typeof data.area === 'number' ? data.area : null;
  const status = String(data.status ?? '');

  const STATUS_COLORS: Record<string, string> = {
    available: 'bg-success-soft text-success border-success/30',
    published: 'bg-success-soft text-success border-success/30',
    rented: 'bg-primary-soft text-primary dark:text-[#7B95FF] border-primary/30',
    pending: 'bg-warning-soft text-warning border-warning/30',
    draft: 'bg-muted text-muted-foreground border-border',
  };
  const STATUS_LABELS_ES: Record<string, string> = {
    available: 'Disponible',
    published: 'Publicada',
    rented: 'Arrendada',
    pending: 'Pendiente',
    draft: 'Borrador',
  };

  return (
    <div className="p-5 space-y-4">
      <div>
        <p className="text-[14px] font-semibold text-foreground leading-snug">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{address}, {city}</p>
      </div>
      <span className={cn(
        'inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border',
        STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-border',
      )}>
        {STATUS_LABELS_ES[status] ?? status}
      </span>
      {monthlyRent > 0 && (
        <div className="bg-surface-muted dark:bg-ink border border-border dark:border-strong rounded-md p-2.5">
          <p className="text-[10px] text-fg-muted dark:text-fg-subtle font-medium">
            {locale === 'es' ? 'Canon mensual' : 'Monthly rent'}
          </p>
          <p className="text-[14px] font-semibold text-foreground">
            ${monthlyRent.toLocaleString('es-CO')}
          </p>
        </div>
      )}
      {(bedrooms != null || area != null) && (
        <div className="grid grid-cols-3 gap-1.5">
          {bedrooms != null && (
            <div className="bg-muted rounded-md p-2 text-center">
              <p className="text-[16px] font-semibold text-foreground">{bedrooms}</p>
              <p className="text-[9px] text-muted-foreground uppercase">{locale === 'es' ? 'Hab' : 'Bed'}</p>
            </div>
          )}
          {bathrooms != null && (
            <div className="bg-muted rounded-md p-2 text-center">
              <p className="text-[16px] font-semibold text-foreground">{bathrooms}</p>
              <p className="text-[9px] text-muted-foreground uppercase">{locale === 'es' ? 'Baños' : 'Bath'}</p>
            </div>
          )}
          {area != null && (
            <div className="bg-muted rounded-md p-2 text-center">
              <p className="text-[16px] font-semibold text-foreground">{area}</p>
              <p className="text-[9px] text-muted-foreground uppercase">m²</p>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border">
        <ArrowElbowDownLeft className="w-3 h-3" />
        <span>{locale === 'es' ? 'Enter para abrir' : 'Enter to open'}</span>
        <ArrowSquareOut className="w-3 h-3 ml-auto" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Preview: contrato
// ──────────────────────────────────────────────────────────────────────────────

function ContratoPreview({ data }: { data: Record<string, unknown> }) {
  const { locale } = useI18n();
  const tenantName = data.tenantName != null ? String(data.tenantName) : null;
  const tenantEmail = data.tenantEmail != null ? String(data.tenantEmail) : null;
  const propertyAddress = data.propertyAddress != null ? String(data.propertyAddress) : null;
  const monthlyRent = typeof data.monthlyRent === 'number' ? data.monthlyRent : 0;
  const status = String(data.status ?? '');
  const startDate = data.startDate != null ? String(data.startDate) : null;
  const endDate = data.endDate != null ? String(data.endDate) : null;

  const STATUS_COLORS_PILL: Record<string, string> = {
    ACTIVE: 'bg-success-soft text-success border-success/30',
    SIGNED: 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle border-border dark:border-strong',
    PENDING_TENANT: 'bg-warning-soft text-warning border-warning/30',
    PENDING_TENANT_SIGNATURE: 'bg-warning-soft text-warning border-warning/30',
    PENDING_LANDLORD: 'bg-warning-soft text-warning border-warning/30',
    PENDING_LANDLORD_SIGNATURE: 'bg-warning-soft text-warning border-warning/30',
    DRAFT: 'bg-muted text-muted-foreground border-border',
    EXPIRED: 'bg-danger-soft text-danger border-danger/30',
    CANCELLED: 'bg-danger-soft text-danger border-danger/30',
  };
  const STATUS_LABELS_ES: Record<string, string> = {
    ACTIVE: 'Activo',
    SIGNED: 'Firmado',
    PENDING_TENANT: 'Pdte. inquilino',
    PENDING_TENANT_SIGNATURE: 'Pdte. inquilino',
    PENDING_LANDLORD: 'Pdte. propietario',
    PENDING_LANDLORD_SIGNATURE: 'Pdte. propietario',
    DRAFT: 'Borrador',
    EXPIRED: 'Expirado',
    CANCELLED: 'Cancelado',
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-5 space-y-4">
      {tenantName && (
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground truncate">{tenantName}</p>
            {tenantEmail && (
              <p className="text-[11px] text-muted-foreground truncate">{tenantEmail}</p>
            )}
          </div>
        </div>
      )}
      {propertyAddress && (
        <p className="text-[12px] text-muted-foreground truncate">{propertyAddress}</p>
      )}
      <span className={cn(
        'inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border',
        STATUS_COLORS_PILL[status] ?? 'bg-muted text-muted-foreground border-border',
      )}>
        {STATUS_LABELS_ES[status] ?? status}
      </span>
      {monthlyRent > 0 && (
        <div className="bg-surface-muted dark:bg-ink border border-border dark:border-strong rounded-md p-2.5">
          <p className="text-[10px] text-fg-muted dark:text-fg-subtle font-medium">
            {locale === 'es' ? 'Canon mensual' : 'Monthly rent'}
          </p>
          <p className="text-[14px] font-semibold text-fg-muted dark:text-fg-subtle">
            ${monthlyRent.toLocaleString('es-CO')}
          </p>
        </div>
      )}
      {(startDate ?? endDate) && (
        <div className="space-y-1">
          {startDate && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span>{locale === 'es' ? 'Inicio' : 'Start'}: {formatDate(startDate)}</span>
            </div>
          )}
          {endDate && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span>{locale === 'es' ? 'Fin' : 'End'}: {formatDate(endDate)}</span>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border">
        <ArrowElbowDownLeft className="w-3 h-3" />
        <span>{locale === 'es' ? 'Enter para abrir' : 'Enter to open'}</span>
        <ArrowSquareOut className="w-3 h-3 ml-auto" />
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
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <MagnifyingGlass className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-[13px] text-muted-foreground">
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

  if (result.preview?.type === 'propietario') {
    return <PropietarioPreview data={result.preview} />;
  }

  if (result.preview?.type === 'propiedad') {
    return <PropiedadPreview data={result.preview} />;
  }

  if (result.preview?.type === 'contrato') {
    return <ContratoPreview data={result.preview} />;
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
    <div className="flex-1 min-h-0 md:flex-none max-h-none md:max-h-[min(60vh,460px)] overflow-y-auto overscroll-contain p-2">
      {/* Acciones rápidas — primary, full width */}
      <p className="px-2.5 pt-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
        {t('inmobiliaria.commandPalette.quickActions.title')}
      </p>
      <div className="space-y-0.5">
        {visibleQuickActions.map((qa) => {
          const Icon = qa.icon;
          return (
            // allowlist: command-list row (icon-tile + label + caret as one nav target) —
            // rich list-row click target; Button can't host it (list-row precedent). Native.
            <button
              key={qa.id}
              onClick={() => onNavigate(qa.href)}
              className="group w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left hover:bg-accent transition-colors"
            >
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-muted group-hover:bg-primary/15 flex-shrink-0 transition-colors">
                <Icon className="w-[18px] h-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-foreground">
                {t(qa.labelKey)}
              </span>
              <CaretRight className="w-4 h-4 flex-shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Novedades — secondary, only as much room as it needs */}
      <p className="px-2.5 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
        {t('inmobiliaria.commandPalette.novedades')}
      </p>
      {isLoading ? (
        <div className="space-y-0.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2">
              <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-1/4 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : recentItems.length === 0 ? (
        <p className="px-2.5 py-2 text-[12px] text-muted-foreground">
          {locale === 'es' ? 'Sin actividad reciente' : 'No recent activity'}
        </p>
      ) : (
        <div className="space-y-0.5">
          {recentItems.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="grid place-items-center w-7 h-7 rounded-full bg-muted flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-foreground leading-snug">
                  {auditActionLabel(entry.action, locale)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {entry.entity_type} · {relativeTime(entry.occurred_at, locale)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
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
    const all: SearchSource[] = [
      // Group: Navegación — panel pages + their in-page actions, always first
      navigationSource,
      // Group: Cobranza
      debtorsSource,
      // Group: Inmobiliario
      propietariosSource,
      agentesSource,
      propiedadesSource,
      contratosSource,
      // Group: Cotizador + AP
      cotizacionesSource,
      apBillsSource,
    ];
    return all.filter(
      (s) => !s.permission || canAccess(s.permission.module, s.permission.action),
    );
  }, [canAccess]);

  const ctx = useMemo((): SearchSourceContext => ({ agencyId, canAccess }), [agencyId, canAccess]);

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
          // Override default DialogContent styles.
          // <md: full-screen takeover (dvh — la URL bar / teclado no dejan franja
          // muerta) con el close X por defecto visible; md+: palette centrado clasico.
          'fixed inset-x-0 left-0 top-0 translate-x-0 translate-y-0',
          'h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none',
          'md:inset-x-auto md:left-1/2 md:top-[12%] md:-translate-x-1/2 md:translate-y-0',
          'md:h-auto md:max-h-none md:w-[min(720px,94vw)] md:rounded-xl',
          'flex flex-col p-0 gap-0',
          'border border-border bg-popover text-popover-foreground',
          'overflow-hidden md:[&>button]:hidden',
          // Disable the default slide-in animation — we use our own
          'data-[state=open]:animate-none data-[state=closed]:animate-none',
        )}
        // Remove the close button from the Radix default
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {t('inmobiliaria.commandPalette.title')}
        </DialogTitle>

        {/* ── Search input row ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 h-[52px] border-b border-border">
          {isAnyLoading ? (
            <DSSpinner size="sm" variant="muted" className="flex-shrink-0" />
          ) : (
            <MagnifyingGlass className="w-[18px] h-[18px] text-muted-foreground flex-shrink-0" />
          )}
          {/* allowlist: bare ⌘K combobox input (borderless, transparent, seamless palette bar
              with role=combobox + arrow-key nav). Cadence Input's bordered skin breaks the
              seamless bar; Cadence CommandMenu would require rewriting the federated-search
              palette. Kept native. */}
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
            className="flex-1 text-[15px] text-foreground placeholder:text-muted-foreground bg-transparent border-0 outline-none"
          />
          {query && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => setQuery('')}
              aria-label={locale === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
              className="text-muted-foreground"
              icon={<X className="w-4 h-4" />}
            />
          )}
        </div>

        {/* ── Body — llena la pantalla en movil, height-capped en md+ ────── */}
        <div className="flex flex-1 min-h-0 pb-[env(safe-area-inset-bottom)] md:pb-0 md:flex-none md:min-h-[320px] md:max-h-[calc(70vh-100px)]">
          {!isQuerying ? (
            /* Empty state — single-column command list */
            <NovadadesState onNavigate={handleNavigate} />
          ) : (
            <>
              {/* Results list */}
              <div className="flex-1 min-w-0 md:border-r border-border overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 [&>[data-radix-scroll-area-viewport]]:overscroll-contain">
                  {!hasResults && !isAnyLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <MagnifyingGlass className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-[13px] text-muted-foreground">
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
                        <div key={source.id} className="px-2">
                          {/* Group header */}
                          <div className="flex items-center gap-2 px-2 pt-3 pb-1.5 sticky top-0 z-10 bg-popover/95 backdrop-blur-sm">
                            <SrcIcon className="w-3 h-3 text-muted-foreground/70" />
                            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.12em]">
                              {t(source.labelKey)}
                            </span>
                          </div>

                          {/* Result rows */}
                          {results.map((result) => {
                            const flatIdx = flat.indexOf(result);
                            const isHighlighted = flatIdx === highlightIdx;

                            return (
                              // allowlist: ARIA listbox option row (role="option", scroll-ref,
                              // hover-highlight) in a custom combobox — Cadence has no listbox-option
                              // primitive; Button would break the role/ref/keyboard-nav machinery.
                              <button
                                key={result.id}
                                ref={isHighlighted ? (el) => { highlightedItemRef.current = el; } : undefined}
                                role="option"
                                aria-selected={isHighlighted}
                                onClick={() => handleNavigate(result.href)}
                                onMouseEnter={() => setHighlightIdx(flatIdx)}
                                className={cn(
                                  'w-full flex items-start gap-3 px-2 py-2 rounded-md text-left transition-colors',
                                  isHighlighted ? 'bg-accent' : 'hover:bg-muted/60',
                                )}
                              >
                                {/* Icon */}
                                <div
                                  className={cn(
                                    'grid place-items-center w-7 h-7 rounded-md flex-shrink-0 mt-0.5 transition-colors',
                                    isHighlighted ? 'bg-primary/15' : 'bg-muted',
                                  )}
                                >
                                  <SrcIcon
                                    className={cn(
                                      'w-3.5 h-3.5 transition-colors',
                                      isHighlighted ? 'text-primary' : 'text-muted-foreground',
                                    )}
                                  />
                                </div>

                                {/* Text */}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-medium truncate text-foreground">
                                    {result.title}
                                  </p>
                                  {result.subtitle && (
                                    <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
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
                            <DSSpinner size="xs" variant="muted" />
                            <span className="text-[12px] text-muted-foreground">
                              {t(s.labelKey)}…
                            </span>
                          </div>
                        ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Preview panel — mouse/hover-driven, hidden on mobile */}
              <div className="hidden md:flex w-[240px] flex-shrink-0 overflow-hidden flex-col">
                <ScrollArea className="flex-1 [&>[data-radix-scroll-area-viewport]]:overscroll-contain">
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

        {/* ── Footer / keyboard hints — desktop-only (no hay teclado en touch) ── */}
        <div className="hidden md:flex items-center gap-4 px-4 h-10 border-t border-border bg-muted/30">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="grid place-items-center w-[18px] h-[18px] rounded border border-border bg-background">
              <ArrowUp className="w-2.5 h-2.5" />
            </kbd>
            <kbd className="grid place-items-center w-[18px] h-[18px] rounded border border-border bg-background">
              <ArrowDown className="w-2.5 h-2.5" />
            </kbd>
            <span>{t('inmobiliaria.commandPalette.hintNavigate')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="grid place-items-center w-[18px] h-[18px] rounded border border-border bg-background">
              <ArrowElbowDownLeft className="w-2.5 h-2.5" />
            </kbd>
            <span>{t('inmobiliaria.commandPalette.hintOpen')}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="inline-flex items-center h-[18px] px-1.5 rounded border border-border bg-background text-[10px] font-medium">
              esc
            </kbd>
            <span>{t('inmobiliaria.commandPalette.hintClose')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
