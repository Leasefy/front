'use client';

import { useEffect, useMemo, useState } from 'react';
import { DatePicker, SegmentedControl, TimePicker } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui';
import { Combobox } from '@/components/ui/combobox';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { embudoApi } from '@/lib/api/embudo.service';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales';
import { useEquipo, useMiUserId } from '@/lib/agenda/use-equipo';
import type { PipelineItem, Consignacion } from '@/lib/types/inmobiliaria';

/**
 * 🔴 PL-16 (QA del 04-10-2026): pasar un interesado a «Visita programada»
 * pide el día, la hora y el asesor, y crea la visita en la Agenda. Antes la
 * tarjeta cambiaba de columna y la visita no existía en ninguna parte.
 */
export function AgendarVisitaDialog({
  item,
  consignaciones,
  onCerrar,
  onAgendada,
}: {
  item: PipelineItem | null;
  consignaciones: Consignacion[];
  onCerrar: () => void;
  onAgendada: () => void;
}) {
  const { asesores } = useEquipo(!item);
  const miUserId = useMiUserId();
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('10:00');
  const [modalidad, setModalidad] = useState<'IN_PERSON' | 'VIRTUAL'>('IN_PERSON');
  const [asesor, setAsesor] = useState('');
  const [inmueble, setInmueble] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir para OTRO interesado se limpia el formulario. Sólo con su id:
  // las listas (equipo, inmuebles) cambian de referencia en cada render y
  // borraban el día recién escogido.
  const itemId = item?.id ?? null;
  useEffect(() => {
    if (!itemId) return;
    setDia('');
    setHora('10:00');
    setModalidad('IN_PERSON');
    setError(null);
    setInmueble('');
    setAsesor('');
  }, [itemId]);
  // Lo que se puede deducir, sin pisar lo que la persona ya escogió.
  useEffect(() => {
    if (!item) return;
    setInmueble(
      (actual) =>
        actual ||
        item.propertyId ||
        consignaciones.find((c) => c.id === item.consignacionId)?.propertyId ||
        '',
    );
    setAsesor(
      (actual) =>
        actual ||
        asesores.find((a) => a.userId === item.agenteId)?.userId ||
        asesores.find((a) => a.userId === miUserId)?.userId ||
        '',
    );
  }, [item, asesores, miUserId, consignaciones]);

  // Sólo inmuebles que se pueden mostrar (con inmueble y sin arrendar).
  const inmuebles = useMemo(
    () =>
      consignaciones
        .filter((c) => c.propertyId && !c.arrendado && c.propertyStatus !== 'RENTED')
        .map((c) => ({
          value: c.propertyId as string,
          label: `${c.propertyCode != null ? `#${c.propertyCode} · ` : ''}${c.propertyTitle} · ${c.propertyAddress}`,
        })),
    [consignaciones],
  );

  const puede = Boolean(item && dia && hora && asesor && inmueble) && !enviando;

  const agendar = async () => {
    if (!item || !puede) return;
    setEnviando(true);
    setError(null);
    try {
      await embudoApi.agendarVisita(item.id, {
        propertyId: inmueble || undefined,
        fecha: dia,
        horaInicio: hora,
        modalidad,
        asesorUserId: asesor,
      });
      toast.success('Visita agendada', {
        description: `${item.candidateName} pasó a «Visita programada». La visita quedó en la Agenda.`,
      });
      onAgendada();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(mensajeParaLaPersona(err, { porDefecto: 'No se pudo agendar la visita.', accion: 'agendar la visita' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    // El mismo contenedor que «Pedir cita»: dentro de un Dialog modal el
    // calendario (que va en un portal) no recibía el clic del día.
    <ResponsiveDialog open={item !== null} onOpenChange={(o) => !o && onCerrar()}>
      <ResponsiveDialogContent className="sm:max-w-lg" data-testid="agendar-visita-del-lead">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Agendar la visita de {item?.candidateName}</ResponsiveDialogTitle>
          <p className="text-sm text-fg-muted">
            Pasa a «Visita programada» y la visita queda en la Agenda con su asesor.
          </p>
        </ResponsiveDialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">Inmueble</label>
            <Combobox
              data-testid="agendar-visita-inmueble"
              value={inmueble || undefined}
              onChange={(v) => setInmueble(v ?? '')}
              options={inmuebles}
              placeholder="Elige el inmueble"
              searchPlaceholder="Título o dirección"
              contentClassName="z-[400]"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">Día</label>
              <DatePicker
                id="agendar-visita-dia"
                value={fechaLocal(dia)}
                onChange={(d) => setDia(d ? aFechaIso(d) : '')}
                minDate={hoyLocal()}
                placeholder="Elige el día"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">Hora</label>
              <TimePicker id="agendar-visita-hora" value={hora} onChange={(h) => setHora(h ?? '')} step={30} />
            </div>
          </div>
          <SegmentedControl<'IN_PERSON' | 'VIRTUAL'>
            fullWidth
            value={modalidad}
            onChange={setModalidad}
            aria-label="Modalidad"
            options={[
              { value: 'IN_PERSON', label: 'Presencial', ariaLabel: 'Presencial' },
              { value: 'VIRTUAL', label: 'Virtual', ariaLabel: 'Virtual' },
            ]}
          />
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">Asesor que la atiende</label>
            <Combobox
              data-testid="agendar-visita-asesor"
              value={asesor || undefined}
              onChange={(v) => setAsesor(v ?? '')}
              options={asesores.map((a) => ({ value: a.userId, label: a.nombre }))}
              placeholder="Elige quién la atiende"
              contentClassName="z-[400]"
            />
          </div>
          <ErrorDelCampo id="agendar-visita-error" mensaje={error} />
        </div>
        <ResponsiveDialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button hideArrow disabled={!puede} isLoading={enviando} onClick={() => void agendar()} data-testid="agendar-visita-guardar">
            Agendar la visita
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
