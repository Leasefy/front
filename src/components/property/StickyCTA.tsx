'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Share2, Video, MapPin, Eye, Users, TrendingUp, Clock } from 'lucide-react';
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
    demandLevel: seed % 3 === 0 ? 'alta' : seed % 3 === 1 ? 'muy-alta' : 'media',
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
  const [visitType, setVisitType] = useState<'presencial' | 'virtual'>('presencial');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);
  const [currentViewers, setCurrentViewers] = useState(0);

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

  const handleScheduleVisit = () => {
    if (selectedDay && selectedTime) {
    }
  };

  return (
    <div className={cn('lg:sticky lg:top-28', className)}>
      {/* CTA Card */}
      <div className="bg-white dark:bg-card border border-border dark:border-border">
        {/* Urgency Banner */}
        {stats && stats.demandLevel !== 'media' && (
          <div className={cn(
            'px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium',
            stats.demandLevel === 'muy-alta'
              ? 'bg-red-500 text-white'
              : 'bg-amber-500 text-white'
          )}>
            <TrendingUp className="w-4 h-4" />
            {stats.demandLevel === 'muy-alta'
              ? 'Muy solicitado - No te quedes sin verlo'
              : 'Popular esta semana'}
          </div>
        )}

        <div className="p-6">
          {/* Live viewers indicator */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-sm text-foreground/70">
              <span className="font-medium text-foreground">{currentViewers} personas</span> viendo ahora
            </span>
          </div>

          {/* Header with actions */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-medium text-foreground">Arriendo Facil</p>
              <p className="text-xs text-muted-foreground mt-0.5">Respuesta en menos de 24h</p>
            </div>
            <div className="flex gap-2">
              {onWishlistToggle && (
                <button
                  onClick={onWishlistToggle}
                  className={cn(
                    'min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center border transition-colors',
                    isWishlisted
                      ? 'border-red-200 bg-red-50 text-red-500'
                      : 'border-border hover:bg-black/5 text-muted-foreground'
                  )}
                  aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={cn('w-5 h-5', isWishlisted && 'fill-current')} />
                </button>
              )}
              <button
                className="min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center border border-border hover:bg-black/5 text-muted-foreground transition-colors"
                aria-label="Compartir"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">
                {formatCurrency(price)}
              </span>
              <span className="text-sm text-muted-foreground">/mes</span>
            </div>
            {adminFee > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                + {formatCurrency(adminFee)} administración
              </p>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex mb-5">
            <button
              onClick={() => setActiveTab('apply')}
              className={cn(
                'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'apply'
                  ? 'border-black text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground'
              )}
            >
              Postularme
            </button>
            <button
              onClick={() => setActiveTab('visit')}
              className={cn(
                'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'visit'
                  ? 'border-black text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground'
              )}
            >
              Agendar visita
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'apply' ? (
            /* Apply Tab */
            <div>
              {/* Social proof stats */}
              <div className="bg-black/[0.02] border border-border p-4 mb-5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Sin codeudor requerido</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Postulaciones esta semana</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{stats?.applicationsThisWeek || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Respuesta promedio</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">&lt; 24 horas</span>
                </div>
              </div>

              <Link href={`/aplicar/${propertyId}`} className="block">
                <button className="w-full py-4 bg-black text-white text-sm font-medium tracking-tight hover:bg-black/90 transition-colors">
                  Postularme a esta propiedad
                </button>
              </Link>

              <p className="text-xs text-muted-foreground text-center mt-3">
                Completa tu solicitud en minutos
              </p>
            </div>
          ) : (
            /* Visit Tab */
            <div className="space-y-5">
              {/* Visit Type */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVisitType('presencial')}
                  className={cn(
                    'py-3 px-4 border text-sm font-medium transition-all flex items-center justify-center gap-2',
                    visitType === 'presencial'
                      ? 'border-black bg-black text-white'
                      : 'border-border text-foreground/70 hover:border-border'
                  )}
                >
                  <MapPin className="w-4 h-4" />
                  Presencial
                </button>
                <button
                  onClick={() => setVisitType('virtual')}
                  className={cn(
                    'py-3 px-4 border text-sm font-medium transition-all flex items-center justify-center gap-2',
                    visitType === 'virtual'
                      ? 'border-black bg-black text-white'
                      : 'border-border text-foreground/70 hover:border-border'
                  )}
                >
                  <Video className="w-4 h-4" />
                  Virtual
                </button>
              </div>

              {/* Date Selection */}
              <div>
                <p className="text-xs text-muted-foreground mb-2.5 font-mono uppercase tracking-wide">Fecha</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {days.map((day) => (
                    <button
                      key={day.full}
                      onClick={() => setSelectedDay(day.full)}
                      className={cn(
                        'py-2 border text-center transition-all',
                        selectedDay === day.full
                          ? 'border-black bg-black text-white'
                          : 'border-border hover:border-border'
                      )}
                    >
                      <span className={cn(
                        'block text-[10px] font-mono uppercase',
                        selectedDay === day.full ? 'text-white/60' : 'text-muted-foreground'
                      )}>
                        {day.dayName}
                      </span>
                      <span className="block text-sm font-semibold">
                        {day.dayNumber}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <p className="text-xs text-muted-foreground mb-2.5 font-mono uppercase tracking-wide">Hora</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        'py-2.5 text-sm border transition-all',
                        selectedTime === time
                          ? 'border-black bg-black text-white'
                          : 'border-border text-foreground/70 hover:border-border'
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
                disabled={!selectedDay || !selectedTime}
                className={cn(
                  'w-full py-4 text-sm font-medium transition-all',
                  selectedDay && selectedTime
                    ? 'bg-black text-white hover:bg-black/90'
                    : 'bg-black/5 text-muted-foreground cursor-not-allowed'
                )}
              >
                {selectedDay && selectedTime
                  ? 'Confirmar visita'
                  : 'Selecciona fecha y hora'}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Visita gratuita · Cancelación flexible
              </p>
            </div>
          )}
        </div>

        {/* Recent activity footer */}
        <div className="px-6 py-4 bg-black/[0.02] border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Última postulación hace 12 minutos</span>
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
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-30">
      {/* Urgency banner for mobile */}
      {stats && stats.demandLevel !== 'media' && (
        <div className="px-4 py-1.5 bg-red-500 text-white text-xs font-medium text-center flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Alta demanda - {stats.applicationsThisWeek} postulaciones esta semana
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-medium text-foreground">
              {formatCurrency(price)}
              <span className="text-sm font-normal text-muted-foreground">/mes</span>
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              {stats?.viewingNow || 0} personas viendo
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/aplicar/${propertyId}`}>
              <button className="min-h-[44px] px-5 py-3 bg-black text-white text-sm font-medium hover:bg-black/90 transition-colors">
                Postularme
              </button>
            </Link>
            <button className="min-h-[44px] px-4 py-3 border border-border text-sm font-medium text-foreground hover:bg-black/5 transition-colors">
              Visita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
