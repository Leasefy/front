'use client'

/**
 * ConversacionesTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Visión §12: los mensajes intercambiados con el candidato durante el estudio.
 *
 * ── Lo que había acá ─────────────────────────────────────────────────────
 * Debajo del vacío se pintaba una tarjeta «Ejemplo de la conversación» con
 * tres burbujas escritas a mano —«Hola, para avanzar con tu estudio
 * necesitamos tu certificado laboral.» / «Claro, lo subo hoy mismo.»—
 * maquetadas exactamente como se verá el hilo real: mismo globo, mismo color
 * por lado, mismo autor. Estaba rotulada como ejemplo, sí, pero era un
 * intercambio inventado adentro de la ficha de una persona real, y quien la
 * lee de reojo se lleva la idea de que el candidato ya contestó.
 *
 * ── Por qué sigue vacío ──────────────────────────────────────────────────
 * El hilo real SÍ existe: `GET /applications/:id/chat`, ya cableado en
 * `src/lib/api/messages.service.ts`. Lo que falta es el puente. Esta ficha se
 * abre con el id de la corrida del motor (`runId`) y hoy ningún endpoint
 * devuelve a qué postulación corresponde, que es de donde cuelgan los
 * mensajes. Sin ese dato no se puede pedir el hilo correcto — y pedir uno
 * equivocado sería peor que no mostrar ninguno.
 *
 * Así que esta pestaña dice qué falta y por qué, y no muestra nada más.
 */

import { ChatsCircle } from '@phosphor-icons/react'

import { useTf } from '@/lib/i18n/use-tf'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

interface ConversacionesTabProps {
  /** Disponibles para enriquecer el hilo cuando exista el puente al chat. */
  decision?: EstudioDecision
  result?: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

export function ConversacionesTab(_props: ConversacionesTabProps) {
  const tf = useTf()

  return (
    <div className="space-y-5" data-testid="estudio-conversaciones">
      <EmptyState
        icon={ChatsCircle}
        title={tf(`${NS}.detalle.conversaciones.empty.title`, 'Todavía no podemos mostrar el hilo')}
        description={tf(
          `${NS}.detalle.conversaciones.empty.description`,
          'Los mensajes con el candidato se guardan contra su postulación, y esta ficha se abre con el identificador del análisis. Falta la conexión entre los dos: hasta que exista, cualquier conversación que mostráramos acá no sería necesariamente la de esta persona.',
        )}
      />
    </div>
  )
}
