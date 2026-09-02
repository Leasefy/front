'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  UserPlus,
  Megaphone,
  CalendarCheck,
  Eye,
  CheckCircle,
  Signature,
  Key,
  ArrowsClockwise,
  CaretDown,
  Clock,
  User,
  PencilSimple,
  Image,
  Package,
  Receipt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import { agendaApi } from '@/lib/api/agenda.service';
import type { EventoAgenda, EventoTipo } from '@/lib/api/agenda.types';
import { consignacionesApi, type EventoDelInmueble } from '@/lib/api/inmobiliaria.service';

/**
 * Cómo se dibuja cada tipo de evento de la agenda en esta línea de tiempo.
 * Es sólo presentación: el evento y su fecha vienen del back tal cual.
 */
const TIPO_DE_AGENDA: Record<EventoTipo, TimelineEventType> = {
  visita: 'visit_scheduled',
  firma_pendiente: 'contract_signed',
  vencimiento_contrato: 'lease_renewal',
  seguimiento: 'agent_assigned',
  inspeccion: 'handover_completed',
  tarea: 'property_published',
};

// Timeline event types
type TimelineEventType =
  | 'consignacion_created'
  | 'agent_assigned'
  | 'property_published'
  | 'visit_scheduled'
  | 'visit_completed'
  | 'candidate_approved'
  | 'contract_signed'
  | 'handover_completed'
  | 'lease_renewal'
  | 'status_changed'
  | 'data_edited'
  | 'owner_changed'
  | 'photos'
  | 'inventory'
  | 'receipt';

/**
 * Los eventos REALES del historial (back, `consignacion_eventos`) y cómo se
 * dibuja cada tipo. Un tipo nuevo del back que no esté acá se dibuja como
 * «datos editados»: nunca se pierde una línea por no tener ícono.
 */
const TIPO_DEL_HISTORIAL: Record<string, TimelineEventType> = {
  consignacion_creada: 'consignacion_created',
  estado_cambiado: 'status_changed',
  datos_editados: 'data_edited',
  propietario_cambiado: 'owner_changed',
  agente_asignado: 'agent_assigned',
  fotos_agregadas: 'photos',
  fotos_quitadas: 'photos',
  inventario_agregado: 'inventory',
  inventario_quitado: 'inventory',
  contrato_creado: 'contract_signed',
  contrato_terminado: 'lease_renewal',
  recibo_emitido: 'receipt',
  recibo_anulado: 'receipt',
  publicada: 'property_published',
  despublicada: 'property_published',
};

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description?: string;
  actor?: string;
}

// Event type styling
const EVENT_STYLES: Record<TimelineEventType, { bg: string; text: string; icon: React.ElementType }> = {
  consignacion_created: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    icon: FileText,
  },
  agent_assigned: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    icon: UserPlus,
  },
  property_published: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    icon: Megaphone,
  },
  visit_scheduled: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    icon: CalendarCheck,
  },
  visit_completed: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    icon: Eye,
  },
  candidate_approved: {
    bg: 'bg-success-soft',
    text: 'text-success',
    icon: CheckCircle,
  },
  contract_signed: {
    bg: 'bg-success-soft',
    text: 'text-success',
    icon: Signature,
  },
  handover_completed: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    icon: Key,
  },
  lease_renewal: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    icon: ArrowsClockwise,
  },
  status_changed: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    icon: ArrowsClockwise,
  },
  data_edited: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    icon: PencilSimple,
  },
  owner_changed: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    icon: User,
  },
  photos: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    icon: Image,
  },
  inventory: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    icon: Package,
  },
  receipt: {
    bg: 'bg-success-soft',
    text: 'text-success',
    icon: Receipt,
  },
};

interface ConsignacionTimelineProps {
  consignacion: Consignacion;
  agenteName?: string;
  maxVisibleItems?: number;
}

/**
 * ConsignacionTimeline - Timeline showing the history of a consignment
 * Generates mock events from consignacion data
 */
export function ConsignacionTimeline({
  consignacion,
  agenteName,
  maxVisibleItems = 5,
}: ConsignacionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t, formatDate: fmtDate, formatRelativeDate: fmtRelDate } = useI18n();

  // ── De dónde salen los eventos ───────────────────────────────────────────
  //
  // Antes se GENERABAN: «agente asignado» = contractDate + 1 día, «publicada»
  // = +3, «visita agendada» = +7, «visita completada» = +8, y si estaba
  // arrendada aparecía «Candidato aprobado» atribuido al SISTEMA DE SCORING
  // con el nombre real del inquilino, en una fecha sacada de leaseEndDate
  // menos un año. Diez eventos, ninguno ocurrido.
  //
  // Una pantalla que dice que una persona con nombre hizo algo un día
  // concreto está afirmando un hecho. Si el hecho lo produjo una suma de
  // días, es falso — y encima se ve idéntico a los que sí pasaron.
  //
  // Ahora hay dos fuentes, las dos reales:
  //   1. Hitos del propio registro, SIN aritmética: una fecha guardada es un
  //      hecho; esa fecha más tres días es una invención.
  //   2. Eventos de la agenda vinculados a esta propiedad (visitas, firmas,
  //      vencimientos). Son los que de verdad ocurrieron.
  const [eventosAgenda, setEventosAgenda] = useState<EventoAgenda[]>([]);
  const [cargandoAgenda, setCargandoAgenda] = useState(true);
  const [falloAgenda, setFalloAgenda] = useState(false);

  //   3. (2026-09-02) El historial REAL: `consignacion_eventos` en el back,
  //      escrito por cada servicio cuando pasa algo (estado, edición,
  //      propietario, agente, fotos, inventario, contrato, recibos). Es la
  //      fuente principal; los hitos derivados del registro (1) quedan sólo
  //      como respaldo si este endpoint no responde, para no mostrar un
  //      historial vacío por una caída.
  const [historial, setHistorial] = useState<EventoDelInmueble[] | null>(null);
  const [falloHistorial, setFalloHistorial] = useState(false);

  useEffect(() => {
    let vivo = true;
    setHistorial(null);
    setFalloHistorial(false);
    consignacionesApi
      .getHistorial(consignacion.id)
      .then((r) => {
        if (vivo) setHistorial(r);
      })
      .catch(() => {
        if (vivo) setFalloHistorial(true);
      });
    return () => {
      vivo = false;
    };
    // Se vuelve a leer cada vez que la consignación cambia en pantalla
    // (estado, propietario, agente, datos): el cambio que la persona acaba
    // de hacer tiene que aparecer en el historial sin recargar. Medido
    // 2026-09-02: cambiar el estado quedaba registrado en el back y la
    // tarjeta seguía en «1 eventos».
  }, [
    consignacion.id,
    consignacion.availability,
    consignacion.propietarioId,
    consignacion.agenteId,
    consignacion.updatedAt,
    consignacion.commissionPercent,
    consignacion.monthlyRent,
  ]);

  useEffect(() => {
    let vivo = true;
    setCargandoAgenda(true);
    setFalloAgenda(false);
    agendaApi
      .getAgenda()
      .then((r) => {
        if (!vivo) return;
        setEventosAgenda(
          r.eventos.filter(
            (e) => e.vinculoTipo === 'propiedad' && e.vinculoId === consignacion.propertyId,
          ),
        );
      })
      .catch(() => {
        if (vivo) setFalloAgenda(true);
      })
      .finally(() => {
        if (vivo) setCargandoAgenda(false);
      });
    return () => {
      vivo = false;
    };
  }, [consignacion.propertyId]);

  const events = useMemo(() => {
    const reales: TimelineEvent[] = [];

    // Lo que de verdad le pasó al inmueble, escrito cuando pasó.
    for (const e of historial ?? []) {
      reales.push({
        id: `hist-${e.id}`,
        type: TIPO_DEL_HISTORIAL[e.tipo] ?? 'data_edited',
        date: e.fecha,
        title: e.titulo,
        description: e.detalle ?? '',
        actor: e.esSistema ? t('inmobiliaria.consignaciones.timeline.actors.system') : e.actor,
      });
    }
    // Mientras el historial real no llegó, no se dibuja el respaldo: si se
    // pintara y después se quitara, AnimatePresence lo deja un rato en
    // pantalla y el historial se vería duplicado.
    const hayHistorial = (historial?.length ?? 0) > 0 || (historial === null && !falloHistorial);

    // Hito 1 — la consignación existe desde que se registró. Fecha guardada.
    // Sólo cuando el historial real no trae nada (caída o consignación
    // anterior al registro): si trae, ya viene «Consignación creada».
    if (consignacion.contractDate && !hayHistorial) {
      reales.push({
        id: 'hito-consignacion',
        type: 'consignacion_created',
        date: consignacion.contractDate,
        title: t('inmobiliaria.consignaciones.timeline.events.consignacionCreated'),
        description: t('inmobiliaria.consignaciones.timeline.events.consignacionCreatedDesc'),
        actor: t('inmobiliaria.consignaciones.timeline.actors.system'),
      });
    }

    // Hito 2 — fin del contrato de consignación, si está guardado.
    if (consignacion.contractEndDate) {
      reales.push({
        id: 'hito-fin-consignacion',
        type: 'lease_renewal',
        date: consignacion.contractEndDate,
        title: t('inmobiliaria.consignaciones.timeline.events.consignacionEnds'),
        description: '',
        actor: t('inmobiliaria.consignaciones.timeline.actors.system'),
      });
    }

    // Hito 3 — vencimiento del arriendo vigente. El nombre del inquilino va
    // como CONTEXTO del hecho, no como si él hubiera hecho algo ese día.
    if (consignacion.leaseEndDate) {
      reales.push({
        id: 'hito-fin-arriendo',
        type: 'lease_renewal',
        date: consignacion.leaseEndDate,
        title: t('inmobiliaria.consignaciones.timeline.events.leaseEnds'),
        description: consignacion.currentTenantName
          ? t('inmobiliaria.consignaciones.timeline.events.leaseEndsWithTenant', {
              name: consignacion.currentTenantName,
            })
          : '',
        actor: t('inmobiliaria.consignaciones.timeline.actors.system'),
      });
    }

    // Lo que de verdad pasó, traído de la agenda.
    const deLaAgenda: TimelineEvent[] = eventosAgenda.map((e) => ({
      id: `agenda-${e.id}`,
      type: TIPO_DE_AGENDA[e.tipo] ?? 'visit_scheduled',
      date: e.fecha,
      title: e.titulo,
      description: e.descripcion ?? '',
      actor: e.responsableNombre ?? agenteName ?? t('inmobiliaria.consignaciones.timeline.actors.agent'),
    }));

    return [...reales, ...deLaAgenda].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [consignacion, agenteName, eventosAgenda, historial, falloHistorial, t]);

  const visibleEvents = isExpanded ? events : events.slice(0, maxVisibleItems);
  const hasMoreEvents = events.length > maxVisibleItems;

  return (
    <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
            <Clock className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
          </div>
          <h3 className="font-semibold text-fg dark:text-white">{t('inmobiliaria.consignaciones.timeline.title')}</h3>
          <span className="ml-auto text-sm text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.timeline.eventsCount', { count: events.length })}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-5">
        {/* Cargando, falló y vacío son tres cosas distintas. Antes ninguna
            existía: siempre había eventos porque siempre se inventaban. */}
        {(cargandoAgenda || (historial === null && !falloHistorial)) && events.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-muted dark:text-fg-subtle">
            {t('common.loading')}
          </p>
        ) : events.length === 0 ? (
          <div className="py-8 text-center" data-testid="timeline-sin-actividad">
            <p className="text-sm font-medium text-fg dark:text-white">
              {t('inmobiliaria.consignaciones.timeline.noEvents')}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.consignaciones.timeline.noEventsDesc')}
            </p>
          </div>
        ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-muted dark:bg-ink" />

          {/* Events */}
          <div className="space-y-4">
            <AnimatePresence>
              {visibleEvents.map((event, index) => {
                const style = EVENT_STYLES[event.type];
                const Icon = style.icon;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-10"
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                        style.bg
                      )}
                    >
                      <Icon className={cn('w-4 h-4', style.text)} />
                    </div>

                    {/* Content */}
                    <div className="p-3 rounded-xl bg-surface-muted dark:bg-bg">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-fg dark:text-white text-sm">
                          {event.title}
                        </h4>
                        <span className="text-xs text-fg-muted dark:text-fg-subtle shrink-0">
                          {fmtRelDate(event.date)}
                        </span>
                      </div>

                      {event.description && (
                        <p className="text-sm text-fg-muted dark:text-fg-subtle mb-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-fg-muted dark:text-fg-subtle">
                        <span>{fmtDate(event.date)}</span>
                        {event.actor && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {event.actor}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        )}

        {/* Si la agenda no respondió, decirlo — pero sin borrar los hitos del
            registro, que no dependen de ella. */}
        {(falloAgenda || falloHistorial) && (
          <p className="mt-3 text-xs text-fg-muted dark:text-fg-subtle" data-testid="timeline-fallo-agenda">
            {t('inmobiliaria.consignaciones.timeline.loadFailed')}
          </p>
        )}

        {/* Show More / Less */}
        {hasMoreEvents && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="w-full mt-4 gap-2 text-primary"
          >
            {isExpanded ? t('inmobiliaria.consignaciones.timeline.showLess') : t('inmobiliaria.consignaciones.timeline.showMoreEvents', { count: events.length - maxVisibleItems })}
            <CaretDown
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>
        )}
      </div>
    </div>
  );
}

export default ConsignacionTimeline;
