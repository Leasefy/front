'use client';

/**
 * VisitasDelInmueble — prender las visitas de un inmueble y decir cuándo.
 *
 * ── Por qué existe (Nico, 2026-09-04) ─────────────────────────────────────
 * «Para poder agendar una visita me imagino que el inmueble debe de prender esa
 * opción en algún lado y creo que no la tiene.» Tenía razón: el back estaba
 * completo desde hace rato —ventanas por inmueble y por agente, generador de
 * cupos que descuenta los ya reservados, y los endpoints para leerlas y
 * escribirlas— pero no había ninguna pantalla que las escribiera. Por eso el
 * marketplace decía «Sin disponibilidad en los próximos días» en todos los
 * inmuebles: literalmente no había horarios cargados.
 *
 * ── La decisión de diseño que importa ─────────────────────────────────────
 * NO se agrega una columna «visitas activadas». El interruptor ES tener
 * horarios: prenderlo carga una semana por defecto, apagarlo la borra. Así el
 * estado no puede contradecir a la realidad — con una bandera aparte se puede
 * quedar en «activadas» sin un solo cupo, que es exactamente lo que el
 * marketplace ya mostraba y nadie podía explicar.
 *
 * Los horarios del AGENTE mandan sobre los del inmueble cuando existen (así lo
 * resuelve `SlotsService`), y eso se dice acá en vez de dejar a alguien
 * preguntándose por qué guardó una cosa y el portal muestra otra.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarCheck,
  Check,
  Info,
  MapPin,
  VideoCamera,
  Warning,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AvailabilityScheduleEditor } from '@/components/panel/AvailabilityScheduleEditor';
import { agendaApi, type TipoDeVisita } from '@/lib/api/agenda.service';
import { scheduleToWindows, windowsToSchedule } from '@/lib/utils/availability-schedule';
import {
  type AvailabilitySchedule,
  DEFAULT_AVAILABILITY_SCHEDULE,
} from '@/lib/types/property';

export interface VisitasDelInmuebleProps {
  propertyId: string;
}

/** Cuántas franjas quedaron cargadas: lo que decide si hay visitas o no. */
export function franjasDe(schedule: AvailabilitySchedule | null): number {
  if (!schedule) return 0;
  return Object.values(schedule).reduce(
    (total, dia) => total + (dia?.enabled ? (dia.ranges?.length ?? 0) : 0),
    0,
  );
}

/** Un resumen corto de la semana, para no obligar a leer la grilla entera. */
export function resumenDeLaSemana(schedule: AvailabilitySchedule | null): string {
  if (!schedule) return '';
  const DIAS: Array<[keyof AvailabilitySchedule, string]> = [
    ['monday', 'Lun'],
    ['tuesday', 'Mar'],
    ['wednesday', 'Mié'],
    ['thursday', 'Jue'],
    ['friday', 'Vie'],
    ['saturday', 'Sáb'],
    ['sunday', 'Dom'],
  ];
  const prendidos = DIAS.filter(([k]) => schedule[k]?.enabled && schedule[k].ranges.length > 0);
  if (prendidos.length === 0) return '';
  return prendidos.map(([, etiqueta]) => etiqueta).join(' · ');
}

/** Una modalidad, marcable. Azul primary cuando está activa, como todo lo
 *  seleccionado en el producto. */
function ModalidadCard({
  icono,
  titulo,
  detalle,
  activa,
  deshabilitada,
  onToggle,
  testId,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  activa: boolean;
  deshabilitada: boolean;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={activa}
      disabled={deshabilitada}
      onClick={onToggle}
      data-testid={testId}
      className={cn(
        'relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:opacity-60',
        activa
          ? 'border-primary bg-primary-soft'
          : 'border-border bg-surface hover:border-border-strong',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          activa ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-subtle',
        )}
      >
        {icono}
      </span>
      <span className="min-w-0 flex-1 pr-5">
        <span className="block text-sm font-medium text-fg">{titulo}</span>
        <span className="mt-0.5 block text-caption leading-snug text-fg-muted">{detalle}</span>
      </span>
      {activa && (
        <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-fg">
          <Check className="h-2.5 w-2.5" weight="bold" aria-hidden />
        </span>
      )}
    </button>
  );
}

type Estado = 'cargando' | 'listo' | 'error';

export function VisitasDelInmueble({ propertyId }: VisitasDelInmuebleProps) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [schedule, setSchedule] = useState<AvailabilitySchedule | null>(null);
  const [slotDuration, setSlotDuration] = useState(30);
  const [modalidades, setModalidades] = useState<TipoDeVisita[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setEstado('cargando');
    agendaApi
      .getDisponibilidad(propertyId)
      .then(({ windows, visitTypes }) => {
        setSlotDuration(windows[0]?.slotDuration ?? 30);
        setSchedule(windows.length > 0 ? windowsToSchedule(windows) : null);
        setModalidades(visitTypes ?? []);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, [propertyId]);

  useEffect(cargar, [cargar]);

  const guardar = useCallback(
    async (nuevo: AvailabilitySchedule | null, tipos?: TipoDeVisita[]) => {
      setGuardando(true);
      try {
        // `null` = apagar: se manda la lista vacía, que borra las ventanas.
        const windows = nuevo ? scheduleToWindows(nuevo, slotDuration) : [];
        const res = await agendaApi.setDisponibilidad(propertyId, windows, tipos);
        setSchedule(nuevo);
        setModalidades(res.visitTypes ?? []);
        toast.success(
          nuevo ? 'Horarios de visita guardados' : 'Visitas apagadas para este inmueble',
        );
      } catch {
        toast.error('No pudimos guardar los horarios', {
          description: 'Intenta de nuevo en unos segundos.',
        });
      } finally {
        setGuardando(false);
      }
    },
    [propertyId, slotDuration],
  );

  const prendido = franjasDe(schedule) > 0;

  /** Marcar o desmarcar una modalidad. Quedarse sin ninguna es válido. */
  const alternarModalidad = (tipo: TipoDeVisita) => {
    const siguiente = modalidades.includes(tipo)
      ? modalidades.filter((t) => t !== tipo)
      : [...modalidades, tipo];
    void guardar(schedule, siguiente);
  };

  return (
    <section
      className="rounded-lg border border-border bg-surface"
      data-testid="visitas-del-inmueble"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft">
            <CalendarCheck className="h-[18px] w-[18px] text-primary" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fg">Visitas</h3>
            <p className="mt-0.5 text-body-sm text-fg-muted">
              {prendido
                ? `Se pueden agendar · ${resumenDeLaSemana(schedule)}`
                : 'Nadie puede agendar una visita a este inmueble'}
            </p>
          </div>
        </div>

        {estado === 'listo' && (
          <Switch
            checked={prendido}
            disabled={guardando}
            aria-label="Permitir visitas a este inmueble"
            data-testid="visitas-interruptor"
            onCheckedChange={(activar) => {
              // Prender sin modalidad dejaría cupos que nadie puede reservar:
              // si no había ninguna, entra presencial, que es el caso normal.
              void guardar(
                activar ? DEFAULT_AVAILABILITY_SCHEDULE : null,
                activar && modalidades.length === 0 ? ['IN_PERSON'] : undefined,
              );
            }}
          />
        )}
      </header>

      <div className="px-5 py-4">
        {estado === 'cargando' && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {estado === 'error' && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-danger-soft p-3">
            <Warning className="mt-0.5 h-5 w-5 shrink-0 text-danger" weight="fill" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-danger">No pudimos leer los horarios de visita.</p>
              <Button variant="outline" size="sm" hideArrow onClick={cargar} className="mt-2">
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {estado === 'listo' && !prendido && (
          <p className="text-body-sm text-fg-muted">
            Préndelas y elige los días y las horas en que reciben visitas. Los interesados
            verán esos cupos en el aviso y podrán reservar uno; el cupo reservado desaparece
            y la visita entra a tu agenda.
          </p>
        )}

        {estado === 'listo' && prendido && schedule && (
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-fg">Cómo se puede visitar</h4>
              <p className="mt-0.5 text-body-sm text-fg-muted">
                Lo que elijas es lo que el interesado ve en el aviso.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <ModalidadCard
                  icono={<MapPin className="h-[18px] w-[18px]" aria-hidden />}
                  titulo="Presencial"
                  detalle="Alguien abre el inmueble a la hora reservada."
                  activa={modalidades.includes('IN_PERSON')}
                  deshabilitada={guardando}
                  onToggle={() => alternarModalidad('IN_PERSON')}
                  testId="modalidad-presencial"
                />
                <ModalidadCard
                  icono={<VideoCamera className="h-[18px] w-[18px]" aria-hidden />}
                  titulo="Virtual"
                  detalle="Recorrido por videollamada, sin desplazarse."
                  activa={modalidades.includes('VIRTUAL')}
                  deshabilitada={guardando}
                  onToggle={() => alternarModalidad('VIRTUAL')}
                  testId="modalidad-virtual"
                />
              </div>
              {modalidades.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-caption text-warning">
                  <Warning className="h-3.5 w-3.5 shrink-0" weight="fill" aria-hidden />
                  Sin ninguna marcada nadie puede reservar, aunque haya horarios.
                </p>
              )}
            </div>

            <AvailabilityScheduleEditor
              schedule={schedule}
              onSave={(nuevo) => void guardar(nuevo)}
              isLoading={guardando}
            />
            <div className="flex items-start gap-2.5 rounded-lg bg-surface-muted/60 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              <p className="text-caption text-fg-muted">
                Si el agente a cargo tiene su propio horario de visitas, ese manda sobre este.
                Los cupos ya reservados no se vuelven a ofrecer.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
