'use client';

import { useState } from 'react';
import { DatePicker, TimePicker } from '@leasefy/cadence';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { agendaApi } from '@/lib/api/agenda.service';
import type { EventoAgenda, MiembroDelEquipo } from '@/lib/api/agenda.types';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales';

/**
 * AG-06 (QA del 04-10-2026): lo que se hace con una visita además de
 * confirmarla o cancelarla — el asesor que la atiende («ninguna se confirma
 * sin asesor»), «Marcar como hecha» (su interesado pasa a «Visita hecha») y
 * «Reprogramar».
 */
export function AsesorDeLaVisita({
  evento,
  asesores,
  elegido,
  onElegir,
  puedeEditar,
  onCambio,
}: {
  evento: EventoAgenda;
  asesores: MiembroDelEquipo[];
  elegido: string | null;
  onElegir: (userId: string | null) => void;
  puedeEditar: boolean;
  onCambio: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visitId = evento.id.replace(/^visit-/, '');
  const viva = evento.estadoRaw === 'PENDING' || evento.estadoRaw === 'ACCEPTED';
  const opciones = asesores.map((a) => ({ value: a.userId, label: a.nombre }));

  // Una visita ya confirmada cambia de asesor en el acto; una pendiente lo
  // guarda para cuando se confirme (el botón «Confirmar» lo manda).
  const cambiar = async (userId: string | null) => {
    onElegir(userId);
    setError(null);
    if (!userId || evento.estadoRaw !== 'ACCEPTED') return;
    setGuardando(true);
    try {
      await agendaApi.asignarAsesor(visitId, userId);
      toast.success('Asesor asignado');
      onCambio();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(mensajeParaLaPersona(err, { porDefecto: 'No se pudo asignar el asesor.', accion: 'asignar el asesor' }));
    } finally {
      setGuardando(false);
    }
  };

  if (!puedeEditar || !viva) {
    return <span>{evento.asesorNombre ?? 'Sin asesor'}</span>;
  }
  return (
    <div className="space-y-1" data-testid="visita-asesor">
      <Combobox
        data-testid="visita-asesor-select"
        value={elegido ?? evento.asesorId ?? undefined}
        onChange={(v) => void cambiar(v ?? null)}
        options={opciones}
        placeholder={opciones.length ? 'Elige quién la atiende' : 'No hay asesores activos'}
        disabled={guardando || opciones.length === 0}
      />
      {!evento.asesorId && !elegido && (
        <p className="text-caption text-warning">Ninguna visita se confirma sin asesor.</p>
      )}
      <ErrorDelCampo id="visita-asesor-error" mensaje={error} />
    </div>
  );
}

export function MasAccionesDeLaVisita({
  evento,
  onCambio,
  onCerrar,
}: {
  evento: EventoAgenda;
  onCambio: () => void;
  onCerrar: () => void;
}) {
  const visitId = evento.id.replace(/^visit-/, '');
  const [reprogramando, setReprogramando] = useState(false);
  const [dia, setDia] = useState<string>('');
  const [hora, setHora] = useState<string>(evento.hora ?? '10:00');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La visita ya empezó (o pasó): se puede marcar hecha.
  const empezo = (() => {
    const d = fechaLocal(evento.fecha);
    if (!d) return false;
    const [h, m] = (evento.hora ?? '00:00').split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime() <= Date.now();
  })();

  const correr = async (accion: () => Promise<void>, ok: string, que: string) => {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      toast.success(ok);
      onCambio();
      onCerrar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(mensajeParaLaPersona(err, { porDefecto: `No se pudo ${que}. Prueba de nuevo en un momento.`, accion: que }));
    } finally {
      setEnviando(false);
    }
  };

  if (evento.estadoRaw !== 'ACCEPTED' && evento.estadoRaw !== 'PENDING') return null;

  return (
    <div className="space-y-3" data-testid="visita-mas-acciones">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          hideArrow
          disabled={enviando}
          onClick={() => setReprogramando((r) => !r)}
          data-testid="cita-reprogramar"
        >
          Reprogramar
        </Button>
        {evento.estadoRaw === 'ACCEPTED' && (
          <Button
            size="sm"
            hideArrow
            disabled={enviando || !empezo}
            title={empezo ? undefined : 'Se marca cuando la visita ya empezó'}
            onClick={() =>
              void correr(() => agendaApi.marcarHecha(visitId), 'Visita marcada como hecha', 'marcar la visita como hecha')
            }
            data-testid="cita-hecha"
          >
            Marcar como hecha
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {reprogramando && (
          <motion.div
            key="reprogramar"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_9rem_auto]"
            data-testid="cita-reprogramar-form"
          >
            <DatePicker
              id="reprogramar-dia"
              value={fechaLocal(dia)}
              onChange={(d) => setDia(d ? aFechaIso(d) : '')}
              minDate={hoyLocal()}
              placeholder="Nuevo día"
            />
            <TimePicker id="reprogramar-hora" value={hora} onChange={(h) => setHora(h ?? '')} step={30} />
            <Button
              size="sm"
              hideArrow
              disabled={enviando || !dia || !hora}
              onClick={() =>
                void correr(
                  () => agendaApi.reprogramar(visitId, { fecha: dia, horaInicio: hora }),
                  'Visita reprogramada',
                  'reprogramar la visita',
                )
              }
              data-testid="cita-reprogramar-guardar"
            >
              Mover la visita
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorDelCampo id="visita-accion-error" mensaje={error} />
    </div>
  );
}
