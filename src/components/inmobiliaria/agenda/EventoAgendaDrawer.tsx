'use client';

/**
 * EventoAgendaDrawer — el detalle de una fila de la agenda, en un cajón.
 *
 * Nico (2026-09-03): «cuando se cree una agenda debería poder darle clic para
 * ver todo el detalle en un drawer». Muestra lo que la fila no alcanza a
 * decir (nota, contacto, vínculo con enlace) y trae las acciones del evento:
 * confirmar/rechazar/cancelar una visita, completar/cancelar una tarea.
 */

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { agendaApi } from '@/lib/api/agenda.service';
import { tareaIdOf, type EventoAgenda, type EventoEstado } from '@/lib/api/agenda.types';
import { fechaLocal } from '@/lib/fechas-locales';

const ESTADO_BADGE: Record<EventoEstado, string> = {
  pendiente: 'bg-primary/10 text-primary',
  completado: 'bg-success-soft text-success',
  vencido: 'bg-danger-soft text-danger',
  cancelado: 'bg-surface-muted text-fg-muted',
};

/** A dónde lleva el vínculo, si tiene ficha propia. */
export function hrefDelVinculo(e: EventoAgenda): string | null {
  if (!e.vinculoId) return null;
  if (e.tipo === 'firma_pendiente') return `/panel/inmobiliaria/contratos/${e.vinculoId}`;
  // Las tareas se atan a la consignación (id del mandato); las visitas al
  // inmueble (propertyId), que no abre ficha por ese id.
  if (e.tipo === 'tarea' && e.vinculoTipo === 'propiedad') return `/panel/inmobiliaria/inmuebles/${e.vinculoId}`;
  if (e.tipo === 'tarea' && e.vinculoTipo === 'contrato') return `/panel/inmobiliaria/contratos/${e.vinculoId}`;
  return null;
}

interface Props {
  evento: EventoAgenda | null;
  onOpenChange: (abierto: boolean) => void;
  /** Después de cualquier acción: la agenda se relee. */
  onCambio: () => void;
  /** Las acciones de visita viven en la página (confirmar/rechazar/cancelar). */
  onAccionVisita: (visitId: string, accion: () => Promise<void>) => Promise<void>;
}

export function EventoAgendaDrawer({ evento, onOpenChange, onCambio, onAccionVisita }: Props) {
  const { t, formatDate } = useI18n();
  const k = (s: string) => `inmobiliaria.agenda.${s}`;
  const [actuando, setActuando] = useState(false);

  const accionTarea = async (estado: 'COMPLETADA' | 'CANCELADA' | 'PENDIENTE') => {
    if (!evento) return;
    setActuando(true);
    try {
      await agendaApi.actualizarTarea(tareaIdOf(evento.id), { estado });
      toast.success(
        estado === 'COMPLETADA' ? 'Tarea completada' : estado === 'CANCELADA' ? 'Tarea cancelada' : 'Tarea reabierta',
      );
      onCambio();
      onOpenChange(false);
    } catch {
      toast.error('No se pudo actualizar la tarea');
    } finally {
      setActuando(false);
    }
  };

  const visita = async (accion: () => Promise<void>) => {
    if (!evento) return;
    setActuando(true);
    try {
      await onAccionVisita(evento.id.replace(/^visit-/, ''), accion);
      onOpenChange(false);
    } finally {
      setActuando(false);
    }
  };

  const dia = evento ? fechaLocal(evento.fecha) : null;
  const href = evento ? hrefDelVinculo(evento) : null;

  return (
    <Sheet open={evento !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-lenis-prevent>
        {evento && (
          <>
            <SheetHeader className="space-y-1 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                    ESTADO_BADGE[evento.estado],
                  )}
                >
                  {t(k(`estado_${evento.estado}`))}
                </span>
                <span className="text-caption text-fg-muted">{t(k(`rowTipo_${evento.tipo}`))}</span>
              </div>
              <SheetTitle className="text-lg font-semibold text-fg">{evento.titulo}</SheetTitle>
              <SheetDescription className="text-sm text-fg-muted">
                {dia ? formatDate(dia, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : evento.fecha}
                {evento.hora ? ` · ${evento.hora}` : ''}
              </SheetDescription>
            </SheetHeader>

            <dl className="mt-4 space-y-3 text-sm" data-testid="evento-detalle">
              <Fila etiqueta={t(k('colOrigen'))}>{t(k(`origen_${evento.origen}`))}</Fila>
              <Fila etiqueta={t(k('colVinculo'))}>
                {evento.vinculoLabel ? (
                  href ? (
                    <Link href={href} className="inline-flex items-center gap-1 text-primary hover:underline">
                      {evento.vinculoLabel}
                      <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    evento.vinculoLabel
                  )
                ) : (
                  '—'
                )}
              </Fila>
              <Fila etiqueta={t(k('colResponsable'))}>{evento.responsableNombre ?? '—'}</Fila>
              {evento.descripcion && (
                <Fila etiqueta={evento.tipo === 'tarea' ? 'Nota' : 'Detalle'}>
                  <span className="whitespace-pre-wrap">{evento.descripcion}</span>
                </Fila>
              )}
            </dl>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4" data-testid="evento-acciones">
              {evento.tipo === 'tarea' && evento.estadoRaw === 'PENDIENTE' && (
                <>
                  <Button variant="outline" size="sm" hideArrow disabled={actuando} onClick={() => void accionTarea('CANCELADA')}>
                    Cancelar tarea
                  </Button>
                  <Button size="sm" hideArrow disabled={actuando} onClick={() => void accionTarea('COMPLETADA')} data-testid="tarea-completar">
                    Marcar como hecha
                  </Button>
                </>
              )}
              {evento.tipo === 'tarea' && evento.estadoRaw !== 'PENDIENTE' && (
                <Button variant="outline" size="sm" hideArrow disabled={actuando} onClick={() => void accionTarea('PENDIENTE')}>
                  Reabrir tarea
                </Button>
              )}
              {evento.tipo === 'visita' && evento.estadoRaw === 'PENDING' && (
                <>
                  <Button variant="outline" size="sm" hideArrow disabled={actuando} onClick={() => void visita(() => agendaApi.rechazarCita(evento.id.replace(/^visit-/, '')))}>
                    {t(k('citaRechazar'))}
                  </Button>
                  <Button size="sm" hideArrow disabled={actuando} onClick={() => void visita(() => agendaApi.aceptarCita(evento.id.replace(/^visit-/, '')))}>
                    {t(k('citaConfirmar'))}
                  </Button>
                </>
              )}
              {evento.tipo === 'visita' && evento.estadoRaw === 'ACCEPTED' && (
                <Button variant="outline" size="sm" hideArrow disabled={actuando} onClick={() => void visita(() => agendaApi.cancelarCita(evento.id.replace(/^visit-/, '')))}>
                  {t(k('citaCancelar'))}
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-fg-muted">{etiqueta}</dt>
      <dd className="min-w-0 text-fg">{children}</dd>
    </div>
  );
}
