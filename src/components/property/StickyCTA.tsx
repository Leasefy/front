'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Heart, ShareNetwork, VideoCamera, MapPin, TrendUp, Clock, Check, Calendar, SpinnerGap } from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<'apply' | 'visit'>('apply');
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
    if (activeTab !== 'visit') return;

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
  }, [activeTab, propertyId]);

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
      <div className="bg-white dark:bg-card border border-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
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
                <button
                  onClick={onWishlistToggle}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-200',
                    isWishlisted
                      ? 'border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10'
                      : 'border-border hover:bg-neutral-100 text-muted-foreground'
                  )}
                  aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={cn('w-[18px] h-[18px]', isWishlisted && 'fill-current')} />
                </button>
              )}
              <button
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:bg-neutral-100 text-muted-foreground transition-all duration-200"
                aria-label="Compartir"
              >
                <ShareNetwork className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[30px] font-heading font-bold text-foreground tracking-[-0.02em]">
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

          {/* Tab selector */}
          <div className="flex p-1 bg-neutral-100 dark:bg-white/[0.04] rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('apply')}
              className={cn(
                'flex-1 py-2.5 text-[13px] font-semibold transition-all duration-200 rounded-lg',
                activeTab === 'apply'
                  ? 'bg-white dark:bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Postularme
            </button>
            <button
              onClick={() => setActiveTab('visit')}
              className={cn(
                'flex-1 py-2.5 text-[13px] font-semibold transition-all duration-200 rounded-lg',
                activeTab === 'visit'
                  ? 'bg-white dark:bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Agendar visita
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'apply' ? (
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
              <div className="w-16 h-16 mx-auto mb-4 bg-[hsl(var(--success-500))] rounded-2xl flex items-center justify-center">
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
              <button
                onClick={handleResetVisit}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Agendar otra visita
              </button>
            </div>
          ) : (
            /* ── Visit tab ── */
            <div className="space-y-5">
              {/* Visit type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVisitType('presencial')}
                  className={cn(
                    'py-3 px-4 border text-[13px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
                    visitTextT === 'presencial'
                      ? 'border-primary bg-primary text-white uppercase tracking-wide font-mono'
                      : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  <MapPin className="w-4 h-4" />
                  Presencial
                </button>
                <button
                  onClick={() => setVisitType('virtual')}
                  className={cn(
                    'py-3 px-4 border text-[13px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
                    visitTextT === 'virtual'
                      ? 'border-primary bg-primary text-white uppercase tracking-wide font-mono'
                      : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  <VideoCamera className="w-4 h-4" />
                  Virtual
                </button>
              </div>

              {/* Slots loading */}
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <SpinnerGap className="w-5 h-5 animate-spin text-muted-foreground" />
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
                        return (
                          <button
                            key={dateStr}
                            onClick={() => { setSelectedDay(dateStr); setSelectedTime(null); setScheduleError(null); }}
                            className={cn(
                              'py-2.5 border text-center rounded-xl transition-all duration-200',
                              selectedDay === dateStr
                                ? 'border-primary bg-primary text-white'
                                : 'border-border hover:border-primary/30'
                            )}
                          >
                            <span className={cn(
                              'block text-[9px] font-semibold uppercase tracking-wide',
                              selectedDay === dateStr ? 'text-white/70' : 'text-muted-foreground'
                            )}>
                              {dayName}
                            </span>
                            <span className="block text-[15px] font-bold mt-0.5">{dayNumber}</span>
                          </button>
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
                          <button
                            key={time}
                            onClick={() => { if (available) { setSelectedTime(time); setScheduleError(null); } }}
                            disabled={!available}
                            className={cn(
                              'py-2.5 text-[12px] font-semibold border rounded-lg transition-all duration-200',
                              !available
                                ? 'border-border/50 text-muted-foreground/40 bg-neutral-50 cursor-not-allowed line-through'
                                : selectedTime === time
                                  ? 'border-primary bg-primary text-white uppercase tracking-wide font-mono'
                                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            )}
                          >
                            {formatTimeSlot(time)}
                          </button>
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
              <button
                onClick={handleScheduleVisit}
                disabled={!selectedDay || !selectedTime || isSubmitting || slotsLoading}
                className={cn(
                  'w-full py-4 text-[14px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
                  selectedDay && selectedTime && !isSubmitting && !slotsLoading
                    ? 'bg-primary text-white uppercase tracking-wide font-mono hover:bg-primary/90 shadow-sm'
                    : 'bg-neutral-100 text-muted-foreground cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin" />
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
              </button>

              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--success-500))]" />
                Visita gratuita
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                Cancelación flexible
              </p>
            </div>
          )}
        </div>

        {/* Activity footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:from-white/[0.02] dark:to-white/[0.04] border-t border-border">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--success-500))] animate-pulse" />
            <span>Última postulación hace <span className="font-semibold text-foreground">12 minutos</span></span>
          </div>
        </div>
      </div>
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
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);

  useEffect(() => {
    setStats(generateMockStats(propertyId));
  }, [propertyId]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border lg:hidden z-30">
      {stats && stats.demandLevel !== 'media' && (
        <div className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-semibold text-center flex items-center justify-center gap-1.5">
          <TrendUp className="w-3.5 h-3.5" />
          {stats.demandLevel === 'muy-alta' ? 'Muy solicitado' : 'Popular esta semana'}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-heading font-bold text-foreground tracking-tight">
              {formatCurrency(price)}
              <span className="text-[13px] font-medium text-muted-foreground">/mes</span>
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
            <Link href={`/aplicar/${propertyId}`}>
              <button className="min-h-[44px] px-5 py-3 bg-primary text-white text-[13px] font-semibold uppercase tracking-wide font-mono rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm">
                Postularme
              </button>
            </Link>
            <button className="min-h-[44px] px-4 py-3 border border-border rounded-xl text-[13px] font-semibold text-foreground hover:bg-neutral-100 transition-all duration-200">
              Visita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
