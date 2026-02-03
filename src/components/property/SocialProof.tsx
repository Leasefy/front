'use client';

import { useState, useEffect } from 'react';
import { Eye, Users, TrendingUp, Clock, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialProofProps {
  propertyId: string;
  className?: string;
}

// Simulated data - in production this would come from analytics/backend
function generateMockStats(propertyId: string) {
  // Use propertyId to generate consistent but varied numbers
  const seed = propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    viewingNow: (seed % 8) + 3, // 3-10 people
    viewsToday: (seed % 45) + 15, // 15-60 views
    applicationsThisWeek: (seed % 12) + 5, // 5-16 applications
    savedByUsers: (seed % 25) + 10, // 10-35 saves
    avgResponseTime: '< 24h',
    demandLevel: seed % 3 === 0 ? 'alta' : seed % 3 === 1 ? 'muy-alta' : 'media',
  };
}

/**
 * SocialProofBanner - Horizontal banner with urgency indicators
 * Shows above property details
 */
export function SocialProofBanner({ propertyId, className }: SocialProofProps) {
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);
  const [currentViewers, setCurrentViewers] = useState(0);

  useEffect(() => {
    const mockStats = generateMockStats(propertyId);
    setStats(mockStats);
    setCurrentViewers(mockStats.viewingNow);

    // Simulate live viewer count fluctuation
    const interval = setInterval(() => {
      setCurrentViewers((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newValue = prev + change;
        return Math.max(2, Math.min(15, newValue));
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [propertyId]);

  if (!stats) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-2', className)}>
      {/* Live viewers */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-sm text-foreground/70">
          <span className="font-medium text-foreground">{currentViewers} personas</span> viendo ahora
        </span>
      </div>

      {/* Views today */}
      <div className="flex items-center gap-1.5 text-sm text-foreground/70">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span>{stats.viewsToday} visitas hoy</span>
      </div>

      {/* Demand indicator */}
      {stats.demandLevel !== 'media' && (
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium',
          stats.demandLevel === 'muy-alta'
            ? 'bg-red-50 text-red-700 border border-red-100'
            : 'bg-amber-50 text-amber-700 border border-amber-100'
        )}>
          <TrendingUp className="w-3.5 h-3.5" />
          {stats.demandLevel === 'muy-alta' ? 'Muy alta demanda' : 'Alta demanda'}
        </div>
      )}
    </div>
  );
}

/**
 * SocialProofCard - Compact card for sidebar/StickyCTA area
 * Shows key conversion metrics
 */
export function SocialProofCard({ propertyId, className }: SocialProofProps) {
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);

  useEffect(() => {
    setStats(generateMockStats(propertyId));
  }, [propertyId]);

  if (!stats) return null;

  return (
    <div className={cn('border border-border bg-black/[0.02] p-4', className)}>
      <div className="space-y-3">
        {/* Applications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground/70">Postulaciones esta semana</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{stats.applicationsThisWeek}</span>
        </div>

        {/* Saved */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground/70">Guardado por usuarios</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{stats.savedByUsers}</span>
        </div>

        {/* Response time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground/70">Tiempo de respuesta</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{stats.avgResponseTime}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * UrgencyBadge - Small badge for high-demand properties
 */
export function UrgencyBadge({
  propertyId,
  variant = 'default',
  className
}: SocialProofProps & { variant?: 'default' | 'minimal' }) {
  const [stats, setStats] = useState<ReturnType<typeof generateMockStats> | null>(null);

  useEffect(() => {
    setStats(generateMockStats(propertyId));
  }, [propertyId]);

  if (!stats || stats.demandLevel === 'media') return null;

  if (variant === 'minimal') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        stats.demandLevel === 'muy-alta' ? 'text-red-600' : 'text-amber-600',
        className
      )}>
        <TrendingUp className="w-3 h-3" />
        {stats.demandLevel === 'muy-alta' ? 'Muy solicitado' : 'Popular'}
      </span>
    );
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium',
      stats.demandLevel === 'muy-alta'
        ? 'bg-red-500 text-white'
        : 'bg-amber-500 text-white',
      className
    )}>
      <TrendingUp className="w-3.5 h-3.5" />
      {stats.demandLevel === 'muy-alta' ? 'Muy solicitado' : 'Popular'}
    </div>
  );
}

/**
 * TrustBadges - Verification and trust signals
 */
export function TrustBadges({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>Verificado</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>Respuesta rapida</span>
      </div>
    </div>
  );
}

/**
 * LiveActivityFeed - Shows recent activity (applications, views)
 * Creates FOMO effect
 */
export function LiveActivityFeed({ propertyId, className }: SocialProofProps) {
  const [activities, setActivities] = useState<Array<{ type: string; time: string; location: string }>>([]);

  useEffect(() => {
    // Generate mock recent activities
    const locations = ['Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena'];
    const mockActivities = [
      { type: 'postulacion', time: 'hace 12 min', location: locations[Math.floor(Math.random() * locations.length)] },
      { type: 'visita', time: 'hace 34 min', location: locations[Math.floor(Math.random() * locations.length)] },
      { type: 'guardado', time: 'hace 1 hora', location: locations[Math.floor(Math.random() * locations.length)] },
    ];
    setActivities(mockActivities);
  }, [propertyId]);

  if (activities.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Actividad reciente</p>
      <div className="space-y-2">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span>
              {activity.type === 'postulacion' && 'Alguien se postuló'}
              {activity.type === 'visita' && 'Visita agendada'}
              {activity.type === 'guardado' && 'Guardado en favoritos'}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
