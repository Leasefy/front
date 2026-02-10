'use client';

import { cn } from '@/lib/utils';
import { AutonomySettings } from './AutonomySettings';

interface PreferencesPanelProps {
  className?: string;
}

/**
 * PreferencesPanel - Full-width settings container rendered in the main content area.
 *
 * Renders sub-sections:
 * - AutonomySettings (Phase 23-01): per-agent autonomy toggles
 * - Notification preferences (Phase 23-02, placeholder)
 * - Communication tone (Phase 23-02, placeholder)
 * - Threshold settings (Phase 23-02, placeholder)
 */
export function PreferencesPanel({ className }: PreferencesPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-y-auto',
        className
      )}
    >
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Page header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Configuracion</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Ajusta el comportamiento de tus agentes de IA y preferencias de la plataforma.
          </p>
        </div>

        {/* Autonomy settings */}
        <AutonomySettings />

        {/* Divider before future sections */}
        <div className="border-t border-neutral-200 dark:border-border" />

        {/* Placeholder for notification preferences (Phase 23-02) */}
        <div className="text-[13px] text-muted-foreground italic">
          Notificaciones, tono de comunicacion y umbrales se configuran en la siguiente fase.
        </div>
      </div>
    </div>
  );
}
