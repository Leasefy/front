'use client'

/**
 * Ficha de un ticket de mantenimiento (agente Fixi).
 *
 * Trae el detalle del micro por `useMantenimientoTicket` y lo pinta con
 * `TicketDetail`. Guardas de carga / vacío / error espejadas de cobranza. El
 * gate de acceso lo pone `mantenimientos/tickets/layout.tsx`.
 *
 * 🔴 LAS 5 ACCIONES ESTÁN APAGADAS, Y ES A PROPÓSITO.
 *
 * Hasta acá esta página cableaba los botones a mutadores del hook que sólo
 * cambiaban el estado LOCAL y escribían en la línea de tiempo del ticket frases
 * como «Proveedor asignado al ticket.» o «Se solicitó aprobación del
 * propietario.» — con `actor: 'human'`, como si alguien lo hubiera hecho.
 * Ninguna de esas cosas ocurría: no salía un aviso, no se asignaba a nadie, y
 * al recargar volvía todo atrás. `onCerrar` era el peor: mandaba la nota fija
 * «Cierre confirmado por el asesor: el caso no procede.», una frase que nadie
 * escribió, a un cierre que nunca se guardó.
 *
 * No es cableado que falta: el micro sirve estas rutas de mantenimiento SÓLO
 * por GET y el estado del ticket es del back, detrás del rail S2S
 * `/internal/mantenimiento` (`AGENT_API_KEY`), que el navegador no tiene. Hasta
 * que exista una ruta de escritura, los botones dicen que todavía no se puede.
 * Mientras tanto sí hay dónde operar de verdad: la pestaña «Mantenimiento» de
 * `/panel/inmobiliaria/mantenimientos`, que habla con el back y sí guarda.
 *
 * i18n: `…detalle.errorLoading` (existe). El vacío reusa `…inbox.empty` (no hay
 * clave `detalle.empty.*` en el árbol C7-03 — pendiente reportado).
 */

import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { useParams } from 'next/navigation'
import { Wrench } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/data-display/EmptyState'
import { useI18n } from '@/lib/i18n'
import { useMantenimientoTicket } from '@/lib/hooks/mantenimiento/use-mantenimiento-ticket'
import { TicketDetail } from '@/components/inmobiliaria/mantenimiento/TicketDetail'
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'

const ROOT = 'inmobiliaria.ai.mantenimiento'

export const MOTIVO_SOLO_LECTURA =
  'Desde acá el ticket sólo se mira: el agente todavía no expone una ruta para asignar, ' +
  'pedir información, escalar ni cerrar. Para operar de verdad usá la pestaña Mantenimiento.'

/**
 * Los cinco `on*` de `TicketDetail` son obligatorios y los botones están
 * apagados, así que nunca se llaman. No hacen nada A PROPÓSITO: la alternativa
 * que había —cambiar el estado local y escribirlo en el historial— era la que
 * mentía.
 */
const NO_SE_PUEDE_TODAVIA = () => {}

export default function MantenimientoTicketDetailPage() {
  const { t } = useI18n()
  const { ticketId } = useParams<{ ticketId: string }>()

  const { data, isLoading, error } = useMantenimientoTicket(ticketId)

  if (isLoading && !data) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </main>
    )
  }

  if (!data && !isLoading && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={Wrench}
          title={t(`${ROOT}.inbox.empty`)}
          description={t(`${ROOT}.inbox.emptyFiltered`)}
        />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="p-6 lg:p-8">
        <AlertaAccionable severidad="danger" titulo={t(`${ROOT}.detalle.errorLoading`)}>
          {error ?? null}
        </AlertaAccionable>
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8">
      {/* La ficha necesita una salida propia: el breadcrumb inline del layout
          viejo («Agentes AI › Mantenimiento») ya no existe y la pestaña
          «Tickets» es exacta, así que desde acá nada más volvía a la lista. */}
      <VolverALaLista
        href="/panel/inmobiliaria/mantenimientos/tickets"
        label={t('inmobiliaria.ai.volverA.tickets')}
        className="mb-4"
      />
      <TicketDetail
        detail={data}
        isBusy={isLoading}
        onAsignar={NO_SE_PUEDE_TODAVIA}
        onPedirInfo={NO_SE_PUEDE_TODAVIA}
        onSolicitarAprobacion={NO_SE_PUEDE_TODAVIA}
        onEscalar={NO_SE_PUEDE_TODAVIA}
        onCerrar={NO_SE_PUEDE_TODAVIA}
        motivoDeshabilitado={MOTIVO_SOLO_LECTURA}
      />
    </main>
  )
}
