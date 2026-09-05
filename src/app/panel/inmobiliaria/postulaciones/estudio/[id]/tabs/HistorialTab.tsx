'use client'

/**
 * HistorialTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Visión §11: la línea de tiempo de eventos del estudio (solicitud creada →
 * documentos recibidos → motor evaluó → decisión → acciones del humano).
 *
 * ── Lo que había acá ─────────────────────────────────────────────────────
 * Debajo del vacío se pintaba una tarjeta «Ejemplo de la línea de tiempo» con
 * cuatro eventos —«Solicitud creada», «Documentos recibidos», «Estudio
 * evaluado», «Decisión registrada»— con su descripción, su punto, su línea
 * conectora y su número de paso. Las fechas iban en «— · —», que es lo único
 * que salvaba al bloque, pero los cuatro eventos afirmaban que en esta ficha
 * pasaron esas cuatro cosas. De ninguna de las cuatro tenemos registro.
 *
 * ── Por qué sigue vacío ──────────────────────────────────────────────────
 * El historial real SÍ existe: `GET /applications/:id/timeline` devuelve los
 * `ApplicationEvent` (CREATED, SUBMITTED, STATUS_CHANGED, DOCUMENT_UPLOADED …)
 * con su fecha y su autor, y ya está en el contrato generado del front. Falta
 * lo mismo que en Conversaciones: esta ficha se abre con el id de la corrida
 * del motor y no hay endpoint que diga a qué postulación corresponde.
 *
 * Además, la respuesta del motor (`TenantScoringResult`) no trae NINGUNA
 * fecha propia —ni cuándo se creó la corrida ni cuándo terminó—, así que hoy
 * no hay ni siquiera dos puntos verdaderos con los que armar media línea de
 * tiempo.
 */

import { ClockCounterClockwise } from '@phosphor-icons/react'

import { useTf } from '@/lib/i18n/use-tf'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

interface HistorialTabProps {
  /** Disponibles para enriquecer el historial cuando exista el puente. */
  decision?: EstudioDecision
  result?: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

export function HistorialTab(_props: HistorialTabProps) {
  const tf = useTf()

  return (
    <div className="space-y-5" data-testid="estudio-historial">
      <EmptyState
        icon={ClockCounterClockwise}
        title={tf(`${NS}.detalle.historial.empty.title`, 'Todavía no podemos mostrar el historial')}
        description={tf(
          `${NS}.detalle.historial.empty.description`,
          'Los eventos del estudio se registran contra la postulación del candidato, y esta ficha se abre con el identificador del análisis. Falta la conexión entre los dos. El resultado del motor tampoco trae fechas propias, así que por ahora no hay ni un solo evento con hora que podamos afirmar.',
        )}
      />
    </div>
  )
}
