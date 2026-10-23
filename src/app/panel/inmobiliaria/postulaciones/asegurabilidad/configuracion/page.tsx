'use client'

// Permissions gate enforced by cotizador layout.tsx (Phase 29).
// This page does NOT re-check canAccess — layout handles 403 before mount.

/**
 * /postulaciones/asegurabilidad/configuracion — F9: la postura de autonomía
 * del cotizador.
 *
 * GET /ai-hub/agentes/cotizador/autonomia alimenta el <AutonomiaPanel>
 * transversal (modo + valla). El veredicto del cotizador decide sobre
 * personas → el backend sirve t323=true y sale el aviso T-323.
 *
 * El modo se puede CAMBIAR desde acá con la misma escritura que usa el cajón
 * «Autonomía» del Piloto (PUT del micro), sólo para administradores: el panel
 * pide confirmación al subir de autonomía y avisa por el toast. Para el resto
 * el modo es un chip de lectura que dice dónde se cambia.
 */

import { useI18n } from '@/lib/i18n'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

export default function CotizadorConfiguracionPage() {
  const { t } = useI18n()
  const { isAdmin } = usePermissionsContext()
  const { data, isLoading, error, busy, setModo, refetch } = useAgentAutonomia('cotizador')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.secAgentes')}
        titulo={t('inmobiliaria.ai.cotizador.configuracion.title')}
        descripcion={t('inmobiliaria.ai.cotizador.configuracion.subtitle')}
      />

      <AutonomiaPanel
        data={data}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        onCambiarModo={setModo}
        puedeCambiar={isAdmin}
        busy={busy}
      />
    </div>
  )
}
