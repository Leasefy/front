'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Heart, ShareNetwork, VideoCamera, MapPin, TrendUp, Clock, Check, Calendar, Copy } from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SegmentedControl } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/lib/auth/use-auth';
import { visitsApi } from '@/lib/api/visits.service';
import { ApiError } from '@/lib/api/client';
import type { VisitSlot } from '@/lib/api/visits.types';

interface StickyCTAProps {
  propertyId: string;
  price: number;
  adminFee?: number;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Group slot array by date, preserving availability */
type SlotsByDate = Record<string, Array<{ time: string; available: boolean }>>;

function groupSlotsByDate(slots: VisitSlot[]): SlotsByDate {
  const grouped: SlotsByDate = {};
  for (const slot of slots) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push({ time: slot.startTime, available: slot.isAvailable });
  }
  return grouped;
}

/** "2026-04-12" → { dayName: "Sáb", dayNumber: 12 } */
function parseDateDisplay(dateStr: string) {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const date = new Date(dateStr + 'T12:00:00'); // noon avoids timezone shifts
  return { dayName: dayNames[date.getDay()], dayNumber: date.getDate() };
}

/** "09:00" → "9:00am" | "14:00" → "2:00pm" */
function formatTimeSlot(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')}${period}`;
}

/** "YYYY-MM-DD" + N days in the future */
function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Generate mock stats based on propertyId (social proof only, unchanged)
function generateMockStats(propertyId: string) {
  const seed = propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    viewingNow: (seed % 8) + 3,
    demandLevel: seed % 3 === 0 ? 'alta' : seed % 3 === 1 ? 'muy-alta' : 'media',
  };
}

// ─── Error messages ──────────────────────────────────────────────────────────

function getScheduleErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return 'Este horario ya fue reservado. Elegí otro.';
    if (err.status === 403) return 'No podés agendar una visita para tu propia propiedad.';
    if (err.status === 400) return 'Formato de datos inválido. Recargá la página e intentá de nuevo.';
  }
  return 'Ocurrió un error al agendar. Intentá de nuevo.';
}

// ============================================================================
// StickyCTA
// ============================================================================

/**
 * StickyCTA — Sticky card with dual action: Apply or Schedule Visit.
 * Visit scheduling is connected to the real backend API.
 */
export function StickyCTA({
  propertyId,
  price,
  adminFee = 0,
  isWishlisted = false,
  onWishlistToggle,
  className,
}: StickyCTAProps) {
  const { user, isAuthenticated, hasActiveAgencyMembership } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // An inmobiliaria/agent viewing a property is NOT a prospective tenant: they
  // must not apply or schedule a visit. Instead they get a "share this property"
  // panel (copy link). Covers agency owners, invited agents (backendRole AGENT),
  // and personal-role users with an active agency membership.
  const isAgencyViewer =
    !!user && (user.role === 'agency' || user.backendRole === 'AGENT' || hasActiveAgencyMembership);

  const [ctaMode, setCtaMode] = useState<'apply' | 'visit'>('apply');
  const [visitTextT, setVisitType] = useState<'presencial' | 'virtual'>('presencial');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Slots from backend
  const [slotsByDate, setSlotsByDate] = useState<SlotsByDate>({});
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Social proof (mock, visual only)
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);
  const [currentViewers, setCurrentViewers] = useState(0);

  // Shareable public URL of this property (built client-side to avoid an SSR
  // hydration mismatch). Used by the header share button and the agency panel.
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/propiedades/${propertyId}`);
    }
  }, [propertyId]);

  const handleCopyShare = async () => {
    const url = shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}/propiedades/${propertyId}` : '');
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail (permissions/insecure context) — the link stays
      // visible in the input for the user to select and copy manually.
    }
  };

  // ─── Social proof ──────────────────────────────────────────────────────────
  useEffect(() => {
    const mockStats = generateMockStats(propertyId);
    setStats(mockStats);
    setCurrentViewers(mockStats.viewingNow);

    const interval = setInterval(() => {
      setCurrentViewers((prev) => Math.max(2, Math.min(12, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 10000);
    return () => clearInterval(interval);
  }, [propertyId]);

  // ─── Fetch slots when visit tab opens ─────────────────────────────────────
  useEffect(() => {
    if (ctaMode !== 'visit') return;

    setSlotsLoading(true);
    setSlotsByDate({});
    setSelectedDay(null);
    setSelectedTime(null);

    // Start from tomorrow (backend requires ≥2h anticipation)
    const startDate = addDays(1);
    const endDate = addDays(8); // 7-day window

    visitsApi
      .getSlots(propertyId, startDate, endDate)
      .then((response) => setSlotsByDate(groupSlotsByDate(response.slots)))
      .catch(() => {
        // Non-blocking: empty slots will show "sin disponibilidad"
      })
      .finally(() => setSlotsLoading(false));
  }, [ctaMode, propertyId]);

  // ─── Derived slot data ────────────────────────────────────────────────────

  /** Dates that have at least one available slot, sorted ascending */
  const availableDates = Object.keys(slotsByDate)
    .filter((date) => slotsByDate[date].some((s) => s.available))
    .sort()
    .slice(0, 5); // max 5 shown (grid columns)

  /** Slots for the currently selected date */
  const timesForDay = selectedDay ? (slotsByDate[selectedDay] ?? []) : [];

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleScheduleVisit = async () => {
    if (!selectedDay || !selectedTime) return;

    // Require authentication
    if (!isAuthenticated || !user) {
      router.push(`/auth?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    setIsSubmitting(true);
    setScheduleError(null);

    try {
      await visitsApi.create({
        propertyId,
        date: selectedDay,
        startTime: selectedTime,
        visitType: visitTextT === 'presencial' ? 'IN_PERSON' : 'VIRTUAL',
      });
      setVisitConfirmed(true);
    } catch (err) {
      setScheduleError(getScheduleErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetVisit = () => {
    setVisitConfirmed(false);
    setSelectedDay(null);
    setSelectedTime(null);
    setScheduleError(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn('lg:sticky lg:top-28', className)}>
      <Card className="overflow-hidden rounded-xl border-border shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        {/* Urgency Banner */}
        {stats && stats.demandLevel !== 'media' && (
          <div className="px-5 py-3 flex items-center justify-center gap-2.5 text-[13px] font-semibold bg-primary text-primary-foreground">
            <TrendUp className="w-4 h-4" />
            {stats.demandLevel === 'muy-alta'
              ? 'Muy solicitado — No te quedes sin verlo'
              : 'Popular esta semana'}
          </div>
        )}

        <div className="p-6">
          {/* Live viewers */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success-500))] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--success-500))]" />
            </span>
            <span className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">{currentViewers} personas</span> viendo ahora
            </span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[15px] font-heading font-semibold text-foreground tracking-tight">Leasefy</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--success-50))] dark:bg-[hsl(var(--success-500)/0.15)] text-[hsl(var(--success-500))] text-[10px] font-semibold uppercase tracking-wide rounded-full">
                  <Check className="w-3 h-3" />
                  Verificado
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Respuesta en menos de 24h</p>
            </div>
            <div className="flex gap-2">
              {onWishlistToggle && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={onWishlistToggle}
                  className={cn(
                    'h-10 w-10',
                    isWishlisted
                      ? 'border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10'
                      : 'hover:bg-surface-muted text-muted-foreground'
                  )}
                  aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={cn('w-[18px] h-[18px]', isWishlisted && 'fill-current')} />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopyShare}
                className="h-10 w-10 hover:bg-surface-muted text-muted-foreground"
                aria-label={copied ? 'Enlace copiado' : 'Compartir'}
                data-testid="share-copy-header"
              >
                {copied ? (
                  <Check className="w-[18px] h-[18px] text-[hsl(var(--success-500))]" />
                ) : (
                  <ShareNetwork className="w-[18px] h-[18px]" />
                )}
              </Button>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[30px] font-mono tabular-nums font-bold text-foreground tracking-[-0.02em]">
                {formatCurrency(price)}
              </span>
              <span className="text-[14px] text-muted-foreground font-medium">/mes</span>
            </div>
            {adminFee > 0 && (
              <p className="text-[13px] text-muted-foreground mt-1.5">
                + {formatCurrency(adminFee)} administración
              </p>
            )}
          </div>

          {isAgencyViewer ? (
            /* ── Agency/agent viewer: share panel (no apply / no visit) ── */
            <div data-testid="agency-share-panel">
              <div className="flex items-start gap-2.5 mb-4">
                <ShareNetwork className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-muted-foreground">
                  Compartí esta propiedad con un interesado por el canal que prefieras.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 h-11 mb-3">
                <input
                  readOnly
                  value={shareUrl}
                  aria-label="Enlace de la propiedad"
                  data-testid="agency-share-url"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-fg-muted outline-none truncate"
                />
              </div>

              <Button
                type="button"
                onClick={handleCopyShare}
                hideArrow
                className="w-full gap-2"
                data-testid="agency-share-copy"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Enlace copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar enlace
                  </>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Como inmobiliaria no aplicas ni agendas visitas — compartí el enlace con tus clientes.
              </p>
            </div>
          ) : (
          <>
          {/* Tab selector */}
          <div className="mb-6">
            <SegmentedControl<'apply' | 'visit'>
              fullWidth
              value={ctaMode}
              onChange={setCtaMode}
              aria-label="Postularme o agendar visita"
              options={[
                { value: 'apply', label: 'Postularme' },
                { value: 'visit', label: 'Agendar visita' },
              ]}
            />
          </div>

          {/* Tab content */}
          {ctaMode === 'apply' ? (
            /* ── Apply tab ── */
            <div>
              <div className="space-y-2.5 mb-6">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[hsl(var(--success-500))] flex-shrink-0" strokeWidth={3} />
                  <p className="text-[13px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Sin codeudor</span> — aplica solo con tu información
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                  <p className="text-[13px] text-muted-foreground">
                    Respuesta en <span className="font-semibold text-foreground">menos de 24h</span>
                  </p>
                </div>
              </div>
              <Link href={`/aplicar/${propertyId}`} className="block">
                <Button className="w-full">Postularme a esta propiedad</Button>
              </Link>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Completa tu solicitud en minutos
              </p>
            </div>
          ) : visitConfirmed ? (
            /* ── Visit confirmed ── */
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-[hsl(var(--success-500))] rounded-xl flex items-center justify-center">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                ¡Visita agendada!
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                {visitTextT === 'presencial' ? 'Visita presencial' : 'Visita virtual'}
              </p>
              {selectedDay && selectedTime && (
                <p className="text-sm font-medium text-foreground mb-4">
                  {parseDateDisplay(selectedDay).dayName} {parseDateDisplay(selectedDay).dayNumber} · {formatTimeSlot(selectedTime)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-6">
                Te enviaremos un correo con los detalles de la visita y recordatorios.
              </p>
              <Button
                variant="link"
                hideArrow
                onClick={handleResetVisit}
                className="h-auto p-0 text-sm font-medium"
              >
                Agendar otra visita
              </Button>
            </div>
          ) : (
            /* ── Visit tab ── */
            <div className="space-y-5">
              {/* Visit type */}
              <SegmentedControl<'presencial' | 'virtual'>
                fullWidth
                value={visitTextT}
                onChange={setVisitType}
                aria-label="Tipo de visita"
                options={[
                  {
                    value: 'presencial',
                    ariaLabel: 'Presencial',
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Presencial
                      </span>
                    ),
                  },
                  {
                    value: 'virtual',
                    ariaLabel: 'Virtual',
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <VideoCamera className="w-4 h-4" />
                        Virtual
                      </span>
                    ),
                  },
                ]}
              />

              {/* Slots loading */}
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner variant="muted" />
                </div>
              ) : availableDates.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[13px] text-muted-foreground">Sin disponibilidad en los próximos días.</p>
                  <p className="text-[12px] text-muted-foreground/70 mt-1">Volvé a revisar pronto.</p>
                </div>
              ) : (
                <>
                  {/* Date picker */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Selecciona fecha</p>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {availableDates.map((dateStr) => {
                        const { dayName, dayNumber } = parseDateDisplay(dateStr);
                        const isSelected = selectedDay === dateStr;
                        return (
                          <Button
                            key={dateStr}
                            variant={isSelected ? 'default' : 'outline'}
                            hideArrow
                            onClick={() => { setSelectedDay(dateStr); setSelectedTime(null); setScheduleError(null); }}
                            className={cn(
                              'h-auto flex-col gap-0 px-0 py-2.5 rounded-xl',
                              !isSelected && 'hover:border-primary/30'
                            )}
                          >
                            <span className={cn(
                              'block text-[9px] font-semibold uppercase tracking-wide',
                              isSelected ? 'text-white/70' : 'text-muted-foreground'
                            )}>
                              {dayName}
                            </span>
                            <span className="block text-[15px] font-bold mt-0.5 font-mono tabular-nums">{dayNumber}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time picker — only shown after a date is selected */}
                  {selectedDay && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Selecciona hora</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {timesForDay.map(({ time, available }) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            hideArrow
                            onClick={() => { if (available) { setSelectedTime(time); setScheduleError(null); } }}
                            disabled={!available}
                            className={cn(
                              'h-auto py-2.5 rounded-md text-[12px] font-semibold font-mono tabular-nums',
                              !available && 'line-through',
                              available && selectedTime !== time && 'hover:border-primary/30'
                            )}
                          >
                            {formatTimeSlot(time)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Error message */}
              {scheduleError && (
                <p className="text-[12px] text-destructive text-center">{scheduleError}</p>
              )}

              {/* CTA button */}
              <Button
                onClick={handleScheduleVisit}
                disabled={!selectedDay || !selectedTime || isSubmitting || slotsLoading}
                hideArrow
                className="w-full h-auto py-4 rounded-xl text-[14px] gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" variant="current" />
                    Agendando...
                  </>
                ) : selectedDay && selectedTime ? (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar visita
                  </>
                ) : (
                  'Selecciona fecha y hora'
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--success-500))]" />
                Visita gratuita
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                Cancelación flexible
              </p>
            </div>
          )}
          </>
          )}
        </div>

        {/* Activity footer */}
        <div className="px-6 py-3.5 bg-surface-muted border-t border-border">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--success-500))] animate-pulse" />
            <span>Última postulación hace <span className="font-semibold text-foreground">12 minutos</span></span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// MobileStickyCTA
// ============================================================================

/**
 * MobileStickyCTA — Fixed bottom CTA for mobile devices
 */
export function MobileStickyCTA({
  propertyId,
  price,
}: {
  propertyId: string;
  price: number;
}) {
  const { user, hasActiveAgencyMembership } = useAuth();
  const isAgencyViewer =
    !!user && (user.role === 'agency' || user.backendRole === 'AGENT' || hasActiveAgencyMembership);

  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStats(generateMockStats(propertyId));
  }, [propertyId]);

  const handleCopyShare = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/propiedades/${propertyId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail silently (permissions/insecure context).
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-border lg:hidden z-30">
      {stats && stats.demandLevel !== 'media' && (
        <div className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-semibold text-center flex items-center justify-center gap-1.5">
          <TrendUp className="w-3.5 h-3.5" />
          {stats.demandLevel === 'muy-alta' ? 'Muy solicitado' : 'Popular esta semana'}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-mono tabular-nums font-bold text-foreground tracking-tight">
              {formatCurrency(price)}
              <span className="text-[13px] font-medium text-muted-foreground font-sans">/mes</span>
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success-500))] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--success-500))]" />
              </span>
              {stats?.viewingNow || 0} personas viendo
            </p>
          </div>
          <div className="flex gap-2">
            {isAgencyViewer ? (
              <Button type="button" onClick={handleCopyShare} hideArrow className="gap-2" data-testid="mobile-agency-share">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <ShareNetwork className="w-4 h-4" />
                    Compartir
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button asChild hideArrow>
                  <Link href={`/aplicar/${propertyId}`}>Postularme</Link>
                </Button>
                <Button variant="outline" hideArrow>
                  Visita
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
