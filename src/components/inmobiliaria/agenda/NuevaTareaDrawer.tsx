'use client';

/**
 * NuevaTareaDrawer — una tarea propia en la agenda: título, día, hora
 * opcional, a qué inmueble se ata y quién la lleva.
 *
 * Nico (2026-09-03): «le doy nueva tarea acá en agenda y no funciona nada».
 * Antes el botón avisaba que llegaría «con el motor (M1)». Ahora existe
 * `POST /inmobiliaria/agenda/tareas` y esto lo usa. Fecha y hora con los
 * pickers de cadence, no con inputs nativos.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DatePicker, TimePicker } from '@leasefy/cadence';
import { Button, Textarea } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAgentes, useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import { ApiError } from '@/lib/api/client';
import { agendaApi } from '@/lib/api/agenda.service';
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble';
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales';

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  onCreada: () => void;
}

export interface TareaForm {
  titulo: string;
  fecha: string;
  hora: string;
  consignacionId: string;
  responsableUserId: string;
  nota: string;
}

export const TAREA_VACIA: TareaForm = {
  titulo: '',
  fecha: '',
  hora: '',
  consignacionId: '',
  responsableUserId: '',
  nota: '',
};

/** Qué falta. Vacío = se puede guardar. */
export function validarTarea(f: TareaForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.titulo.trim().length < 2) e.titulo = 'Escribí qué hay que hacer.';
  if (!f.fecha) e.fecha = 'Elegí el día.';
  return e;
}

export function NuevaTareaDrawer({ abierto, onOpenChange, onCreada }: Props) {
  const [form, setForm] = useState<TareaForm>(TAREA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const { consignaciones } = useConsignaciones();
  const { agentes } = useAgentes({ skip: !abierto });

  useEffect(() => {
    if (abierto) setForm(TAREA_VACIA);
  }, [abierto]);

  const inmuebles = useMemo<ComboboxOption[]>(
    () =>
      [...consignaciones]
        .sort((a, b) => a.propertyTitle.localeCompare(b.propertyTitle))
        .map((c) => ({ value: c.id, label: etiquetaDeInmueble(c) })),
    [consignaciones],
  );
  const responsables = useMemo<ComboboxOption[]>(
    () =>
      agentes
        .filter((a) => a.userId)
        .map((a) => ({ value: a.userId as string, label: a.name })),
    [agentes],
  );

  const errores = validarTarea(form);
  const valido = Object.keys(errores).length === 0 && !guardando;
  const set = <K extends keyof TareaForm>(k: K, v: TareaForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async () => {
    if (!valido) return;
    setGuardando(true);
    try {
      const inmueble = consignaciones.find((c) => c.id === form.consignacionId);
      await agendaApi.crearTarea({
        titulo: form.titulo.trim(),
        fecha: form.fecha,
        hora: form.hora || undefined,
        nota: form.nota.trim() || undefined,
        ...(inmueble
          ? { vinculoTipo: 'PROPIEDAD', vinculoId: inmueble.id, vinculoLabel: etiquetaDeInmueble(inmueble) }
          : {}),
        responsableUserId: form.responsableUserId || undefined,
      });
      toast.success('Tarea creada');
      onCreada();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      toast.error('No se pudo crear la tarea', {
        description: err instanceof ApiError && err.message.length < 160 ? err.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" data-lenis-prevent>
        <SheetHeader className="space-y-1 border-b border-border pb-4">
          <SheetTitle className="text-lg font-semibold text-fg">Nueva tarea</SheetTitle>
          <SheetDescription className="text-sm text-fg-muted">
            Algo que hay que hacer un día: queda en la agenda con su inmueble y su responsable.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4" data-testid="nueva-tarea">
          <Campo label="Qué hay que hacer" error={form.titulo && errores.titulo}>
            <Input
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder="Recoger llaves del 402"
              maxLength={200}
              data-testid="tarea-titulo"
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Día">
              <DatePicker
                value={fechaLocal(form.fecha)}
                onChange={(d) => set('fecha', aFechaIso(d))}
                minDate={hoyLocal()}
                placeholder="Elegí el día"
                className="w-full"
              />
            </Campo>
            <Campo label="Hora" hint="Opcional">
              <TimePicker value={form.hora || undefined} onChange={(h) => set('hora', h)} placeholder="Sin hora" step={30} className="w-full" />
            </Campo>
          </div>

          <Campo label="Inmueble" hint="Opcional">
            <Combobox
              value={form.consignacionId || undefined}
              onChange={(v) => set('consignacionId', v ?? '')}
              options={inmuebles}
              placeholder="Buscá por código, título o dirección"
              searchPlaceholder="Escribí #código, título o dirección"
              contentClassName="z-[400]"
            />
          </Campo>

          <Campo label="Responsable" hint="Opcional">
            <Combobox
              value={form.responsableUserId || undefined}
              onChange={(v) => set('responsableUserId', v ?? '')}
              options={responsables}
              placeholder={responsables.length ? 'Elegí a alguien del equipo' : 'Sin agentes con cuenta'}
              searchPlaceholder="Nombre"
              disabled={responsables.length === 0}
              contentClassName="z-[400]"
            />
          </Campo>

          <Campo label="Nota" hint="Opcional">
            <Textarea
              value={form.nota}
              onChange={(e) => set('nota', e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Detalles, a quién llamar, qué llevar…"
            />
          </Campo>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" hideArrow onClick={() => onOpenChange(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="button" size="sm" hideArrow onClick={() => void guardar()} disabled={!valido} data-testid="tarea-guardar">
              Crear tarea
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Campo({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | false;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-fg">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}
