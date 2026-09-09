'use client';

/**
 * NuevaTareaDrawer — una tarea propia en la agenda: qué hay que hacer, día,
 * hora opcional, a qué inmueble se ata y quién la lleva.
 *
 * Nico (2026-09-03): «le doy nueva tarea acá en agenda y no funciona nada».
 * Nico (2026-09-08): «que sea un textarea porque la tarea puede ser larga; que
 * día y hora usen los componentes de cadence y se sientan clicables». Va con
 * el cajón de la casa: cabecera fija, cuerpo con scroll, pie fijo.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { DatePicker, TimePicker } from '@leasefy/cadence';
import { Button, Textarea } from '@/components/ui';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
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

/** Tope del back (`CreateTareaDto.titulo`): lo largo va en la nota. */
export const TITULO_MAX = 200;

/** Qué falta. Vacío = se puede guardar. */
export function validarTarea(f: TareaForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.titulo.trim().length < 2) e.titulo = 'Escribe qué hay que hacer.';
  else if (f.titulo.trim().length > TITULO_MAX) e.titulo = `Máximo ${TITULO_MAX} caracteres; el detalle va en la nota.`;
  if (!f.fecha) e.fecha = 'Elige el día.';
  return e;
}

/** «Te falta el día» / «Te falta qué hay que hacer y el día». */
export function loQueFalta(errores: Record<string, string>): string | null {
  const partes: string[] = [];
  if (errores.titulo) partes.push('qué hay que hacer');
  if (errores.fecha) partes.push('el día');
  if (partes.length === 0) return null;
  return `Te falta ${partes.join(' y ')}.`;
}

/** Los pickers de cadence con la altura y el radio de los demás campos del cajón. */
const CAMPO_CLICABLE = 'h-11 w-full rounded-[12px] px-3.5';

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
  const falta = loQueFalta(errores);
  const valido = !falta && !guardando;
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
    <Cajon abierto={abierto} onOpenChange={onOpenChange} data-testid="nueva-tarea-cajon">
      <CajonCabecera
        titulo="Nueva tarea"
        descripcion="Algo que hay que hacer un día: queda en la agenda con su inmueble y su responsable."
      />
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          void guardar();
        }}
        noValidate
      >
        <CajonCuerpo>
          <div className="space-y-5" data-testid="nueva-tarea">
            <Campo
              label="Qué hay que hacer"
              error={form.titulo && errores.titulo}
              contador={`${form.titulo.length}/${TITULO_MAX}`}
            >
              <Textarea
                value={form.titulo}
                onChange={(e) => set('titulo', e.target.value)}
                placeholder="Recoger las llaves del 402 y dejarlas en portería"
                rows={2}
                maxLength={TITULO_MAX}
                data-testid="tarea-titulo"
              />
            </Campo>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)]">
              <Campo label="Día">
                <DatePicker
                  value={fechaLocal(form.fecha)}
                  onChange={(d) => set('fecha', aFechaIso(d))}
                  minDate={hoyLocal()}
                  placeholder="Elige el día"
                  className={CAMPO_CLICABLE}
                />
              </Campo>
              <Campo label="Hora" hint="Opcional">
                <TimePicker
                  value={form.hora || undefined}
                  onChange={(h) => set('hora', h)}
                  step={30}
                  className={CAMPO_CLICABLE}
                />
              </Campo>
            </div>

            <Campo label="Inmueble" hint="Opcional">
              <Combobox
                value={form.consignacionId || undefined}
                onChange={(v) => set('consignacionId', v ?? '')}
                options={inmuebles}
                placeholder="Busca por código, título o dirección"
                searchPlaceholder="Escribe #código, título o dirección"
                contentClassName="z-[400]"
              />
            </Campo>

            <Campo label="Responsable" hint="Opcional">
              <Combobox
                value={form.responsableUserId || undefined}
                onChange={(v) => set('responsableUserId', v ?? '')}
                options={responsables}
                placeholder={responsables.length ? 'Elige a alguien del equipo' : 'Sin agentes con cuenta'}
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
          </div>
        </CajonCuerpo>

        <CajonPie ayuda={falta ? <span data-testid="tarea-falta">{falta}</span> : null}>
          <Button type="button" variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" hideArrow disabled={!valido} isLoading={guardando} data-testid="tarea-guardar">
            Crear tarea
          </Button>
        </CajonPie>
      </form>
    </Cajon>
  );
}

function Campo({
  label,
  hint,
  error,
  contador,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | false;
  contador?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-medium text-fg">{label}</label>
        {contador ? <span className="text-xs tabular-nums text-fg-muted">{contador}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}
