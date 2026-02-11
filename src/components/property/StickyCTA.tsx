'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShareNetwork, VideoCamera, MapPin, TrendUp, Clock, Check, Sparkle, ArrowRight, Calendar, SpinnerGap } from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface StickyCTAProps {
  propertyId: string;
  price: number;
  adminFee?: number;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  className?: string;
}

// Generate next 5 days for scheduling
function getNextDays() {
  const days = [];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    days.push({
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      month: monthNames[date.getMonth()],
      full: date.toISOString().split('T')[0],
    });
  }
  return days;
}

// Generate mock stats based on propertyId
function generateMockStats(propertyId: string) {
  const seed = propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    viewingNow: (seed % 8) + 3,
    applicationsThisWeek: (seed % 12) + 5,
    demandLevel: seed % 3 === 0 ? 'alta' : seed % 3 === 1 ? 'muy-alta' : 'media', // demandLevel values are used in conditional logic and i18n
  };
}

const timeSlots = ['09:00am', '10:00am', '11:00am', '12:00pm', '03:00pm', '04:00pm'];

/**
 * StickyCTA - Sticky card with dual action: Apply or Schedule Visit
 * Includes social proof and urgency elements
 */
export function StickyCTA({
  propertyId,
  price,
  adminFee = 0,
  isWishlisted = false,
  onWishlistToggle,
  className,
}: StickyCTAProps) {
  const [activeTab, setActiveTab] = useState<'apply' | 'visit'>('apply');
  const [visitTextT, setVisitType] = useState<'presencial' | 'virtual'>('presencial');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);
  const [currentViewers, setCurrentViewers] = useState(0);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days = getNextDays();

  useEffect(() => {
    const mockStats = generateMockStats(propertyId);
    setStats(mockStats);
    setCurrentViewers(mockStats.viewingNow);

    // Simulate live viewer fluctuation
    const interval = setInterval(() => {
      setCurrentViewers((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(2, Math.min(12, prev + change));
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [propertyId]);

  const handleScheduleVisit = async () => {
    if (selectedDay && selectedTime) {
      setIsSubmitting(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubmitting(false);
      setVisitConfirmed(true);
    }
  };

  const handleResetVisit = () => {
    setVisitConfirmed(false);
    setSelectedDay(null);
    setSelectedTime(null);
  };

  return (
    <div className={cn('lg:sticky lg:top-28', className)}>
      {/* CTA Card - Rounded corners */}
      <div className="bg-white dark:bg-card border border-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Urgency Banner - Using design system amber/orange */}
        {stats && stats.demandLevel !== 'media' && (
          <div className="px-5 py-3 flex items-center justify-center gap-2.5 text-[13px] font-semibold bg-primary text-primary-foreground">
            <TrendUp className="w-4 h-4" />
            {stats.demandLevel === 'muy-alta'
              ? 'Muy solicitado — No te quedes sin verlo'
              : 'Popular esta semana'}
          </div>
        )}

        <div className="p-6">
          {/* Live viewers indicator */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success-500))] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--success-500))]"></span>
            </span>
            <span className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">{currentViewers} personas</span> viendo ahora
            </span>
          </div>

          {/* Header with actions */}
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

          {/* Price - More prominent */}
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

          {/* Tab Compass - Pill style with rounded corners */}
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

          {/* Tab Content */}
          {activeTab === 'apply' ? (
            /* Apply Tab */
            <div>
              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3.5 bg-[hsl(var(--success-50))] dark:bg-[hsl(var(--success-500)/0.08)] border border-[hsl(var(--success-100))] dark:border-[hsl(var(--success-500)/0.2)] rounded-xl">
                  <div className="w-9 h-9 bg-[hsl(var(--success-500))] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Sin codeudor requerido</p>
                    <p className="text-[11px] text-muted-foreground">Aplica solo con tu información</p>
                  </div>
                </div>

                {/* Response time */}
                <div className="flex items-center gap-3 p-3.5 bg-neutral-50 dark:bg-white/[0.02] border border-border rounded-xl">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Respuesta en menos de 24h</p>
                    <p className="text-[11px] text-muted-foreground">Tiempo promedio de evaluación</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Link href={`/aplicar/${propertyId}`} className="block group">
                <button className="w-full py-4 bg-primary text-white text-[14px] font-semibold tracking-tight rounded-xl hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                  <Sparkle className="w-4 h-4" />
                  Postularme a esta propiedad
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </button>
              </Link>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Completa tu solicitud en minutos
              </p>
            </div>
          ) : visitConfirmed ? (
            /* Visit Confirmed State */
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
              <p className="text-sm font-medium text-foreground mb-4">
                {days.find(d => d.full === selectedDay)?.dayName} {days.find(d => d.full === selectedDay)?.dayNumber} · {selectedTime}
              </p>
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
            /* Visit Tab */
            <div className="space-y-5">
              {/* Visit TextT */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVisitType('presencial')}
                  className={cn(
                    'py-3 px-4 border text-[13px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
                    visitTextT === 'presencial'
                      ? 'border-primary bg-primary text-white'
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
                      ? 'border-primary bg-primary text-white'
                      : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  <VideoCamera className="w-4 h-4" />
                  Virtual
                </button>
              </div>

              {/* Date Selection */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Selecciona fecha</p>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {days.map((day) => (
                    <button
                      key={day.full}
                      onClick={() => setSelectedDay(day.full)}
                      className={cn(
                        'py-2.5 border text-center rounded-xl transition-all duration-200',
                        selectedDay === day.full
                          ? 'border-primary bg-primary text-white'
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <span className={cn(
                        'block text-[9px] font-semibold uppercase tracking-wide',
                        selectedDay === day.full ? 'text-white/70' : 'text-muted-foreground'
                      )}>
                        {day.dayName}
                      </span>
                      <span className="block text-[15px] font-bold mt-0.5">
                        {day.dayNumber}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Selecciona hora</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        'py-2.5 text-[12px] font-semibold border rounded-lg transition-all duration-200',
                        selectedTime === time
                          ? 'border-primary bg-primary text-white'
                          : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Button */}
              <button
                onClick={handleScheduleVisit}
                disabled={!selectedDay || !selectedTime || isSubmitting}
                className={cn(
                  'w-full py-4 text-[14px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
                  selectedDay && selectedTime && !isSubmitting
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md'
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
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--success-500))]"></span>
                Visita gratuita
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                Cancelación flexible
              </p>
            </div>
          )}
        </div>

        {/* Recent activity footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:from-white/[0.02] dark:to-white/[0.04] border-t border-border">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--success-500))] animate-pulse"></span>
            <span>Última postulación hace <span className="font-semibold text-foreground">12 minutos</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MobileStickyCTA - Fixed bottom CTA for mobile devices
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
      {/* Urgency banner for mobile */}
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success-500))] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--success-500))]"></span>
              </span>
              {stats?.viewingNow || 0} personas viendo
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/aplicar/${propertyId}`}>
              <button className="min-h-[44px] px-5 py-3 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm">
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
